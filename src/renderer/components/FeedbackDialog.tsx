import { useState } from 'react'

const EMAIL = 'bob62138@gmail.com'
export default function FeedbackDialog({ ouvert, fermer }: { ouvert: boolean; fermer: () => void }) {
  const [sujet, setSujet] = useState('SauvegardePro - Suggestion / Correction')
  const [message, setMessage] = useState('')
  const [copie, setCopie] = useState(false)
  if (!ouvert) return null
  const corps = `${message}\n\nApplication : SauvegardePro`
  const envoyer = () => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(EMAIL)}&su=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`, '_blank')
  const copier = async () => { await navigator.clipboard.writeText(`À : ${EMAIL}\nSujet : ${sujet}\n\n${corps}`); setCopie(true) }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={fermer}><section className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-950 shadow-2xl" onClick={(e) => e.stopPropagation()}>
    <header className="flex items-center justify-between border-b border-slate-700 px-5 py-4"><div><h2 className="font-semibold">Suggestion / Correction</h2><p className="text-xs text-slate-400">Une idée ou un problème ? Écrivez-nous.</p></div><button onClick={fermer}>✕</button></header>
    <div className="grid gap-4 p-5"><label className="grid gap-1 text-xs text-slate-400">Sujet<input className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-white" value={sujet} onChange={(e) => setSujet(e.target.value)} /></label><label className="grid gap-1 text-xs text-slate-400">Message<textarea rows={7} className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-white" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Décrivez votre suggestion ou les étapes du problème…" /></label>{copie && <p className="text-xs text-emerald-400">Adresse et message copiés.</p>}</div>
    <footer className="flex justify-end gap-2 border-t border-slate-700 p-4"><button className="rounded-lg border border-slate-600 px-4 py-2" onClick={() => void copier()}>Copier</button><button className="rounded-lg bg-blue-600 px-4 py-2 font-semibold disabled:opacity-40" disabled={!message.trim()} onClick={envoyer}>Envoyer</button></footer>
  </section></div>
}
