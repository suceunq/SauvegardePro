import { ipcMain } from 'electron'
import { CANAUX_IPC } from '@shared/ipc'
import type { Parametres } from '@shared/types'
import type { DependancesIpc } from './types'
import { validerParametres } from './validation'

export function enregistrerSettingsIpc(deps: DependancesIpc): void {
  ipcMain.handle(CANAUX_IPC.settingsObtenir, () => deps.settingsRepo.obtenir())
  ipcMain.handle(CANAUX_IPC.settingsEnregistrer, (_e, parametres: Parametres) => {
    validerParametres(parametres)
    return deps.settingsRepo.enregistrer(parametres)
  })
}
