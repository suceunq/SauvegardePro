import { ipcMain } from 'electron'
import { CANAUX_IPC } from '@shared/ipc'
import type { DependancesIpc } from './types'
import { restaurerFichiers } from '../backup/restoreService'

export function enregistrerRunsIpc(deps: DependancesIpc): void {
  ipcMain.handle(CANAUX_IPC.runsRecents, (_e, jobId?: number) => deps.runsRepo.runsRecents(jobId))
  ipcMain.handle(CANAUX_IPC.runsJournal, (_e, runId: number) => deps.runsRepo.journalDuRun(runId))
  ipcMain.handle(CANAUX_IPC.runsFichiers, (_e, runId: number) => deps.runsRepo.fichiersDuRun(runId))
  ipcMain.handle(CANAUX_IPC.runsRestaurer, async (_e, runId: number, destination: string, cheminsSource?: string[]) => {
    const tous = deps.runsRepo.fichiersDuRun(runId)
    const selection = cheminsSource?.length ? tous.filter((f) => cheminsSource.includes(f.cheminSource)) : tous
    const resultat = await restaurerFichiers(selection, destination)
    deps.runsRepo.journaliser(runId, resultat.erreurs.length ? 'avertissement' : 'info', `Restauration : ${resultat.fichiersRestaures} fichier(s), ${resultat.erreurs.length} erreur(s)`)
    return resultat
  })

  ipcMain.handle(CANAUX_IPC.runsConfirmerMiroir, async (_e, jobId: number, runId: number) => {
    await deps.backupService.confirmerMiroir(jobId, runId)
  })
}
