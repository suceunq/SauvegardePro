import type { StatutRun } from '@shared/types'
import { useI18n } from '../i18n'
import type { CleTraduction } from '@shared/i18n'

const STYLES: Record<StatutRun, string> = {
  planification: 'bg-slate-700 text-slate-200',
  en_cours: 'bg-blue-600/20 text-blue-300',
  interrompu: 'bg-amber-600/20 text-amber-300',
  confirmation_requise: 'bg-orange-600/20 text-orange-300',
  termine: 'bg-emerald-600/20 text-emerald-300',
  echec: 'bg-red-600/20 text-red-300',
  annule: 'bg-slate-700 text-slate-300'
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
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[statut]}`}>
      {t(LIBELLES[statut])}
    </span>
  )
}
