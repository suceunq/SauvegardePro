import { useEffect, useState } from 'react'
import type { RunFile } from '@shared/types'
import { RotateCcw, Search } from 'lucide-react'
import { useAppStore } from '../state/store'
import StatutBadge from '../components/StatutBadge'
import { formaterOctets } from '../components/ProgressBar'
import { useI18n } from '../i18n'

export default function HistoryPage() {
  const { t, locale } = useI18n()
  const [fichiers, setFichiers] = useState<RunFile[]>([])
  const [recherche, setRecherche] = useState('')
  const [selection, setSelection] = useState<string[]>([])
  const [restauration, setRestauration] = useState<string | null>(null)
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

  const nomJob = (jobId: number): string => jobs.find((j) => j.id === jobId)?.nom ?? t('common.jobNumber', { id: jobId })

  const ouvrirRun = async (runId: number) => {
    await chargerJournal(runId)
    const liste = await window.sauvegardePro.runs.fichiers(runId)
    setFichiers(liste.filter((f) => f.etat === 'done' || f.etat === 'copied'))
    setSelection([])
    setRestauration(null)
  }

  const restaurer = async () => {
    if (runIdJournal === null) return
    const destination = await window.sauvegardePro.discovery.choisirDossier()
    if (!destination) return
    setRestauration(t('history.restoring'))
    const resultat = await window.sauvegardePro.runs.restaurer(runIdJournal, destination, selection.length ? selection : undefined)
    setRestauration(t('history.restoreResult', { restored: resultat.fichiersRestaures, errors: resultat.erreurs.length }))
  }

  const visibles = fichiers.filter((f) => f.cheminSource.toLowerCase().includes(recherche.toLowerCase()))

  return (
    <div className="grid grid-cols-2 gap-6 p-8">
      <section>
        <h1 className="mb-4 text-2xl font-semibold text-slate-100">{t('nav.history')}</h1>
        <div className="flex flex-col gap-2">
          {runsRecents.map((run) => (
            <button
              key={run.id}
              onClick={() => void ouvrirRun(run.id)}
              className={`flex flex-col gap-1 rounded-lg border p-3 text-left ${
                runIdJournal === run.id ? 'border-blue-600 bg-blue-600/10' : 'border-slate-800 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-100">{nomJob(run.jobId)}</span>
                <StatutBadge statut={run.statut} />
              </div>
              <div className="text-xs text-slate-500">{new Date(run.demarreLe).toLocaleString(locale)}</div>
              <div className="text-xs text-slate-400">
                {t('history.summary', { copied: run.fichiersCopies, updated: run.fichiersMisAJour, deleted: run.fichiersSupprimes, errors: run.fichiersEnErreur, size: formaterOctets(run.octetsTransferes, locale) })}
              </div>
              {run.message && <div className="text-xs text-amber-400">{run.message}</div>}
            </button>
          ))}
          {runsRecents.length === 0 && <div className="text-sm text-slate-600">{t('history.empty')}</div>}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-200">{t('history.restoreTitle')}</h2>{runIdJournal !== null && <button onClick={() => void restaurer()} className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500"><RotateCcw size={16} />{selection.length ? t('history.restoreSelected', { count: selection.length }) : t('history.restoreAll')}</button>}</div>
        {runIdJournal === null ? (
          <div className="text-sm text-slate-600">{t('history.selectRun')}</div>
        ) : (
          <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3"><Search size={15} className="text-slate-500"/><input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={t('history.search')} className="w-full bg-transparent py-2 text-sm outline-none"/></div>
            <div className="flex max-h-64 flex-col overflow-y-auto rounded-lg border border-slate-800 p-2 text-xs">
              {visibles.map((f) => <label key={f.cheminSource} className="flex items-center gap-2 border-b border-slate-900 px-2 py-2 hover:bg-slate-900"><input type="checkbox" checked={selection.includes(f.cheminSource)} onChange={() => setSelection((s) => s.includes(f.cheminSource) ? s.filter((x) => x !== f.cheminSource) : [...s, f.cheminSource])}/><span className="truncate">{f.cheminSource}</span></label>)}
              {visibles.length === 0 && <span className="p-2 text-slate-600">{t('history.noFiles')}</span>}
            </div>
            {restauration && <div className="rounded-lg border border-blue-800 bg-blue-950/40 p-3 text-sm text-blue-200">{restauration}</div>}
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-800 p-2 font-mono text-xs">
            {journalCourant.map((entree) => (
              <div key={entree.id} className={`flex gap-2 px-2 py-1 ${couleurNiveau(entree.niveau)}`}>
                <span className="shrink-0 text-slate-600">{new Date(entree.horodatage).toLocaleTimeString(locale)}</span>
                <span>{entree.message}</span>
                {entree.chemin && <span className="truncate text-slate-600">{entree.chemin}</span>}
              </div>
            ))}
            {journalCourant.length === 0 && <div className="p-2 text-slate-600">{t('history.noEntries')}</div>}
            </div>
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
