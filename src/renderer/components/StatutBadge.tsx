import type { StatutRun } from '@shared/types'
import { useI18n } from '../i18n'
import type { CleTraduction } from '@shared/i18n'

const STYLES: Record<StatutRun, string> = {
  planification: 'bg-slate-700/70 text-slate-200 ring-slate-500/30',
  en_cours: 'bg-blue-600/20 text-blue-300 ring-blue-400/30',
  interrompu: 'bg-amber-600/20 text-amber-300 ring-amber-400/30',
  confirmation_requise: 'bg-orange-600/20 text-orange-300 ring-orange-400/30',
  termine: 'bg-emerald-600/20 text-emerald-300 ring-emerald-400/30',
  echec: 'bg-red-600/20 text-red-300 ring-red-400/30',
  annule: 'bg-slate-700/70 text-slate-300 ring-slate-500/30'
}

const LIBELLES: Record<StatutRun, CleTraduction> = {
  planification: 'status.scheduled',
  en_cours: 'status.running',
  interrompu: 'status.interrupted',
  confirmation_requise: 'status.confirmation',
  termine: 'status.completed',
  echec: 'status.failed',
  annule: 'status.cancelled'
}

export default function StatutBadge({ statut }: { statut: StatutRun }) {
  const { t } = useI18n()
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[statut]}`}>
      <span aria-hidden="true" className={`status-dot ${statut === 'en_cours' ? 'is-live' : ''}`} />
      {t(LIBELLES[statut])}
    </span>
  )
}
