import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateInfo } from 'builder-util-runtime'
import type { EtatMiseAJour } from '@shared/types'

function extraireNotes(info: UpdateInfo): string | null {
  if (typeof info.releaseNotes === 'string') return info.releaseNotes
  if (Array.isArray(info.releaseNotes)) {
    const texte = info.releaseNotes
      .map((n) => n.note ?? '')
      .filter(Boolean)
      .join('\n\n')
    return texte || null
  }
  return null
}

/**
 * Verifie/telecharge/installe les mises a jour publiees comme GitHub Releases du depot
 * (voir `publish` dans electron-builder.yml). Desactive en mode developpement (app non empaquetee) :
 * il n'existe alors pas d'artefact NSIS installe a mettre a jour.
 */
export class GestionnaireMiseAJour {
  private etat: EtatMiseAJour

  constructor(private readonly diffuser: (e: EtatMiseAJour) => void) {
    this.etat = {
      phase: app.isPackaged ? 'inactif' : 'indisponible_dev',
      versionActuelle: app.getVersion(),
      versionDisponible: null,
      notesVersion: null,
      progressionPourcent: null,
      message: null
    }

    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false

    autoUpdater.on('checking-for-update', () => {
      this.definirEtat({ phase: 'verification', message: null })
    })
    autoUpdater.on('update-available', (info) => {
      this.definirEtat({
        phase: 'disponible',
        versionDisponible: info.version,
        notesVersion: extraireNotes(info)
      })
    })
    autoUpdater.on('update-not-available', () => {
      this.definirEtat({ phase: 'a_jour', versionDisponible: null, message: null })
    })
    autoUpdater.on('download-progress', (progression) => {
      this.definirEtat({ phase: 'telechargement', progressionPourcent: Math.round(progression.percent) })
    })
    autoUpdater.on('update-downloaded', () => {
      this.definirEtat({ phase: 'pret', progressionPourcent: 100 })
    })
    autoUpdater.on('error', (erreur) => {
      this.definirEtat({ phase: 'erreur', message: erreur instanceof Error ? erreur.message : String(erreur) })
    })
  }

  private definirEtat(partiel: Partial<EtatMiseAJour>): void {
    this.etat = { ...this.etat, versionActuelle: app.getVersion(), ...partiel }
    this.diffuser(this.etat)
  }

  etatCourant(): EtatMiseAJour {
    return { ...this.etat, versionActuelle: app.getVersion() }
  }

  async verifier(): Promise<EtatMiseAJour> {
    if (!app.isPackaged) {
      this.definirEtat({ phase: 'indisponible_dev', message: "Verification indisponible en mode developpement" })
      return this.etatCourant()
    }
    try {
      await autoUpdater.checkForUpdates()
    } catch (erreur) {
      this.definirEtat({ phase: 'erreur', message: erreur instanceof Error ? erreur.message : String(erreur) })
    }
    return this.etatCourant()
  }

  async telecharger(): Promise<void> {
    if (!app.isPackaged || this.etat.phase !== 'disponible') return
    try {
      await autoUpdater.downloadUpdate()
    } catch (erreur) {
      this.definirEtat({ phase: 'erreur', message: erreur instanceof Error ? erreur.message : String(erreur) })
    }
  }

  installer(): void {
    if (this.etat.phase !== 'pret') return
    autoUpdater.quitAndInstall()
  }
}
