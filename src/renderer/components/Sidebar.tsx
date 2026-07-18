import { LayoutDashboard, ListChecks, PlusCircle, History, Settings, Info, Mail, HeartHandshake } from 'lucide-react'
import { useAppStore, type Page } from '../state/store'
import { useI18n } from '../i18n'
import type { CleTraduction } from '@shared/i18n'

const ELEMENTS: Array<{ page: Page; libelle: CleTraduction; icone: typeof LayoutDashboard }> = [
  { page: 'tableau', libelle: 'nav.dashboard', icone: LayoutDashboard },
  { page: 'sauvegardes', libelle: 'nav.backups', icone: ListChecks },
  { page: 'nouvelle', libelle: 'nav.newBackup', icone: PlusCircle },
  { page: 'historique', libelle: 'nav.history', icone: History },
  { page: 'parametres', libelle: 'nav.settings', icone: Settings }
]

export default function Sidebar({
  ouvrirAPropos,
  ouvrirSuggestion,
  ouvrirBienvenue
}: {
  ouvrirAPropos: () => void
  ouvrirSuggestion: () => void
  ouvrirBienvenue: () => void
}) {
  const { t } = useI18n()
  const page = useAppStore((e) => e.page)
  const allerA = useAppStore((e) => e.allerA)
  const editerJob = useAppStore((e) => e.editerJob)

  return (
    <aside className="metal-sidebar flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-200">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="metal-logo flex h-10 w-10 items-center justify-center rounded-xl"><span>SP</span></div>
        <div><span className="block text-lg font-semibold tracking-tight">SauvegardePro</span><span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{t('app.tagline')}</span></div>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {ELEMENTS.map(({ page: cible, libelle, icone: Icone }) => (
          <button
            key={cible}
            onClick={() => (cible === 'nouvelle' ? editerJob(null) : allerA(cible))}
            className={`metal-nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              page === cible ? 'is-active bg-blue-600/20 text-blue-300' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
            }`}
          >
            <Icone size={18} />
            {t(libelle)}
          </button>
        ))}
      </nav>
      <div className="mt-auto grid gap-1 px-3 py-4"><button onClick={ouvrirBienvenue} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-rose-300 hover:bg-rose-950/40"><HeartHandshake size={18} />{t('nav.support')}</button><button onClick={ouvrirSuggestion} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-blue-300 hover:bg-blue-950"><Mail size={18} />{t('nav.feedback')}</button><button onClick={ouvrirAPropos} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-900 hover:text-slate-100"><Info size={18} />{t('nav.about')}</button></div>
    </aside>
  )
}
