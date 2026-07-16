import { AlertTriangle } from 'lucide-react'
import { useAppStore } from '../state/store'

export default function ConfirmationMiroirModal() {
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
          <h2 className="text-lg font-semibold">Confirmation requise</h2>
        </div>
        <p className="text-sm text-slate-300">
          La synchronisation miroir « {job?.nom ?? `Job #${demande.jobId}`} » prevoit de supprimer{' '}
          <span className="font-semibold text-amber-300">{demande.suppressionsPrevues} fichier(s)</span> du stockage de
          destination ({demande.pourcentage}% des fichiers connus). Ce seuil de securite empeche toute suppression
          automatique massive.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Verifiez que la source est bien accessible et complete avant de confirmer. Les copies et mises a jour ont deja ete
          appliquees ; seules les suppressions sont en attente.
        </p>
        {demande.apercuSuppressions.length > 0 && (
          <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-400">
            {demande.apercuSuppressions.map((chemin) => (
              <div key={chemin} className="truncate py-0.5">{chemin}</div>
            ))}
            {demande.suppressionsPrevues > demande.apercuSuppressions.length && (
              <div className="pt-1 text-slate-500">
                … et {demande.suppressionsPrevues - demande.apercuSuppressions.length} autre(s)
              </div>
            )}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => setDemandes((etat) => ({ demandesConfirmation: etat.demandesConfirmation.filter((d) => d.runId !== demande.runId) }))}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Ignorer pour l'instant
          </button>
          <button
            onClick={() => void confirmerMiroir(demande.jobId, demande.runId)}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
          >
            Confirmer les suppressions
          </button>
        </div>
      </div>
    </div>
  )
}
