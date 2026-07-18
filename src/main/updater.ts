import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { UpdateInfo } from 'builder-util-runtime'
import type { EtatMiseAJour, NotesRedemarrage } from '@shared/types'
import { tMain } from './i18n'

const INTERVALLE_VERIFICATION_MS = 60 * 60 * 1000
const DELAI_VERIFICATION_INITIALE_MS = 10_000
const DELAI_NOUVELLE_TENTATIVE_ERREUR_MS = 15 * 60 * 1000
const DELAI_AVANT_INSTALLATION_MS = 1_500
const DELAI_NOUVEL_ESSAI_SI_OCCUPE_MS = 60_000

interface Transaction {
  versionOrigine: string
  version: string
  notes: string | null
  statut: 'installation' | 'installee' | 'annulee'
  horodatage: string
}

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

function dossierMisesAJour(): string {
  return join(app.getPath('userData'), 'updates')
}

function cheminTransaction(): string {
  return join(dossierMisesAJour(), 'transaction.json')
}

function cheminJournal(): string {
  return join(dossierMisesAJour(), 'updater.log')
}

/**
 * Verifie/telecharge/installe automatiquement les mises a jour publiees comme GitHub Releases du depot
 * (voir `publish` dans electron-builder.yml). Aucune confirmation n'est demandee : le telechargement,
 * la verification d'integrite (checksum electron-updater) et l'installation silencieuse s'enchainent seuls,
 * puis l'application redemarre. Desactive en mode developpement (app non empaquetee) : il n'existe alors pas
 * d'artefact NSIS installe a mettre a jour.
 */
export class GestionnaireMiseAJour {
  private etat: EtatMiseAJour
  private verificationEnCours = false
  private notesRedemarrage: NotesRedemarrage | null = null

  constructor(
    private readonly diffuser: (e: EtatMiseAJour) => void,
    private readonly unJobEstEnCours: () => boolean = () => false
  ) {
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

    if (!app.isPackaged) return

    autoUpdater.logger = {
      info: (m: unknown) => void this.journaliser('INFO', m),
      warn: (m: unknown) => void this.journaliser('WARN', m),
      error: (m: unknown) => void this.journaliser('ERROR', m),
      debug: () => {}
    }
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('checking-for-update', () => {
      this.definirEtat({ phase: 'verification', message: null })
    })
    autoUpdater.on('update-available', (info) => {
      void this.journaliser('INFO', `Version ${info.version} disponible ; telechargement automatique`)
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
    autoUpdater.on('error', (erreur) => {
      void this.journaliser('ERROR', erreur)
      this.definirEtat({ phase: 'erreur', message: tMain('main.updateError') })
      this.planifierNouvelleVerification(DELAI_NOUVELLE_TENTATIVE_ERREUR_MS)
    })
    autoUpdater.on('update-downloaded', (info) => {
      void this.gererTelechargementTermine(info)
    })

    void this.recupererTransaction()
    this.planifierNouvelleVerification(DELAI_VERIFICATION_INITIALE_MS)
    setInterval(() => void this.verifier(), INTERVALLE_VERIFICATION_MS).unref()
  }

  private planifierNouvelleVerification(delaiMs: number): void {
    setTimeout(() => void this.verifier(), delaiMs).unref()
  }

  private async journaliser(niveau: string, message: unknown): Promise<void> {
    try {
      await mkdir(dossierMisesAJour(), { recursive: true })
      await appendFile(cheminJournal(), `${new Date().toISOString()} [${niveau}] ${String(message)}\n`, 'utf8')
    } catch {
      // journal non bloquant : une erreur d'ecriture ne doit jamais interrompre la mise a jour
    }
  }

  private async ecrireTransaction(transaction: Transaction): Promise<void> {
    await mkdir(dossierMisesAJour(), { recursive: true })
    await writeFile(cheminTransaction(), JSON.stringify(transaction, null, 2), 'utf8')
  }

  /**
   * Au demarrage, verifie si une installation silencieuse a ete tentee au redemarrage precedent.
   * Si la version courante correspond a la version installee, la mise a jour a reussi : les notes
   * de version sont conservees pour affichage unique. Sinon, l'installation n'a pas ete appliquee
   * (echec / retour a l'ancienne version) : on le journalise sans bloquer le demarrage.
   */
  private async recupererTransaction(): Promise<void> {
    try {
      const brut = await readFile(cheminTransaction(), 'utf8')
      const transaction = JSON.parse(brut) as Transaction
      if (transaction.statut !== 'installation') return
      if (transaction.version === app.getVersion()) {
        this.notesRedemarrage = { version: transaction.version, notes: transaction.notes }
        await this.ecrireTransaction({ ...transaction, statut: 'installee' })
        await this.journaliser('INFO', `Mise a jour ${transaction.versionOrigine} -> ${transaction.version} appliquee avec succes`)
      } else {
        await this.ecrireTransaction({ ...transaction, statut: 'annulee' })
        await this.journaliser(
          'WARN',
          `Installation de ${transaction.version} non appliquee ; version ${app.getVersion()} conservee (retour arriere)`
        )
      }
    } catch {
      // aucune transaction precedente : rien a faire
    }
  }

  private async gererTelechargementTermine(info: UpdateInfo): Promise<void> {
    await this.ecrireTransaction({
      versionOrigine: app.getVersion(),
      version: info.version,
      notes: extraireNotes(info),
      statut: 'installation',
      horodatage: new Date().toISOString()
    })
    await this.journaliser('INFO', `Telechargement de ${info.version} verifie (integrite OK) ; installation silencieuse programmee`)
    this.definirEtat({ phase: 'pret', versionDisponible: info.version, progressionPourcent: 100 })
    void this.installerDesQuePossible()
  }

  /** Ne coupe jamais l'application au milieu d'une sauvegarde en cours : reessaie plus tard. */
  private async installerDesQuePossible(): Promise<void> {
    if (this.unJobEstEnCours()) {
      await this.journaliser('INFO', 'Installation differee : une sauvegarde est en cours')
      setTimeout(() => void this.installerDesQuePossible(), DELAI_NOUVEL_ESSAI_SI_OCCUPE_MS).unref()
      return
    }
    setTimeout(() => autoUpdater.quitAndInstall(true, true), DELAI_AVANT_INSTALLATION_MS).unref()
  }

  private definirEtat(partiel: Partial<EtatMiseAJour>): void {
    this.etat = { ...this.etat, versionActuelle: app.getVersion(), ...partiel }
    this.diffuser(this.etat)
  }

  etatCourant(): EtatMiseAJour {
    return { ...this.etat, versionActuelle: app.getVersion() }
  }

  /** Renvoie les notes de la mise a jour installee au dernier demarrage, une seule fois. */
  consommerNotesRedemarrage(): NotesRedemarrage | null {
    const notes = this.notesRedemarrage
    this.notesRedemarrage = null
    return notes
  }

  async verifier(): Promise<EtatMiseAJour> {
    if (!app.isPackaged) {
      this.definirEtat({ phase: 'indisponible_dev', message: tMain('main.updateDev') })
      return this.etatCourant()
    }
    if (this.verificationEnCours || this.etat.phase === 'telechargement' || this.etat.phase === 'pret') {
      return this.etatCourant()
    }
    this.verificationEnCours = true
    try {
      await autoUpdater.checkForUpdates()
    } catch (erreur) {
      await this.journaliser('ERROR', erreur)
      this.definirEtat({ phase: 'erreur', message: tMain('main.updateError') })
      this.planifierNouvelleVerification(DELAI_NOUVELLE_TENTATIVE_ERREUR_MS)
    } finally {
      this.verificationEnCours = false
    }
    return this.etatCourant()
  }
}
