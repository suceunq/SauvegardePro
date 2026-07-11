import type { DemandeConfirmationMiroir, Job, ProgressionRun } from '@shared/types'
import type { Database } from '../db/database'
import type { JobsRepo } from '../db/jobsRepo'
import type { RunsRepo } from '../db/runsRepo'
import type { ManifestRepo } from '../db/manifestRepo'
import type { SettingsRepo } from '../db/settingsRepo'
import { executerSauvegardeComplete } from '../backup/modes/complete'
import { executerSauvegardeIncrementielle } from '../backup/modes/incremental'
import { executerSynchronisationMiroir, confirmerSuppressionsMiroir } from '../backup/modes/mirror'
import { notifierSucces, notifierEchec, notifierAvertissement } from '../notifications'

export class BackupService {
  private readonly enCours = new Map<number, AbortController>()

  constructor(
    private readonly db: Database,
    private readonly jobsRepo: JobsRepo,
    private readonly runsRepo: RunsRepo,
    private readonly manifestRepo: ManifestRepo,
    private readonly settingsRepo: SettingsRepo,
    private readonly emettreProgression: (p: ProgressionRun) => void,
    private readonly emettreDemandeConfirmation: (d: DemandeConfirmationMiroir) => void
  ) {}

  estEnCours(jobId: number): boolean {
    return this.enCours.has(jobId)
  }

  annulerJob(jobId: number): boolean {
    const controller = this.enCours.get(jobId)
    if (!controller) return false
    controller.abort()
    return true
  }

  async executerJob(job: Job): Promise<number | null> {
    if (this.enCours.has(job.id)) return null
    const controller = new AbortController()
    this.enCours.set(job.id, controller)

    let runId: number | null = null

    try {
      if (job.mode === 'complete') {
        runId = await executerSauvegardeComplete(this.db, this.runsRepo, this.manifestRepo, job, this.emettreProgression, controller.signal)
      } else if (job.mode === 'incrementielle') {
        runId = await executerSauvegardeIncrementielle(
          this.db,
          this.runsRepo,
          this.manifestRepo,
          job,
          this.emettreProgression,
          controller.signal
        )
      } else {
        const resultat = await executerSynchronisationMiroir(
          this.db,
          this.runsRepo,
          this.jobsRepo,
          job,
          this.emettreProgression,
          controller.signal
        )
        runId = resultat.runId
        if (resultat.demandeConfirmation) this.emettreDemandeConfirmation(resultat.demandeConfirmation)
      }
    } finally {
      this.enCours.delete(job.id)
    }

    if (runId) this.notifierResultat(job, runId)
    return runId
  }

  /** Reprend un run laisse a l'etat 'interrompu' par un arret brutal precedent. */
  async reprendreRun(job: Job, runId: number): Promise<number | null> {
    if (this.enCours.has(job.id)) return null
    const controller = new AbortController()
    this.enCours.set(job.id, controller)
    let idFinal: number | null = null

    try {
      if (job.mode === 'complete') {
        idFinal = await executerSauvegardeComplete(
          this.db,
          this.runsRepo,
          this.manifestRepo,
          job,
          this.emettreProgression,
          controller.signal,
          runId
        )
      } else if (job.mode === 'incrementielle') {
        idFinal = await executerSauvegardeIncrementielle(
          this.db,
          this.runsRepo,
          this.manifestRepo,
          job,
          this.emettreProgression,
          controller.signal,
          runId
        )
      } else {
        const resultat = await executerSynchronisationMiroir(
          this.db,
          this.runsRepo,
          this.jobsRepo,
          job,
          this.emettreProgression,
          controller.signal,
          runId
        )
        idFinal = resultat.runId
        if (resultat.demandeConfirmation) this.emettreDemandeConfirmation(resultat.demandeConfirmation)
      }
    } finally {
      this.enCours.delete(job.id)
    }

    if (idFinal) this.notifierResultat(job, idFinal)
    return idFinal
  }

  async confirmerMiroir(jobId: number, runId: number): Promise<void> {
    const job = this.jobsRepo.obtenir(jobId)
    if (!job) throw new Error('Job introuvable')

    const controller = new AbortController()
    this.enCours.set(jobId, controller)

    try {
      await confirmerSuppressionsMiroir(this.db, this.runsRepo, job, runId, this.emettreProgression, controller.signal)
    } finally {
      this.enCours.delete(jobId)
    }

    this.notifierResultat(job, runId)
  }

  private notifierResultat(job: Job, runId: number): void {
    const run = this.runsRepo.obtenirRun(runId)
    if (!run) return
    const parametres = this.settingsRepo.obtenir().notifications

    if (run.statut === 'termine') {
      if (run.message) notifierAvertissement(parametres, job.nom, run.message)
      else notifierSucces(parametres, job.nom)
    } else if (run.statut === 'echec' || run.statut === 'interrompu') {
      notifierEchec(parametres, job.nom, run.message ?? 'Voir le journal pour plus de details')
    }
  }
}
