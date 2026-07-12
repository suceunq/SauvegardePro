import { useEffect, useState } from 'react'
import { DownloadCloud } from 'lucide-react'
import Sidebar from './components/Sidebar'
import ConfirmationMiroirModal from './components/ConfirmationMiroirModal'
import UpdateDialog from './components/UpdateDialog'
import AboutDialog from './components/AboutDialog'
import Dashboard from './pages/Dashboard'
import JobsPage from './pages/JobsPage'
import NewJobPage from './pages/NewJobPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import { useAppStore } from './state/store'

export default function App() {
  const [miseAJourOuverte, setMiseAJourOuverte] = useState(false)
  const [aProposOuvert, setAProposOuvert] = useState(false)
  const page = useAppStore((e) => e.page)
  const initialiserEcouteurs = useAppStore((e) => e.initialiserEcouteurs)
  const chargerEtatMiseAJour = useAppStore((e) => e.chargerEtatMiseAJour)
  const miseAJour = useAppStore((e) => e.miseAJour)

  useEffect(() => {
    initialiserEcouteurs()
    void chargerEtatMiseAJour()
  }, [])

  useEffect(() => {
    if (miseAJour?.phase === 'disponible') setMiseAJourOuverte(true)
  }, [miseAJour?.phase, miseAJour?.versionDisponible])

  const banniereVisible =
    page !== 'parametres' && (miseAJour?.phase === 'disponible' || miseAJour?.phase === 'pret')

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100">
      <Sidebar ouvrirAPropos={() => setAProposOuvert(true)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {banniereVisible && (
          <button
            onClick={() => setMiseAJourOuverte(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            <DownloadCloud size={16} />
            {miseAJour?.phase === 'pret'
              ? `Mise a jour ${miseAJour.versionDisponible} prete a installer`
              : `Mise a jour ${miseAJour?.versionDisponible} disponible`}
            <span className="underline">Voir dans Parametres</span>
          </button>
        )}
        <main className="flex-1 overflow-y-auto">
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
    </div>
  )
}
