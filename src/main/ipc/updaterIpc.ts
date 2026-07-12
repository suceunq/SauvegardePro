import { ipcMain } from 'electron'
import { CANAUX_IPC } from '@shared/ipc'
import type { DependancesIpc } from './types'

export function enregistrerUpdaterIpc(deps: DependancesIpc): void {
  ipcMain.handle(CANAUX_IPC.misesAJourEtat, () => deps.gestionnaireMiseAJour.etatCourant())
  ipcMain.handle(CANAUX_IPC.misesAJourVerifier, () => deps.gestionnaireMiseAJour.verifier())
  ipcMain.handle(CANAUX_IPC.misesAJourTelecharger, () => deps.gestionnaireMiseAJour.telecharger())
  ipcMain.handle(CANAUX_IPC.misesAJourInstaller, () => deps.gestionnaireMiseAJour.installer())
}
