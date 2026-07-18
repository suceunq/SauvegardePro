import { useEffect, useState } from 'react'
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

  useEffect(() => {
    initialiserEcouteurs()
    void chargerEtatMiseAJour()
    void chargerNotesRedemarrage()
    void chargerParametres()
  }, [])

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

  const banniereVisible =
    page !== 'parametres' && (miseAJour?.phase === 'telechargement' || miseAJour?.phase === 'pret')

  return (
    <div className="sauvegarde-shell flex h-screen w-screen bg-slate-950 text-slate-100">
      <Sidebar
        ouvrirAPropos={() => setAProposOuvert(true)}
        ouvrirSuggestion={() => setSuggestionOuverte(true)}
        ouvrirBienvenue={() => setBienvenueOuverte(true)}
      />
      <div className="sauvegarde-content flex flex-1 flex-col overflow-hidden">
        {banniereVisible && (
          <div className="flex items-center justify-center gap-2 bg-blue-600 px-4 py-2 text-sm font-medium text-white">
            {miseAJour?.phase === 'pret' ? <RotateCw size={16} /> : <DownloadCloud size={16} />}
            {miseAJour?.phase === 'pret'
              ? t('app.updateInstalling', { version: miseAJour.versionDisponible ?? '' })
              : t('app.updateDownloading', { version: miseAJour?.versionDisponible ?? '' })}
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
