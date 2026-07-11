import { ipcMain } from 'electron'
import { CANAUX_IPC } from '@shared/ipc'
import type { NouveauJob } from '@shared/types'
import type { DependancesIpc } from './types'

export function enregistrerJobsIpc(deps: DependancesIpc): void {
  ipcMain.handle(CANAUX_IPC.jobsLister, () => deps.jobsRepo.lister())
  ipcMain.handle(CANAUX_IPC.jobsObtenir, (_e, id: number) => deps.jobsRepo.obtenir(id))
  ipcMain.handle(CANAUX_IPC.jobsCreer, (_e, job: NouveauJob) => deps.jobsRepo.creer(job))
  ipcMain.handle(CANAUX_IPC.jobsMettreAJour, (_e, id: number, job: NouveauJob) => deps.jobsRepo.mettreAJour(id, job))
  ipcMain.handle(CANAUX_IPC.jobsSupprimer, (_e, id: number) => deps.jobsRepo.supprimer(id))

  ipcMain.handle(CANAUX_IPC.jobsExecuter, async (_e, id: number) => {
    const job = deps.jobsRepo.obtenir(id)
    if (!job) throw new Error('Job introuvable')
    const runId = await deps.backupService.executerJob(job)
    return { runId }
  })

  ipcMain.handle(CANAUX_IPC.jobsAnnuler, (_e, id: number) => deps.backupService.annulerJob(id))
  ipcMain.handle(CANAUX_IPC.jobsEstEnCours, (_e, id: number) => deps.backupService.estEnCours(id))
}
