import { useEffect, useRef, useState } from 'react'
import { DownloadCloud, RotateCw } from 'lucide-react'
import Sidebar from './components/Sidebar'
import ConfirmationMiroirModal from './components/ConfirmationMiroirModal'
import UpdateNotesDialog from './components/UpdateNotesDialog'
import AboutDialog from './components/AboutDialog'
import FeedbackDialog from './components/FeedbackDialog'
import WelcomeDialog from './components/WelcomeDialog'
import Dashboard from './pages/Dashboard'
import JobsPage from './pages/JobsPage'
import NewJobPage from './pages/NewJobPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import { useAppStore } from './state/store'
import { useI18n } from './i18n'

export default function App() {
  const { t, langue } = useI18n()
  const [aProposOuvert, setAProposOuvert] = useState(false)
  const [suggestionOuverte, setSuggestionOuverte] = useState(false)
  const [bienvenueOuverte, setBienvenueOuverte] = useState(false)
  const [bienvenueEvaluee, setBienvenueEvaluee] = useState(false)
  const page = useAppStore((e) => e.page)
  const initialiserEcouteurs = useAppStore((e) => e.initialiserEcouteurs)
  const chargerEtatMiseAJour = useAppStore((e) => e.chargerEtatMiseAJour)
  const chargerNotesRedemarrage = useAppStore((e) => e.chargerNotesRedemarrage)
  const effacerNotesRedemarrage = useAppStore((e) => e.effacerNotesRedemarrage)
  const chargerParametres = useAppStore((e) => e.chargerParametres)
  const themeSombre = useAppStore((e) => e.parametres?.themeSombre ?? true)
  const parametres = useAppStore((e) => e.parametres)
  const miseAJour = useAppStore((e) => e.miseAJour)
  const notesRedemarrage = useAppStore((e) => e.notesRedemarrage)
  const [toastMiseAJourVisible, setToastMiseAJourVisible] = useState(false)
  const toastMiseAJourAffiche = useRef(false)

  useEffect(() => {
    initialiserEcouteurs()
    void chargerEtatMiseAJour()
    void chargerNotesRedemarrage()
    void chargerParametres()
  }, [])

  // Bref rappel auto-disparaissant au debut du telechargement en arriere-plan - l'installation
  // elle-meme reste entierement silencieuse, ceci indique juste qu'une activite est en cours.
  useEffect(() => {
    if (miseAJour?.phase !== 'telechargement' || toastMiseAJourAffiche.current) return
    toastMiseAJourAffiche.current = true
    setToastMiseAJourVisible(true)
    const minuteur = setTimeout(() => setToastMiseAJourVisible(false), 3000)
    return () => clearTimeout(minuteur)
  }, [miseAJour?.phase])

  useEffect(() => {
    document.documentElement.dataset.theme = themeSombre ? 'dark' : 'light'
  }, [themeSombre])

  useEffect(() => {
    document.documentElement.lang = langue
    document.title = 'SauvegardePro'
  }, [langue])

  useEffect(() => {
    if (!parametres || bienvenueEvaluee) return
    setBienvenueOuverte(parametres.afficherBienvenueAuDemarrage)
    setBienvenueEvaluee(true)
  }, [parametres, bienvenueEvaluee])

  const banniereVisible = page !== 'parametres' && miseAJour?.phase === 'pret'

  return (
    <div className="sauvegarde-shell flex h-screen w-screen bg-slate-950 text-slate-100">
      {toastMiseAJourVisible && (
        <div
          role="status"
          className="fixed left-1/2 top-5 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-100 shadow-2xl shadow-black/40"
        >
          <DownloadCloud size={16} />
          {t('app.updateDownloading', { version: miseAJour?.versionDisponible ?? '' })}
        </div>
      )}
      <Sidebar
        ouvrirAPropos={() => setAProposOuvert(true)}
        ouvrirSuggestion={() => setSuggestionOuverte(true)}
        ouvrirBienvenue={() => setBienvenueOuverte(true)}
      />
      <div className="sauvegarde-content flex flex-1 flex-col overflow-hidden">
        {banniereVisible && (
          <div className="flex items-center justify-center gap-2 bg-blue-600 px-4 py-2 text-sm font-medium text-white">
            <RotateCw size={16} />
            {t('app.updateInstalling', { version: miseAJour?.versionDisponible ?? '' })}
          </div>
        )}
        <main className="sauvegarde-main flex-1 overflow-y-auto">
          {page === 'tableau' && <Dashboard />}
          {page === 'sauvegardes' && <JobsPage />}
          {page === 'nouvelle' && <NewJobPage />}
          {page === 'historique' && <HistoryPage />}
          {page === 'parametres' && <SettingsPage />}
        </main>
      </div>
      <ConfirmationMiroirModal />
      <AboutDialog ouvert={aProposOuvert} fermer={() => setAProposOuvert(false)} />
      <FeedbackDialog ouvert={suggestionOuverte} fermer={() => setSuggestionOuverte(false)} />
      <WelcomeDialog ouvert={bienvenueOuverte} fermer={() => setBienvenueOuverte(false)} />
      {notesRedemarrage && <UpdateNotesDialog notes={notesRedemarrage} fermer={effacerNotesRedemarrage} />}
    </div>
  )
}
