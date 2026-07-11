import type {
  AppareilReseau,
  DemandeConfirmationMiroir,
  EmplacementReseau,
  EntreeJournal,
  Job,
  LecteurDetecte,
  NouveauJob,
  Parametres,
  ProgressionRun,
  Run
} from './types'

export const CANAUX_IPC = {
  jobsLister: 'jobs:lister',
  jobsObtenir: 'jobs:obtenir',
  jobsCreer: 'jobs:creer',
  jobsMettreAJour: 'jobs:mettreAJour',
  jobsSupprimer: 'jobs:supprimer',
  jobsExecuter: 'jobs:executer',
  jobsAnnuler: 'jobs:annuler',
  jobsEstEnCours: 'jobs:estEnCours',

  runsRecents: 'runs:recents',
  runsJournal: 'runs:journal',
  runsConfirmerMiroir: 'runs:confirmerMiroir',

  discoveryLecteurs: 'discovery:lecteurs',
  discoveryReseau: 'discovery:reseau',
  discoveryEmplacements: 'discovery:emplacements',
  discoveryAjouterEmplacement: 'discovery:ajouterEmplacement',
  discoverySupprimerEmplacement: 'discovery:supprimerEmplacement',
  discoveryChoisirDossier: 'discovery:choisirDossier',

  settingsObtenir: 'settings:obtenir',
  settingsEnregistrer: 'settings:enregistrer',

  evenementProgression: 'evenement:progression',
  evenementLecteurs: 'evenement:lecteurs',
  evenementConfirmationMiroir: 'evenement:confirmationMiroir'
} as const

export interface SauvegardeProAPI {
  jobs: {
    lister(): Promise<Job[]>
    obtenir(id: number): Promise<Job | undefined>
    creer(job: NouveauJob): Promise<Job>
    mettreAJour(id: number, job: NouveauJob): Promise<Job>
    supprimer(id: number): Promise<void>
    executer(id: number): Promise<{ runId: number | null }>
    annuler(id: number): Promise<boolean>
    estEnCours(id: number): Promise<boolean>
  }
  runs: {
    recents(jobId?: number): Promise<Run[]>
    journal(runId: number): Promise<EntreeJournal[]>
    confirmerMiroir(jobId: number, runId: number): Promise<void>
  }
  discovery: {
    lecteurs(): Promise<LecteurDetecte[]>
    reseau(): Promise<AppareilReseau[]>
    emplacementsReseau(): Promise<EmplacementReseau[]>
    ajouterEmplacementReseau(nom: string, chemin: string): Promise<EmplacementReseau>
    supprimerEmplacementReseau(id: number): Promise<void>
    choisirDossier(): Promise<string | null>
  }
  settings: {
    obtenir(): Promise<Parametres>
    enregistrer(parametres: Parametres): Promise<void>
  }
  evenements: {
    surProgression(cb: (p: ProgressionRun) => void): () => void
    surLecteursChanges(cb: (lecteurs: LecteurDetecte[]) => void): () => void
    surDemandeConfirmationMiroir(cb: (d: DemandeConfirmationMiroir) => void): () => void
  }
}
