import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateInfo } from 'builder-util-runtime'
import type { EtatMiseAJour } from '@shared/types'
import { tMain } from './i18n'

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
      octetsParSeconde: null,
      secondesRestantes: null,
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
      const vitesse = progression.bytesPerSecond || 0
      const restant = vitesse > 0 ? Math.max(0, Math.round((progression.total - progression.transferred) / vitesse)) : null
      this.definirEtat({ phase: 'telechargement', progressionPourcent: Math.round(progression.percent), octetsParSeconde: vitesse, secondesRestantes: restant })
    })
    autoUpdater.on('update-downloaded', () => {
      this.definirEtat({ phase: 'pret', progressionPourcent: 100 })
    })
    autoUpdater.on('error', () => {
      this.definirEtat({ phase: 'erreur', message: tMain('main.updateError') })
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
      this.definirEtat({ phase: 'indisponible_dev', message: tMain('main.updateDev') })
      return this.etatCourant()
    }
    try {
      await autoUpdater.checkForUpdates()
    } catch {
      this.definirEtat({ phase: 'erreur', message: tMain('main.updateError') })
    }
    return this.etatCourant()
  }

  async telecharger(): Promise<void> {
    if (!app.isPackaged || this.etat.phase !== 'disponible') return
    try {
      await autoUpdater.downloadUpdate()
    } catch {
      this.definirEtat({ phase: 'erreur', message: tMain('main.updateError') })
    }
  }

  installer(): void {
    if (this.etat.phase !== 'pret') return
    autoUpdater.quitAndInstall()
  }
}
