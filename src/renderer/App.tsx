import { useEffect, useState } from 'react'
import { DownloadCloud } from 'lucide-react'
import Sidebar from './components/Sidebar'
import ConfirmationMiroirModal from './components/ConfirmationMiroirModal'
import UpdateDialog from './components/UpdateDialog'
import AboutDialog from './components/AboutDialog'
import FeedbackDialog from './components/FeedbackDialog'
import Dashboard from './pages/Dashboard'
import JobsPage from './pages/JobsPage'
import NewJobPage from './pages/NewJobPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import { useAppStore } from './state/store'
import { useI18n } from './i18n'

export default function App() {
  const { t, langue } = useI18n()
  const [miseAJourOuverte, setMiseAJourOuverte] = useState(false)
  const [aProposOuvert, setAProposOuvert] = useState(false)
  const [suggestionOuverte, setSuggestionOuverte] = useState(false)
  const page = useAppStore((e) => e.page)
  const initialiserEcouteurs = useAppStore((e) => e.initialiserEcouteurs)
  const chargerEtatMiseAJour = useAppStore((e) => e.chargerEtatMiseAJour)
  const chargerParametres = useAppStore((e) => e.chargerParametres)
  const themeSombre = useAppStore((e) => e.parametres?.themeSombre ?? true)
  const miseAJour = useAppStore((e) => e.miseAJour)

  useEffect(() => {
    initialiserEcouteurs()
    void chargerEtatMiseAJour()
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
    if (miseAJour?.phase === 'disponible') setMiseAJourOuverte(true)
  }, [miseAJour?.phase, miseAJour?.versionDisponible])

  const banniereVisible =
    page !== 'parametres' && (miseAJour?.phase === 'disponible' || miseAJour?.phase === 'pret')

  return (
    <div className="sauvegarde-shell flex h-screen w-screen bg-slate-950 text-slate-100">
      <Sidebar ouvrirAPropos={() => setAProposOuvert(true)} ouvrirSuggestion={() => setSuggestionOuverte(true)} />
      <div className="sauvegarde-content flex flex-1 flex-col overflow-hidden">
        {banniereVisible && (
          <button
            onClick={() => setMiseAJourOuverte(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            <DownloadCloud size={16} />
            {miseAJour?.phase === 'pret'
              ? t('app.updateReady', { version: miseAJour.versionDisponible ?? '' })
              : t('app.updateAvailable', { version: miseAJour?.versionDisponible ?? '' })}
            <span className="underline">{t('app.viewSettings')}</span>
          </button>
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
      <UpdateDialog ouvert={miseAJourOuverte} fermer={() => setMiseAJourOuverte(false)} />
      <AboutDialog ouvert={aProposOuvert} fermer={() => setAProposOuvert(false)} />
      <FeedbackDialog ouvert={suggestionOuverte} fermer={() => setSuggestionOuverte(false)} />
    </div>
  )
}
