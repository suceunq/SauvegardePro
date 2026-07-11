import type { Job, Planification } from '@shared/types'

/** Verifie, a l'instant present, si une planification "planifie" doit se declencher. */
export function estDue(planification: Planification, derniereExecutionLe: number | null): boolean {
  if (planification.type !== 'planifie' || !planification.frequence) return false

  if (planification.frequence === 'intervalle') {
    const intervalleMs = Math.max(1, planification.intervalleMinutes ?? 60) * 60_000
    return !derniereExecutionLe || Date.now() - derniereExecutionLe >= intervalleMs
  }

  const maintenant = new Date()
  const [heureCible, minuteCible] = (planification.heure ?? '00:00').split(':').map((v) => Number(v) || 0)

  const cibleAujourdhui = new Date(maintenant)
  cibleAujourdhui.setHours(heureCible, minuteCible, 0, 0)
  if (maintenant.getTime() < cibleAujourdhui.getTime()) return false

  if (derniereExecutionLe && derniereExecutionLe >= cibleAujourdhui.getTime()) return false

  if (planification.frequence === 'hebdomadaire') {
    const jours = planification.joursSemaine ?? [1]
    return jours.includes(maintenant.getDay())
  }

  return true
}

export function jobsADemarrage(jobs: Job[]): Job[] {
  return jobs.filter((j) => j.actif && j.planification.type === 'demarrage')
}

export class Planificateur {
  private minuteur: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly obtenirJobsActifs: () => Job[],
    private readonly demarreLeDernierRunTermine: (jobId: number) => number | null,
    private readonly executerJob: (job: Job) => void,
    private readonly intervalleVerificationMs = 60_000
  ) {}

  demarrer(): void {
    this.verifier()
    this.minuteur = setInterval(() => this.verifier(), this.intervalleVerificationMs)
  }

  arreter(): void {
    if (this.minuteur) clearInterval(this.minuteur)
    this.minuteur = null
  }

  private verifier(): void {
    for (const job of this.obtenirJobsActifs()) {
      if (!job.actif) continue
      if (estDue(job.planification, this.demarreLeDernierRunTermine(job.id))) {
        this.executerJob(job)
      }
    }
  }
}
