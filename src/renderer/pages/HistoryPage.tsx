import { useEffect } from 'react'
import { useAppStore } from '../state/store'
import StatutBadge from '../components/StatutBadge'
import { formaterOctets } from '../components/ProgressBar'

function formaterDate(horodatage: number): string {
  return new Date(horodatage).toLocaleString('fr-FR')
}

export default function HistoryPage() {
  const runsRecents = useAppStore((e) => e.runsRecents)
  const jobs = useAppStore((e) => e.jobs)
  const journalCourant = useAppStore((e) => e.journalCourant)
  const runIdJournal = useAppStore((e) => e.runIdJournal)
  const chargerHistorique = useAppStore((e) => e.chargerHistorique)
  const chargerJobs = useAppStore((e) => e.chargerJobs)
  const chargerJournal = useAppStore((e) => e.chargerJournal)

  useEffect(() => {
    void chargerJobs()
    void chargerHistorique()
  }, [])

  const nomJob = (jobId: number): string => jobs.find((j) => j.id === jobId)?.nom ?? `Job #${jobId}`

  return (
    <div className="grid grid-cols-2 gap-6 p-8">
      <section>
        <h1 className="mb-4 text-2xl font-semibold text-slate-100">Historique</h1>
        <div className="flex flex-col gap-2">
          {runsRecents.map((run) => (
            <button
              key={run.id}
              onClick={() => void chargerJournal(run.id)}
              className={`flex flex-col gap-1 rounded-lg border p-3 text-left ${
                runIdJournal === run.id ? 'border-blue-600 bg-blue-600/10' : 'border-slate-800 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-100">{nomJob(run.jobId)}</span>
                <StatutBadge statut={run.statut} />
              </div>
              <div className="text-xs text-slate-500">{formaterDate(run.demarreLe)}</div>
              <div className="text-xs text-slate-400">
                {run.fichiersCopies} copie(s) · {run.fichiersMisAJour} mise(s) a jour · {run.fichiersSupprimes} suppression(s) ·{' '}
                {run.fichiersEnErreur} erreur(s) · {formaterOctets(run.octetsTransferes)}
              </div>
              {run.message && <div className="text-xs text-amber-400">{run.message}</div>}
            </button>
          ))}
          {runsRecents.length === 0 && <div className="text-sm text-slate-600">Aucun historique pour le moment.</div>}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-200">Journal detaille</h2>
        {runIdJournal === null ? (
          <div className="text-sm text-slate-600">Selectionnez une sauvegarde a gauche pour voir son journal.</div>
        ) : (
          <div className="flex max-h-[70vh] flex-col gap-1 overflow-y-auto rounded-lg border border-slate-800 p-2 font-mono text-xs">
            {journalCourant.map((entree) => (
              <div key={entree.id} className={`flex gap-2 px-2 py-1 ${couleurNiveau(entree.niveau)}`}>
                <span className="shrink-0 text-slate-600">{new Date(entree.horodatage).toLocaleTimeString('fr-FR')}</span>
                <span>{entree.message}</span>
                {entree.chemin && <span className="truncate text-slate-600">{entree.chemin}</span>}
              </div>
            ))}
            {journalCourant.length === 0 && <div className="p-2 text-slate-600">Aucune entree de journal.</div>}
          </div>
        )}
      </section>
    </div>
  )
}

function couleurNiveau(niveau: string): string {
  switch (niveau) {
    case 'erreur':
      return 'text-red-400'
    case 'avertissement':
      return 'text-amber-400'
    default:
      return 'text-slate-300'
  }
}
