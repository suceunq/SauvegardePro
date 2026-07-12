import { useAppStore } from '../state/store'

export default function UpdateDialog({ ouvert, fermer }: { ouvert: boolean; fermer: () => void }) {
  const etat = useAppStore((e) => e.miseAJour)
  const telecharger = useAppStore((e) => e.telechargerMiseAJour)
  const installer = useAppStore((e) => e.installerMiseAJour)
  if (!ouvert || !etat) return null
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={fermer}>
    <div className="w-[460px] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <header className="flex items-center justify-between border-b border-slate-700 px-5 py-4"><h2 className="font-semibold">Mise à jour disponible</h2><button onClick={fermer}>✕</button></header>
      <div className="space-y-4 p-5 text-sm">
        <p className="text-slate-400">Version {etat.versionDisponible} — vous utilisez la {etat.versionActuelle}</p>
        {etat.notesVersion && <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-700 bg-slate-950 p-3 font-sans text-slate-300">{etat.notesVersion}</pre>}
        {etat.phase === 'telechargement' && <div><div className="h-2 overflow-hidden rounded bg-slate-700"><div className="h-full bg-blue-500" style={{ width: `${etat.progressionPourcent ?? 0}%` }} /></div><p className="mt-1 text-xs text-slate-400">{etat.progressionPourcent ?? 0}%</p></div>}
        {etat.message && <p className="text-red-400">{etat.message}</p>}
      </div>
      <footer className="flex justify-end gap-2 border-t border-slate-700 px-5 py-4"><button className="rounded border border-slate-600 px-4 py-2" onClick={fermer}>Plus tard</button>{etat.phase === 'disponible' && <button className="rounded bg-blue-600 px-4 py-2" onClick={() => void telecharger()}>Télécharger</button>}{etat.phase === 'pret' && <button className="rounded bg-blue-600 px-4 py-2" onClick={() => void installer()}>Installer et redémarrer</button>}</footer>
    </div>
  </div>
}
