import { useEffect } from 'react'
import { Play, Square, HardDrive, Wifi, FolderSync } from 'lucide-react'
import { useAppStore } from '../state/store'
import ProgressBar from '../components/ProgressBar'

const LIBELLE_MODE: Record<string, string> = {
  complete: 'Complete',
  incrementielle: 'Incrementielle',
  miroir: 'Miroir'
}

export default function Dashboard() {
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
        <h1 className="text-2xl font-semibold text-slate-100">Tableau de bord</h1>
        <p className="text-sm text-slate-400">Vue d'ensemble de vos sauvegardes et du stockage detecte.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Carte titre="Sauvegardes actives" valeur={String(jobsActifs)} icone={FolderSync} />
        <Carte titre="Lecteurs detectes" valeur={String(lecteurs.length)} icone={HardDrive} />
        <Carte titre="Appareils reseau" valeur={String(appareilsReseau.length)} icone={Wifi} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Sauvegardes</h2>
        {jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
            Aucune sauvegarde configuree.{' '}
            <button onClick={() => editerJob(null)} className="text-blue-400 hover:underline">
              Creer la premiere sauvegarde
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
                        {LIBELLE_MODE[job.mode]} · {job.sources.length} source(s) → {job.destination}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {enCours ? (
                        <button
                          onClick={() => void annulerJob(job.id)}
                          className="flex items-center gap-1.5 rounded-lg bg-red-600/20 px-3 py-1.5 text-sm font-medium text-red-300 hover:bg-red-600/30"
                        >
                          <Square size={14} /> Annuler
                        </button>
                      ) : (
                        <button
                          onClick={() => void executerJob(job.id)}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
                        >
                          <Play size={14} /> Sauvegarder
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
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Lecteurs detectes</h2>
          <div className="flex flex-col gap-2">
            {lecteurs.map((l) => (
              <div key={l.identifiant} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-sm">
                <span className="text-slate-200">
                  {l.identifiant} {l.nom}
                </span>
                <span className="text-xs text-slate-500">{l.type}</span>
              </div>
            ))}
            {lecteurs.length === 0 && <div className="text-sm text-slate-600">Aucun lecteur detecte.</div>}
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Appareils reseau</h2>
          <div className="flex flex-col gap-2">
            {appareilsReseau.map((a) => (
              <div key={a.adresseIp} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-sm">
                <span className="text-slate-200">{a.nom}</span>
                <span className="text-xs text-slate-500">{a.adresseIp}</span>
              </div>
            ))}
            {appareilsReseau.length === 0 && <div className="text-sm text-slate-600">Aucun appareil detecte pour le moment.</div>}
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
