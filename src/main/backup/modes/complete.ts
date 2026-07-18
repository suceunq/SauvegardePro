import { join } from 'node:path'
import type { Job, ProgressionRun, Run } from '@shared/types'
import type { Database } from '../../db/database'
import type { RunsRepo } from '../../db/runsRepo'
import type { ManifestRepo } from '../../db/manifestRepo'
import { scannerSources } from '../fileScanner'
import { cheminNouvelleVersion, horodatageVersion, purgerAnciennesVersions } from '../versionManager'
import { executerCopies, gererErreurRun, construireEntreesManifeste, type ContexteExecution } from '../runOrchestrator'
import { tMain } from '../../i18n'

export async function executerSauvegardeComplete(
  db: Database,
  runsRepo: RunsRepo,
  manifestRepo: ManifestRepo,
  job: Job,
  emettre: (p: ProgressionRun) => void,
  signal: AbortSignal,
  runIdExistant?: number
): Promise<number> {
  let run: Run
  let dossierVersion: string

  if (runIdExistant) {
    const existant = runsRepo.obtenirRun(runIdExistant)
    const horodatage = runsRepo.versionDossierRun(runIdExistant)
    if (!existant || !horodatage) throw new Error(tMain('main.runResumeNotFound'))
    run = existant
    dossierVersion = cheminNouvelleVersion(job.destination, horodatage)
    runsRepo.journaliser(run.id, 'info', tMain('main.completeResume'))
  } else {
    // Le run.id (auto-incremente, garanti unique) est ajoute au nom de version : deux runs demarres
    // dans la meme seconde (voire la meme milliseconde) ne peuvent jamais partager le meme dossier.
    run = runsRepo.creerRun(job.id, null)
    const horodatage = `${horodatageVersion()}-r${run.id}`
    runsRepo.definirVersionDossier(run.id, horodatage)
    dossierVersion = cheminNouvelleVersion(job.destination, horodatage)
    runsRepo.journaliser(run.id, 'info', tMain('main.completeStarted', { version: horodatage }))

    emettre({
      runId: run.id,
      jobId: job.id,
      fichierCourant: null,
      fichiersTraites: 0,
      fichiersTotal: 0,
      octetsTransferes: 0,
      octetsTotal: 0,
      vitesseOctetsParSeconde: 0,
      phase: 'analyse'
    })

    const resultatScan = await scannerSources(job.sources, job.exclusions)
    for (const erreur of resultatScan.erreurs) {
      runsRepo.journaliser(run.id, 'avertissement', tMain('main.scanReadError', { path: erreur.chemin, code: erreur.code }), erreur.chemin)
    }

    runsRepo.planifierFichiers(
      run.id,
      resultatScan.fichiers.map((f) => ({
        cheminSource: f.cheminSource,
        cheminDestination: join(dossierVersion, f.cheminRelatif),
        taille: f.taille,
        mtime: f.mtime
      }))
    )
  }

  try {
    const ctx: ContexteExecution = { db, runsRepo, job, run, emettre, signal }
    await executerCopies(ctx)

    const echecs = runsRepo.fichiersParEtat(run.id, 'failed').length
    if (runsRepo.scanIncomplet(run.id)) {
      const message = tMain('main.scanIncomplete')
      runsRepo.changerStatut(run.id, 'echec', message)
      runsRepo.journaliser(run.id, 'erreur', message)
    } else {
      manifestRepo.enregistrer(job.id, run.id, construireEntreesManifeste(runsRepo.fichiersDuRun(run.id), dossierVersion))
      runsRepo.changerStatut(run.id, 'termine', echecs > 0 ? tMain('main.filesInError', { count: echecs }) : null)
      runsRepo.journaliser(run.id, 'info', tMain('main.completeFinished'))
      await purgerAnciennesVersions(job.id, job.destination, runsRepo, job.parametres.nombreVersionsAConserver)
    }
  } catch (erreur) {
    await gererErreurRun(runsRepo, run.id, erreur)
  } finally {
    await db.flush()
  }

  return run.id
}
