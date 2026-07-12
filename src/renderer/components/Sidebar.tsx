import { LayoutDashboard, ListChecks, PlusCircle, History, Settings, Info } from 'lucide-react'
import { useAppStore, type Page } from '../state/store'

const ELEMENTS: Array<{ page: Page; libelle: string; icone: typeof LayoutDashboard }> = [
  { page: 'tableau', libelle: 'Tableau de bord', icone: LayoutDashboard },
  { page: 'sauvegardes', libelle: 'Sauvegardes', icone: ListChecks },
  { page: 'nouvelle', libelle: 'Nouvelle sauvegarde', icone: PlusCircle },
  { page: 'historique', libelle: 'Historique', icone: History },
  { page: 'parametres', libelle: 'Parametres', icone: Settings }
]

export default function Sidebar({ ouvrirAPropos }: { ouvrirAPropos: () => void }) {
  const page = useAppStore((e) => e.page)
  const allerA = useAppStore((e) => e.allerA)
  const editerJob = useAppStore((e) => e.editerJob)

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-200">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-sky-500" />
        <span className="text-lg font-semibold tracking-tight">SauvegardePro</span>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {ELEMENTS.map(({ page: cible, libelle, icone: Icone }) => (
          <button
            key={cible}
            onClick={() => (cible === 'nouvelle' ? editerJob(null) : allerA(cible))}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              page === cible ? 'bg-blue-600/20 text-blue-300' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
            }`}
          >
            <Icone size={18} />
            {libelle}
          </button>
        ))}
      </nav>
      <div className="mt-auto px-3 py-4"><button onClick={ouvrirAPropos} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-900 hover:text-slate-100"><Info size={18} />À propos</button></div>
    </aside>
  )
}
