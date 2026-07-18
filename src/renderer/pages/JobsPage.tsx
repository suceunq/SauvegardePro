import { useEffect } from 'react'
import { Play, Square, Pencil, Trash2, PlusCircle } from 'lucide-react'
import { useAppStore } from '../state/store'
import ProgressBar from '../components/ProgressBar'
import { useI18n } from '../i18n'

export default function JobsPage() {
  const { t } = useI18n()
  const jobs = useAppStore((e) => e.jobs)
  const progressions = useAppStore((e) => e.progressions)
  const chargerJobs = useAppStore((e) => e.chargerJobs)
  const executerJob = useAppStore((e) => e.executerJob)
  const annulerJob = useAppStore((e) => e.annulerJob)
  const supprimerJob = useAppStore((e) => e.supprimerJob)
  const editerJob = useAppStore((e) => e.editerJob)

  useEffect(() => {
    void chargerJobs()
  }, [])

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">{t('nav.backups')}</h1>
          <p className="text-sm text-slate-400">{t('jobs.subtitle')}</p>
        </div>
        <button
          onClick={() => editerJob(null)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          <PlusCircle size={16} /> {t('nav.newBackup')}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {jobs.map((job) => {
          const progression = progressions[job.id]
          const enCours = progression && progression.phase !== 'termine'
          return (
            <div key={job.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-100">{job.nom}</span>
                    {!job.actif && (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">{t('jobs.disabled')}</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{t(job.mode === 'complete' ? 'mode.complete' : job.mode === 'incrementielle' ? 'mode.incremental' : 'mode.mirror')}</div>
                  <div className="mt-2 text-xs text-slate-400">
                    <div>
                      <span className="text-slate-600">{t('jobs.sources')} </span>
                      {job.sources.join(', ')}
                    </div>
                    <div>
                      <span className="text-slate-600">{t('jobs.destination')} </span>
                      {job.destination}
                    </div>
                    <div>
                      <span className="text-slate-600">{t('jobs.schedule')} </span>
                      {t(job.planification.type === 'manuel' ? 'schedule.manual' : job.planification.type === 'planifie' ? 'schedule.scheduled' : 'schedule.startupLong')}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {enCours ? (
                    <button
                      onClick={() => void annulerJob(job.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-red-600/20 px-3 py-1.5 text-sm font-medium text-red-300 hover:bg-red-600/30"
                    >
                      <Square size={14} /> {t('common.cancel')}
                    </button>
                  ) : (
                    <button
                      onClick={() => void executerJob(job.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
                    >
                      <Play size={14} /> {t('common.start')}
                    </button>
                  )}
                  <button
                    onClick={() => editerJob(job)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    <Pencil size={14} /> {t('common.edit')}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(t('jobs.deleteConfirm', { name: job.nom }))) {
                        void supprimerJob(job.id)
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-red-900/30 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {enCours && (
                <div className="mt-3">
                  <ProgressBar {...progression} />
                </div>
              )}
            </div>
          )
        })}
        {jobs.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
            {t('jobs.empty')}
          </div>
        )}
      </div>
    </div>
  )
}
