import { join } from 'node:path'
import type { Job, ProgressionRun, DemandeConfirmationMiroir } from '@shared/types'
import type { Database } from '../../db/database'
import type { RunsRepo } from '../../db/runsRepo'
import type { JobsRepo } from '../../db/jobsRepo'
import { scannerSources, scannerArborescence } from '../fileScanner'
import {
  sourcesAccessibles,
  volumesInchanges,
  capturerVolumesActuels,
  evaluerSuppressionsMiroir
} from '../mirrorSafetyGate'
import {
  executerCopies,
  executerSuppressionsPlanifiees,
  nettoyerDossiersVides,
  gererErreurRun,
  type ContexteExecution
} from '../runOrchestrator'

export interface ResultatMiroir {
  runId: number
  demandeConfirmation: DemandeConfirmationMiroir | null
}

/**
 * Ordre important pour la surete de la reprise : le disjoncteur de suppression est evalue et,
 * s'il bloque, le run passe en 'confirmation_requise' AVANT toute copie. Ainsi, des qu'un run
 * atteint reellement la phase de copie, ses suppressions ont deja ete validees -- une reprise
 * apres crash peut donc executer les suppressions en file sans reevaluer le seuil de securite.
 */
export async function executerSynchronisationMiroir(
  db: Database,
  runsRepo: RunsRepo,
  jobsRepo: JobsRepo,
  job: Job,
  emettre: (p: ProgressionRun) => void,
  signal: AbortSignal,
  runIdExistant?: number
): Promise<ResultatMiroir> {
  if (runIdExistant) {
    return reprendreMiroir(db, runsRepo, job, runIdExistant, emettre, signal)
  }

  const run = runsRepo.creerRun(job.id, null)
  runsRepo.journaliser(run.id, 'info', 'Synchronisation miroir demarree')

  try {
    const volumesEnregistres = jobsRepo.obtenirVolumesEnregistres(job.id)
    const accessible = (await sourcesAccessibles(job.sources)) && (await volumesInchanges(job.sources, volumesEnregistres))

    if (!accessible) {
      const message = 'Source injoignable ou volume different de celui enregistre : execution annulee par securite'
      runsRepo.changerStatut(run.id, 'echec', message)
      runsRepo.journaliser(run.id, 'erreur', message)
      return { runId: run.id, demandeConfirmation: null }
    }

    emettre(progressionAnalyse(run.id, job.id))

    const [scanSource, scanDest] = await Promise.all([
      scannerSources(job.sources, job.exclusions),
      scannerArborescence(job.destination, job.exclusions, '')
    ])

    for (const erreur of [...scanSource.erreurs, ...scanDest.erreurs]) {
      runsRepo.journaliser(run.id, 'avertissement', `Impossible de lire ${erreur.chemin} (${erreur.code})`, erreur.chemin)
    }

    const destInfoParChemin = new Map(scanDest.fichiers.map((f) => [f.cheminRelatif, f]))
    const cheminsSource = new Set(scanSource.fichiers.map((f) => f.cheminRelatif))

    const aCopier = scanSource.fichiers.filter((f) => {
      const existant = destInfoParChemin.get(f.cheminRelatif)
      return !existant || existant.taille !== f.taille || existant.mtime !== f.mtime
    })

    const suppressionsCandidates = scanDest.fichiers
      .filter((f) => !cheminsSource.has(f.cheminRelatif))
      .map((f) => join(job.destination, f.cheminRelatif))

    runsRepo.planifierFichiers(
      run.id,
      aCopier.map((f) => ({
        cheminSource: f.cheminSource,
        cheminDestination: join(job.destination, f.cheminRelatif),
        taille: f.taille,
        mtime: f.mtime
      }))
    )

    const sousArbresIncomplets = new Set([...scanSource.sousArbresIncomplets, ...scanDest.sousArbresIncomplets])
    const gardeFou = evaluerSuppressionsMiroir(
      run.id,
      job.id,
      suppressionsCandidates,
      sousArbresIncomplets,
      scanDest.fichiers.length,
      job.parametres
    )
    runsRepo.planifierSuppressions(run.id, gardeFou.suppressionsFiltrees)

    if (Object.keys(volumesEnregistres).length === 0) {
      jobsRepo.enregistrerVolumes(job.id, await capturerVolumesActuels(job.sources))
    }

    if (!gardeFou.autorise && gardeFou.demandeConfirmation) {
      runsRepo.changerStatut(run.id, 'confirmation_requise', 'En attente de confirmation avant suppression')
      runsRepo.journaliser(
        run.id,
        'avertissement',
        `${gardeFou.demandeConfirmation.suppressionsPrevues} suppression(s) depassent le seuil de securite : confirmation requise`
      )
      return { runId: run.id, demandeConfirmation: gardeFou.demandeConfirmation }
    }

    const ctx: ContexteExecution = { db, runsRepo, job, run, emettre, signal }
    await executerCopies(ctx)
    await executerSuppressionsPlanifiees(ctx)
    await nettoyerDossiersVides(job.destination)

    const echecs = runsRepo.fichiersParEtat(run.id, 'failed').length
    runsRepo.changerStatut(run.id, 'termine', echecs > 0 ? `${echecs} fichier(s) en erreur` : null)
    runsRepo.journaliser(run.id, 'info', 'Synchronisation miroir terminee')

    return { runId: run.id, demandeConfirmation: null }
  } catch (erreur) {
    await gererErreurRun(runsRepo, run.id, erreur)
    return { runId: run.id, demandeConfirmation: null }
  } finally {
    await db.flush()
  }
}

async function reprendreMiroir(
  db: Database,
  runsRepo: RunsRepo,
  job: Job,
  runId: number,
  emettre: (p: ProgressionRun) => void,
  signal: AbortSignal
): Promise<ResultatMiroir> {
  const run = runsRepo.obtenirRun(runId)
  if (!run) throw new Error('Run a reprendre introuvable')

  runsRepo.journaliser(run.id, 'info', 'Reprise de la synchronisation miroir apres interruption')
  const ctx: ContexteExecution = { db, runsRepo, job, run, emettre, signal }

  try {
    await executerCopies(ctx)
    await executerSuppressionsPlanifiees(ctx)
    await nettoyerDossiersVides(job.destination)

    const echecs = runsRepo.fichiersParEtat(run.id, 'failed').length
    runsRepo.changerStatut(run.id, 'termine', echecs > 0 ? `${echecs} fichier(s) en erreur` : null)
    runsRepo.journaliser(run.id, 'info', 'Synchronisation miroir terminee (apres reprise)')
    return { runId: run.id, demandeConfirmation: null }
  } catch (erreur) {
    await gererErreurRun(runsRepo, run.id, erreur)
    return { runId: run.id, demandeConfirmation: null }
  } finally {
    await db.flush()
  }
}

function progressionAnalyse(runId: number, jobId: number): ProgressionRun {
  return {
    runId,
    jobId,
    fichierCourant: null,
    fichiersTraites: 0,
    fichiersTotal: 0,
    octetsTransferes: 0,
    octetsTotal: 0,
    vitesseOctetsParSeconde: 0,
    phase: 'analyse'
  }
}

/** Reprend un run miroir reste en 'confirmation_requise' apres validation explicite de l'utilisateur. */
export async function confirmerSuppressionsMiroir(
  db: Database,
  runsRepo: RunsRepo,
  job: Job,
  runId: number,
  emettre: (p: ProgressionRun) => void,
  signal: AbortSignal
): Promise<void> {
  const run = runsRepo.obtenirRun(runId)
  if (!run || run.statut !== 'confirmation_requise') {
    throw new Error('Ce run ne necessite plus de confirmation')
  }
  if (run.jobId !== job.id) throw new Error('Le run ne correspond pas a ce job')

  runsRepo.changerStatut(run.id, 'en_cours')
  const ctx: ContexteExecution = { db, runsRepo, job, run, emettre, signal }

  try {
    await executerCopies(ctx)
    await executerSuppressionsPlanifiees(ctx)
    await nettoyerDossiersVides(job.destination)
    const echecs = runsRepo.fichiersParEtat(run.id, 'failed').length
    runsRepo.changerStatut(run.id, 'termine', echecs > 0 ? `${echecs} fichier(s) en erreur` : null)
    runsRepo.journaliser(run.id, 'info', 'Suppressions confirmees et appliquees')
  } catch (erreur) {
    await gererErreurRun(runsRepo, run.id, erreur)
  } finally {
    await db.flush()
  }
}
