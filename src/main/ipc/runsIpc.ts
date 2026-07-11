import { ipcMain } from 'electron'
import { CANAUX_IPC } from '@shared/ipc'
import type { DependancesIpc } from './types'

export function enregistrerRunsIpc(deps: DependancesIpc): void {
  ipcMain.handle(CANAUX_IPC.runsRecents, (_e, jobId?: number) => deps.runsRepo.runsRecents(jobId))
  ipcMain.handle(CANAUX_IPC.runsJournal, (_e, runId: number) => deps.runsRepo.journalDuRun(runId))

  ipcMain.handle(CANAUX_IPC.runsConfirmerMiroir, async (_e, jobId: number, runId: number) => {
    await deps.backupService.confirmerMiroir(jobId, runId)
  })
}
