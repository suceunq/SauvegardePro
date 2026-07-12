import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { Database } from '../db/database'
import { JobsRepo } from '../db/jobsRepo'
import { RunsRepo } from '../db/runsRepo'
import { ManifestRepo } from '../db/manifestRepo'
import { SettingsRepo } from '../db/settingsRepo'
import { NetworkLocationsRepo } from '../db/networkLocationsRepo'
import { BackupService } from './backupService'
import { detecterRunsInterrompus, preparerReprise } from '../backup/resumeManager'
import { SurveillantLecteurs } from '../discovery/driveDetector'
import { Planificateur, jobsADemarrage } from '../scheduler/scheduler'
import { enregistrerTousLesIpc } from '../ipc'
import { GestionnaireMiseAJour } from '../updater'
import { CANAUX_IPC } from '@shared/ipc'
import type { DemandeConfirmationMiroir, EtatMiseAJour, ProgressionRun } from '@shared/types'

export interface ApplicationDemarree {
  arreter(): Promise<void>
}

function diffuserATouteFenetre(canal: string, donnees: unknown): void {
  for (const fenetre of BrowserWindow.getAllWindows()) {
    if (!fenetre.isDestroyed()) fenetre.webContents.send(canal, donnees)
  }
}

export async function demarrerApplication(): Promise<ApplicationDemarree> {
  const dbPath = join(app.getPath('userData'), 'sauvegardepro.db')
  const db = await Database.ouvrir(dbPath)

  const jobsRepo = new JobsRepo(db)
  const runsRepo = new RunsRepo(db)
  const manifestRepo = new ManifestRepo(db)
  const settingsRepo = new SettingsRepo(db)
  const networkLocationsRepo = new NetworkLocationsRepo(db)

  const emettreProgression = (p: ProgressionRun): void => diffuserATouteFenetre(CANAUX_IPC.evenementProgression, p)
  const emettreConfirmation = (d: DemandeConfirmationMiroir): void =>
    diffuserATouteFenetre(CANAUX_IPC.evenementConfirmationMiroir, d)
  const emettreMiseAJour = (e: EtatMiseAJour): void => diffuserATouteFenetre(CANAUX_IPC.evenementMiseAJour, e)

  const backupService = new BackupService(db, jobsRepo, runsRepo, manifestRepo, settingsRepo, emettreProgression, emettreConfirmation)
  const gestionnaireMiseAJour = new GestionnaireMiseAJour(emettreMiseAJour)

  enregistrerTousLesIpc({
    jobsRepo,
    runsRepo,
    settingsRepo,
    networkLocationsRepo,
    backupService,
    gestionnaireMiseAJour,
    fenetrePrincipale: () => BrowserWindow.getAllWindows()[0] ?? null
  })

  // Reprise des runs restes "en_cours" suite a un arret brutal precedent.
  const interrompus = detecterRunsInterrompus(runsRepo)
  for (const run of interrompus) {
    const job = jobsRepo.obtenir(run.jobId)
    if (!job || !job.actif) continue
    await preparerReprise(runsRepo, run.id)
    void backupService.reprendreRun(job, run.id)
  }

  // Sauvegardes declenchees "au demarrage".
  for (const job of jobsADemarrage(jobsRepo.lister())) {
    void backupService.executerJob(job)
  }

  const surveillantLecteurs = new SurveillantLecteurs((lecteurs) =>
    diffuserATouteFenetre(CANAUX_IPC.evenementLecteurs, lecteurs)
  )
  surveillantLecteurs.demarrer()

  const planificateur = new Planificateur(
    () => jobsRepo.lister(),
    (jobId) => runsRepo.dernierRunTermine(jobId)?.demarreLe ?? null,
    (job) => void backupService.executerJob(job)
  )
  planificateur.demarrer()

  // Verification silencieuse au demarrage : signale une mise a jour disponible sans rien telecharger.
  void gestionnaireMiseAJour.verifier()

  return {
    async arreter(): Promise<void> {
      planificateur.arreter()
      surveillantLecteurs.arreter()
      await db.fermer()
    }
  }
}
