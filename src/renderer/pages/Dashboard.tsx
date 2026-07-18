import { useEffect } from 'react'
import { Play, Square, HardDrive, Wifi, FolderSync } from 'lucide-react'
import { useAppStore } from '../state/store'
import ProgressBar from '../components/ProgressBar'
import { useI18n } from '../i18n'

export default function Dashboard() {
  const { t } = useI18n()
  const jobs = useAppStore((e) => e.jobs)
  const lecteurs = useAppStore((e) => e.lecteurs)
  const appareilsReseau = useAppStore((e) => e.appareilsReseau)
  const progressions = useAppStore((e) => e.progressions)
  const chargerJobs = useAppStore((e) => e.chargerJobs)
  const chargerLecteurs = useAppStore((e) => e.chargerLecteurs)
  const chargerReseau = useAppStore((e) => e.chargerReseau)
  const executerJob = useAppStore((e) => e.executerJob)
  const annulerJob = useAppStore((e) => e.annulerJob)
  const editerJob = useAppStore((e) => e.editerJob)

  useEffect(() => {
    void chargerJobs()
    void chargerLecteurs()
    void chargerReseau()
  }, [])

  const jobsActifs = jobs.filter((j) => j.actif).length

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">{t('nav.dashboard')}</h1>
        <p className="text-sm text-slate-400">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Carte titre={t('dashboard.activeBackups')} valeur={String(jobsActifs)} icone={FolderSync} />
        <Carte titre={t('dashboard.detectedDrives')} valeur={String(lecteurs.length)} icone={HardDrive} />
        <Carte titre={t('dashboard.networkDevices')} valeur={String(appareilsReseau.length)} icone={Wifi} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{t('nav.backups')}</h2>
        {jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
            {t('dashboard.noBackups')}{' '}
            <button onClick={() => editerJob(null)} className="text-blue-400 hover:underline">
              {t('dashboard.createFirst')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {jobs.map((job) => {
              const progression = progressions[job.id]
              const enCours = progression && progression.phase !== 'termine'
              return (
                <div key={job.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-100">{job.nom}</div>
                      <div className="text-xs text-slate-500">
                        {t(job.mode === 'complete' ? 'mode.complete.short' : job.mode === 'incrementielle' ? 'mode.incremental.short' : 'mode.mirror.short')} · {t('common.sources', { count: job.sources.length })} → {job.destination}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                          <Play size={14} /> {t('common.backup')}
                        </button>
                      )}
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
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{t('dashboard.detectedDrives')}</h2>
          <div className="flex flex-col gap-2">
            {lecteurs.map((l) => (
              <div key={l.identifiant} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-sm">
                <span className="text-slate-200">
                  {l.identifiant} {l.nom}
                </span>
                <span className="text-xs text-slate-500">{t(l.type === 'interne' ? 'drive.internal' : l.type === 'amovible' ? 'drive.removable' : l.type === 'reseau' ? 'drive.network' : l.type === 'cdrom' ? 'drive.cdrom' : 'drive.unknown')}</span>
              </div>
            ))}
            {lecteurs.length === 0 && <div className="text-sm text-slate-600">{t('dashboard.noDrives')}</div>}
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{t('dashboard.networkDevices')}</h2>
          <div className="flex flex-col gap-2">
            {appareilsReseau.map((a) => (
              <div key={a.adresseIp} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-sm">
                <span className="text-slate-200">{a.nom}</span>
                <span className="text-xs text-slate-500">{a.adresseIp}</span>
              </div>
            ))}
            {appareilsReseau.length === 0 && <div className="text-sm text-slate-600">{t('dashboard.noNetwork')}</div>}
          </div>
        </div>
      </section>
    </div>
  )
}

function Carte({ titre, valeur, icone: Icone }: { titre: string; valeur: string; icone: typeof HardDrive }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20 text-blue-300">
        <Icone size={20} />
      </div>
      <div>
        <div className="text-xl font-semibold text-slate-100">{valeur}</div>
        <div className="text-xs text-slate-500">{titre}</div>
      </div>
    </div>
  )
}
