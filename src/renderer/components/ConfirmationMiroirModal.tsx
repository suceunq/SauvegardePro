import { AlertTriangle } from 'lucide-react'
import { useAppStore } from '../state/store'
import { useI18n } from '../i18n'

export default function ConfirmationMiroirModal() {
  const { t } = useI18n()
  const demandes = useAppStore((e) => e.demandesConfirmation)
  const jobs = useAppStore((e) => e.jobs)
  const confirmerMiroir = useAppStore((e) => e.confirmerMiroir)
  const setDemandes = useAppStore.setState

  if (demandes.length === 0) return null
  const demande = demandes[0]
  const job = jobs.find((j) => j.id === demande.jobId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-amber-700/50 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-3 flex items-center gap-3 text-amber-400">
          <AlertTriangle size={24} />
          <h2 className="text-lg font-semibold">{t('mirror.title')}</h2>
        </div>
        <p className="text-sm text-slate-300">
          {t('mirror.message', { name: job?.nom ?? t('common.jobNumber', { id: demande.jobId }), count: demande.suppressionsPrevues, percent: demande.pourcentage })}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          {t('mirror.warning')}
        </p>
        {demande.apercuSuppressions.length > 0 && (
          <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-400">
            {demande.apercuSuppressions.map((chemin) => (
              <div key={chemin} className="truncate py-0.5">{chemin}</div>
            ))}
            {demande.suppressionsPrevues > demande.apercuSuppressions.length && (
              <div className="pt-1 text-slate-500">
                {t('mirror.more', { count: demande.suppressionsPrevues - demande.apercuSuppressions.length })}
              </div>
            )}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => setDemandes((etat) => ({ demandesConfirmation: etat.demandesConfirmation.filter((d) => d.runId !== demande.runId) }))}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            {t('mirror.ignore')}
          </button>
          <button
            onClick={() => void confirmerMiroir(demande.jobId, demande.runId)}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
          >
            {t('mirror.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
