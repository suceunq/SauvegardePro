import { create } from 'zustand'
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
} from '@shared/types'

export type Page = 'tableau' | 'sauvegardes' | 'nouvelle' | 'historique' | 'parametres'

interface EtatApp {
  page: Page
  jobs: Job[]
  jobEnEdition: Job | null
  parametres: Parametres | null
  lecteurs: LecteurDetecte[]
  appareilsReseau: AppareilReseau[]
  emplacementsReseau: EmplacementReseau[]
  progressions: Record<number, ProgressionRun>
  demandesConfirmation: DemandeConfirmationMiroir[]
  runsRecents: Run[]
  runsParJob: Record<number, Run[]>
  journalCourant: EntreeJournal[]
  runIdJournal: number | null
  chargement: boolean
  ecouteursInitialises: boolean

  allerA(page: Page): void
  editerJob(job: Job | null): void

  chargerJobs(): Promise<void>
  creerJob(job: NouveauJob): Promise<void>
  mettreAJourJob(id: number, job: NouveauJob): Promise<void>
  supprimerJob(id: number): Promise<void>
  executerJob(id: number): Promise<void>
  annulerJob(id: number): Promise<void>

  chargerParametres(): Promise<void>
  enregistrerParametres(p: Parametres): Promise<void>

  chargerLecteurs(): Promise<void>
  chargerReseau(): Promise<void>
  chargerEmplacements(): Promise<void>
  ajouterEmplacement(nom: string, chemin: string): Promise<void>
  supprimerEmplacement(id: number): Promise<void>
  choisirDossier(): Promise<string | null>

  chargerHistorique(jobId?: number): Promise<void>
  chargerJournal(runId: number): Promise<void>
  confirmerMiroir(jobId: number, runId: number): Promise<void>

  initialiserEcouteurs(): void
}

export const useAppStore = create<EtatApp>((set, get) => ({
  page: 'tableau',
  jobs: [],
  jobEnEdition: null,
  parametres: null,
  lecteurs: [],
  appareilsReseau: [],
  emplacementsReseau: [],
  progressions: {},
  demandesConfirmation: [],
  runsRecents: [],
  runsParJob: {},
  journalCourant: [],
  runIdJournal: null,
  chargement: false,
  ecouteursInitialises: false,

  allerA: (page) => set({ page }),
  editerJob: (job) => set({ jobEnEdition: job, page: 'nouvelle' }),

  chargerJobs: async () => {
    set({ chargement: true })
    try {
      const jobs = await window.sauvegardePro.jobs.lister()
      set({ jobs })
    } finally {
      set({ chargement: false })
    }
  },

  creerJob: async (job) => {
    await window.sauvegardePro.jobs.creer(job)
    await get().chargerJobs()
  },

  mettreAJourJob: async (id, job) => {
    await window.sauvegardePro.jobs.mettreAJour(id, job)
    await get().chargerJobs()
  },

  supprimerJob: async (id) => {
    await window.sauvegardePro.jobs.supprimer(id)
    await get().chargerJobs()
  },

  executerJob: async (id) => {
    await window.sauvegardePro.jobs.executer(id)
    await get().chargerJobs()
  },

  annulerJob: async (id) => {
    await window.sauvegardePro.jobs.annuler(id)
  },

  chargerParametres: async () => {
    const parametres = await window.sauvegardePro.settings.obtenir()
    set({ parametres })
  },

  enregistrerParametres: async (p) => {
    await window.sauvegardePro.settings.enregistrer(p)
    set({ parametres: p })
  },

  chargerLecteurs: async () => {
    const lecteurs = await window.sauvegardePro.discovery.lecteurs()
    set({ lecteurs })
  },

  chargerReseau: async () => {
    const appareilsReseau = await window.sauvegardePro.discovery.reseau()
    set({ appareilsReseau })
  },

  chargerEmplacements: async () => {
    const emplacementsReseau = await window.sauvegardePro.discovery.emplacementsReseau()
    set({ emplacementsReseau })
  },

  ajouterEmplacement: async (nom, chemin) => {
    await window.sauvegardePro.discovery.ajouterEmplacementReseau(nom, chemin)
    await get().chargerEmplacements()
  },

  supprimerEmplacement: async (id) => {
    await window.sauvegardePro.discovery.supprimerEmplacementReseau(id)
    await get().chargerEmplacements()
  },

  choisirDossier: () => window.sauvegardePro.discovery.choisirDossier(),

  chargerHistorique: async (jobId) => {
    const runs = await window.sauvegardePro.runs.recents(jobId)
    if (jobId === undefined) set({ runsRecents: runs })
    else set((etat) => ({ runsParJob: { ...etat.runsParJob, [jobId]: runs } }))
  },

  chargerJournal: async (runId) => {
    const journalCourant = await window.sauvegardePro.runs.journal(runId)
    set({ journalCourant, runIdJournal: runId })
  },

  confirmerMiroir: async (jobId, runId) => {
    await window.sauvegardePro.runs.confirmerMiroir(jobId, runId)
    set((etat) => ({ demandesConfirmation: etat.demandesConfirmation.filter((d) => d.runId !== runId) }))
  },

  initialiserEcouteurs: () => {
    if (get().ecouteursInitialises) return
    set({ ecouteursInitialises: true })

    window.sauvegardePro.evenements.surProgression((p: ProgressionRun) => {
      set((etat) => ({ progressions: { ...etat.progressions, [p.jobId]: p } }))
      if (p.phase === 'termine') {
        void get().chargerJobs()
        void get().chargerHistorique()
      }
    })

    window.sauvegardePro.evenements.surLecteursChanges((lecteurs: LecteurDetecte[]) => {
      set({ lecteurs })
    })

    window.sauvegardePro.evenements.surDemandeConfirmationMiroir((d: DemandeConfirmationMiroir) => {
      set((etat) => ({ demandesConfirmation: [...etat.demandesConfirmation.filter((x) => x.runId !== d.runId), d] }))
    })
  }
}))
