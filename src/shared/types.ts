export type ModeSauvegarde = 'complete' | 'incrementielle' | 'miroir'

export type TypeDeclenchement = 'manuel' | 'planifie' | 'demarrage'

export type FrequencePlanification = 'quotidienne' | 'hebdomadaire' | 'intervalle'

export interface Planification {
  type: TypeDeclenchement
  frequence?: FrequencePlanification
  heure?: string // "HH:MM"
  joursSemaine?: number[] // 0 = dimanche ... 6 = samedi
  intervalleMinutes?: number
}

export interface FiltreExclusion {
  extensions: string[] // ex: [".tmp", ".log"]
  dossiers: string[] // noms ou motifs glob de dossiers, ex: ["node_modules", "$RECYCLE.BIN"]
  fichiers: string[] // motifs glob de fichiers, ex: ["desktop.ini", "*.bak"]
}

export interface ParametresAvances {
  limiteDebitKoS: number | null // null = illimite
  nombreVersionsAConserver: number // pour complete/incrementielle
  verifierIntegrite: boolean
  seuilSuppressionPourcent: number // disjoncteur miroir, 0-100
  seuilSuppressionAbsolu: number // disjoncteur miroir, nombre de fichiers
  nombreTentatives: number
}

export const PARAMETRES_AVANCES_DEFAUT: ParametresAvances = {
  limiteDebitKoS: null,
  nombreVersionsAConserver: 10,
  verifierIntegrite: true,
  seuilSuppressionPourcent: 25,
  seuilSuppressionAbsolu: 500,
  nombreTentatives: 3
}

export interface Job {
  id: number
  nom: string
  sources: string[]
  destination: string
  mode: ModeSauvegarde
  planification: Planification
  exclusions: FiltreExclusion
  parametres: ParametresAvances
  actif: boolean
  creeLe: number
  modifieLe: number
  dernierRunId: number | null
}

export type NouveauJob = Omit<Job, 'id' | 'creeLe' | 'modifieLe' | 'dernierRunId'>

export type StatutRun =
  | 'planification'
  | 'en_cours'
  | 'interrompu'
  | 'confirmation_requise'
  | 'termine'
  | 'echec'
  | 'annule'

export interface Run {
  id: number
  jobId: number
  statut: StatutRun
  demarreLe: number
  termineLe: number | null
  fichiersCopies: number
  fichiersMisAJour: number
  fichiersSupprimes: number
  fichiersIgnores: number
  fichiersEnErreur: number
  octetsTransferes: number
  message: string | null
}

export type EtatFichierRun =
  | 'pending'
  | 'copying'
  | 'copied'
  | 'verifying'
  | 'done'
  | 'failed'
  | 'delete_pending'
  | 'deleted'

export interface RunFile {
  runId: number
  cheminSource: string
  cheminDestination: string
  etat: EtatFichierRun
  tailleSource: number | null
  mtimeSource: number | null
  hashSource: string | null
  cheminTemp: string | null
  nombreTentatives: number
  derniereErreur: string | null
}

export interface EntreeManifest {
  jobId: number
  runId: number
  cheminRelatif: string
  taille: number
  mtime: number
  hash: string | null
  versionPrecedenteId: number | null
}

export type NiveauJournal = 'info' | 'avertissement' | 'erreur'

export interface EntreeJournal {
  id: number
  runId: number | null
  horodatage: number
  niveau: NiveauJournal
  message: string
  chemin: string | null
}

export interface ProgressionRun {
  runId: number
  jobId: number
  fichierCourant: string | null
  fichiersTraites: number
  fichiersTotal: number
  octetsTransferes: number
  octetsTotal: number
  vitesseOctetsParSeconde: number
  phase: 'analyse' | 'copie' | 'verification' | 'suppression' | 'termine'
}

export type TypeLecteur = 'interne' | 'amovible' | 'reseau' | 'cdrom' | 'inconnu'

export interface LecteurDetecte {
  identifiant: string // ex: "C:\"
  nom: string
  type: TypeLecteur
  systemeFichiers: string | null
  tailleTotale: number | null
  espaceLibre: number | null
}

export interface AppareilReseau {
  nom: string
  adresseIp: string
  url: string | null
  source: 'ssdp' | 'scan-smb' | 'manuel'
}

export interface Notifications {
  surSucces: boolean
  surEchec: boolean
  surAvertissement: boolean
}

export interface Parametres {
  limiteDebitKoS: number | null
  nombreVersionsParDefaut: number
  verifierIntegriteParDefaut: boolean
  notifications: Notifications
  demarrerAvecWindows: boolean
  themeSombre: boolean
  conserverJournauxJours: number
  algorithmeHash: 'sha256'
}

export const PARAMETRES_DEFAUT: Parametres = {
  limiteDebitKoS: null,
  nombreVersionsParDefaut: 10,
  verifierIntegriteParDefaut: true,
  notifications: { surSucces: true, surEchec: true, surAvertissement: true },
  demarrerAvecWindows: false,
  themeSombre: true,
  conserverJournauxJours: 30,
  algorithmeHash: 'sha256'
}

export interface EmplacementReseau {
  id: number
  nom: string
  chemin: string
  ajouteLe: number
}

export interface DemandeConfirmationMiroir {
  runId: number
  jobId: number
  suppressionsPrevues: number
  fichiersConnus: number
  pourcentage: number
}
