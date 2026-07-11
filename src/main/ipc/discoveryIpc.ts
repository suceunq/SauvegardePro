import { dialog, ipcMain } from 'electron'
import { CANAUX_IPC } from '@shared/ipc'
import { detecterLecteurs } from '../discovery/driveDetector'
import { detecterAppareilsReseau } from '../discovery/nasDiscovery'
import type { DependancesIpc } from './types'

export function enregistrerDiscoveryIpc(deps: DependancesIpc): void {
  ipcMain.handle(CANAUX_IPC.discoveryLecteurs, () => detecterLecteurs())
  ipcMain.handle(CANAUX_IPC.discoveryReseau, () => detecterAppareilsReseau())
  ipcMain.handle(CANAUX_IPC.discoveryEmplacements, () => deps.networkLocationsRepo.lister())
  ipcMain.handle(CANAUX_IPC.discoveryAjouterEmplacement, (_e, nom: string, chemin: string) =>
    deps.networkLocationsRepo.ajouter(nom, chemin)
  )
  ipcMain.handle(CANAUX_IPC.discoverySupprimerEmplacement, (_e, id: number) => deps.networkLocationsRepo.supprimer(id))

  ipcMain.handle(CANAUX_IPC.discoveryChoisirDossier, async () => {
    const fenetre = deps.fenetrePrincipale()
    const resultat = fenetre
      ? await dialog.showOpenDialog(fenetre, { properties: ['openDirectory', 'createDirectory'] })
      : await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
    if (resultat.canceled || resultat.filePaths.length === 0) return null
    return resultat.filePaths[0]
  })
}
