import { join } from 'node:path'
import type { Job, ProgressionRun, Run } from '@shared/types'
import type { Database } from '../../db/database'
import type { RunsRepo } from '../../db/runsRepo'
import type { ManifestRepo } from '../../db/manifestRepo'
import { scannerSources } from '../fileScanner'
import {
  cheminNouvelleVersion,
  horodatageVersion,
  planifierIncrementiel,
  creerHardlink,
  purgerAnciennesVersions
} from '../versionManager'
import { executerCopies, gererErreurRun, construireEntreesManifeste, type ContexteExecution } from '../runOrchestrator'
import { tMain } from '../../i18n'

export async function executerSauvegardeIncrementielle(
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
    runsRepo.journaliser(run.id, 'info', tMain('main.incrementalResume'))
  } else {
    // Le run.id (auto-incremente, garanti unique) est ajoute au nom de version : deux runs demarres
    // dans la meme seconde (voire la meme milliseconde) ne peuvent jamais partager le meme dossier.
    run = runsRepo.creerRun(job.id, null)
    const horodatage = `${horodatageVersion()}-r${run.id}`
    runsRepo.definirVersionDossier(run.id, horodatage)
    dossierVersion = cheminNouvelleVersion(job.destination, horodatage)
    runsRepo.journaliser(run.id, 'info', tMain('main.incrementalStarted', { version: horodatage }))

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

    const runPrecedent = runsRepo.dernierRunTermine(job.id)
    const horodatageAncien = runPrecedent ? runsRepo.versionDossierRun(runPrecedent.id) : null
    const dossierVersionAncien = horodatageAncien ? cheminNouvelleVersion(job.destination, horodatageAncien) : null
    const manifesteAncien = manifestRepo.dernierManifeste(job.id)

    const plan = planifierIncrementiel(resultatScan.fichiers, manifesteAncien, dossierVersionAncien)

    // Plan-puis-execute : TOUS les fichiers (a lier ou a copier) recoivent d'abord une ligne 'pending'.
    // Si l'app crashe pendant les tentatives de hardlink ci-dessous, chaque fichier a deja une ligne
    // exploitable par la reprise (qui le copiera normalement, sans optimisation mais sans jamais l'oublier).
    runsRepo.planifierFichiers(
      run.id,
      [...plan.aCopier, ...plan.aLier.map((l) => l.fichier)].map((f) => ({
        cheminSource: f.cheminSource,
        cheminDestination: join(dossierVersion, f.cheminRelatif),
        taille: f.taille,
        mtime: f.mtime
      }))
    )

    let hardlinksReussis = 0
    for (const { fichier, cheminExistant } of plan.aLier) {
      const destination = join(dossierVersion, fichier.cheminRelatif)
      try {
        await creerHardlink(cheminExistant, destination)
        runsRepo.marquerEtatFichier(run.id, fichier.cheminSource, 'done', {
          hashSource: manifesteAncien.get(fichier.cheminRelatif)?.hash ?? null
        })
        runsRepo.incrementerCompteurs(run.id, { fichiersIgnores: 1 })
        hardlinksReussis++
      } catch (erreur) {
        // le fichier reste 'pending' : la boucle de copie normale s'en chargera comme fallback
        const err = erreur as NodeJS.ErrnoException
        runsRepo.journaliser(
          run.id,
          'avertissement',
          tMain('main.linkFailed', { path: fichier.cheminRelatif, error: err.code ?? err.message }),
          fichier.cheminSource
        )
      }
    }

    runsRepo.journaliser(
      run.id,
      'info',
      tMain('main.analysisFinished', { linked: hardlinksReussis, copy: plan.aCopier.length + (plan.aLier.length - hardlinksReussis) })
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
      runsRepo.journaliser(run.id, 'info', tMain('main.incrementalFinished'))
      await purgerAnciennesVersions(job.id, job.destination, runsRepo, job.parametres.nombreVersionsAConserver)
    }
  } catch (erreur) {
    await gererErreurRun(runsRepo, run.id, erreur)
  } finally {
    await db.flush()
  }

  return run.id
}
