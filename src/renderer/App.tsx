import { useEffect } from 'react'
import Sidebar from './components/Sidebar'
import ConfirmationMiroirModal from './components/ConfirmationMiroirModal'
import Dashboard from './pages/Dashboard'
import JobsPage from './pages/JobsPage'
import NewJobPage from './pages/NewJobPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import { useAppStore } from './state/store'

export default function App() {
  const page = useAppStore((e) => e.page)
  const initialiserEcouteurs = useAppStore((e) => e.initialiserEcouteurs)

  useEffect(() => {
    initialiserEcouteurs()
  }, [])

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {page === 'tableau' && <Dashboard />}
        {page === 'sauvegardes' && <JobsPage />}
        {page === 'nouvelle' && <NewJobPage />}
        {page === 'historique' && <HistoryPage />}
        {page === 'parametres' && <SettingsPage />}
      </main>
      <ConfirmationMiroirModal />
    </div>
  )
}
