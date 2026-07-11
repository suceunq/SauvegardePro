import { contextBridge, ipcRenderer } from 'electron'
import { CANAUX_IPC, type SauvegardeProAPI } from '@shared/ipc'
import type { DemandeConfirmationMiroir, LecteurDetecte, ProgressionRun } from '@shared/types'

const api: SauvegardeProAPI = {
  jobs: {
    lister: () => ipcRenderer.invoke(CANAUX_IPC.jobsLister),
    obtenir: (id) => ipcRenderer.invoke(CANAUX_IPC.jobsObtenir, id),
    creer: (job) => ipcRenderer.invoke(CANAUX_IPC.jobsCreer, job),
    mettreAJour: (id, job) => ipcRenderer.invoke(CANAUX_IPC.jobsMettreAJour, id, job),
    supprimer: (id) => ipcRenderer.invoke(CANAUX_IPC.jobsSupprimer, id),
    executer: (id) => ipcRenderer.invoke(CANAUX_IPC.jobsExecuter, id),
    annuler: (id) => ipcRenderer.invoke(CANAUX_IPC.jobsAnnuler, id),
    estEnCours: (id) => ipcRenderer.invoke(CANAUX_IPC.jobsEstEnCours, id)
  },
  runs: {
    recents: (jobId) => ipcRenderer.invoke(CANAUX_IPC.runsRecents, jobId),
    journal: (runId) => ipcRenderer.invoke(CANAUX_IPC.runsJournal, runId),
    confirmerMiroir: (jobId, runId) => ipcRenderer.invoke(CANAUX_IPC.runsConfirmerMiroir, jobId, runId)
  },
  discovery: {
    lecteurs: () => ipcRenderer.invoke(CANAUX_IPC.discoveryLecteurs),
    reseau: () => ipcRenderer.invoke(CANAUX_IPC.discoveryReseau),
    emplacementsReseau: () => ipcRenderer.invoke(CANAUX_IPC.discoveryEmplacements),
    ajouterEmplacementReseau: (nom, chemin) => ipcRenderer.invoke(CANAUX_IPC.discoveryAjouterEmplacement, nom, chemin),
    supprimerEmplacementReseau: (id) => ipcRenderer.invoke(CANAUX_IPC.discoverySupprimerEmplacement, id),
    choisirDossier: () => ipcRenderer.invoke(CANAUX_IPC.discoveryChoisirDossier)
  },
  settings: {
    obtenir: () => ipcRenderer.invoke(CANAUX_IPC.settingsObtenir),
    enregistrer: (parametres) => ipcRenderer.invoke(CANAUX_IPC.settingsEnregistrer, parametres)
  },
  evenements: {
    surProgression: (cb: (p: ProgressionRun) => void) => {
      const ecouteur = (_event: Electron.IpcRendererEvent, p: ProgressionRun): void => cb(p)
      ipcRenderer.on(CANAUX_IPC.evenementProgression, ecouteur)
      return () => ipcRenderer.removeListener(CANAUX_IPC.evenementProgression, ecouteur)
    },
    surLecteursChanges: (cb: (lecteurs: LecteurDetecte[]) => void) => {
      const ecouteur = (_event: Electron.IpcRendererEvent, lecteurs: LecteurDetecte[]): void => cb(lecteurs)
      ipcRenderer.on(CANAUX_IPC.evenementLecteurs, ecouteur)
      return () => ipcRenderer.removeListener(CANAUX_IPC.evenementLecteurs, ecouteur)
    },
    surDemandeConfirmationMiroir: (cb: (d: DemandeConfirmationMiroir) => void) => {
      const ecouteur = (_event: Electron.IpcRendererEvent, d: DemandeConfirmationMiroir): void => cb(d)
      ipcRenderer.on(CANAUX_IPC.evenementConfirmationMiroir, ecouteur)
      return () => ipcRenderer.removeListener(CANAUX_IPC.evenementConfirmationMiroir, ecouteur)
    }
  }
}

contextBridge.exposeInMainWorld('sauvegardePro', api)
