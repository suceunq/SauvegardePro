import { useEffect } from 'react'
import { Play, Square, Pencil, Trash2, PlusCircle } from 'lucide-react'
import { useAppStore } from '../state/store'
import ProgressBar from '../components/ProgressBar'

const LIBELLE_MODE: Record<string, string> = {
  complete: 'Sauvegarde complete',
  incrementielle: 'Sauvegarde incrementielle',
  miroir: 'Synchronisation miroir'
}

export default function JobsPage() {
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
          <h1 className="text-2xl font-semibold text-slate-100">Sauvegardes</h1>
          <p className="text-sm text-slate-400">Gerez vos taches de sauvegarde et de synchronisation.</p>
        </div>
        <button
          onClick={() => editerJob(null)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          <PlusCircle size={16} /> Nouvelle sauvegarde
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
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">Desactive</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{LIBELLE_MODE[job.mode]}</div>
                  <div className="mt-2 text-xs text-slate-400">
                    <div>
                      <span className="text-slate-600">Sources : </span>
                      {job.sources.join(', ')}
                    </div>
                    <div>
                      <span className="text-slate-600">Destination : </span>
                      {job.destination}
                    </div>
                    <div>
                      <span className="text-slate-600">Planification : </span>
                      {libellePlanification(job.planification.type)}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
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
                      <Play size={14} /> Lancer
                    </button>
                  )}
                  <button
                    onClick={() => editerJob(job)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    <Pencil size={14} /> Modifier
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Supprimer la sauvegarde "${job.nom}" ? Cette action est irreversible.`)) {
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
            Aucune sauvegarde configuree pour le moment.
          </div>
        )}
      </div>
    </div>
  )
}

function libellePlanification(type: string): string {
  switch (type) {
    case 'manuel':
      return 'Manuelle'
    case 'planifie':
      return 'Planifiee'
    case 'demarrage':
      return "Au demarrage de l'application"
    default:
      return type
  }
}
