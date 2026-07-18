import { useAppStore } from '../state/store'
import { useI18n } from '../i18n'

export default function AboutDialog({ ouvert, fermer }: { ouvert: boolean; fermer: () => void }) {
  const { t } = useI18n()
  const version = useAppStore((e) => e.miseAJour?.versionActuelle)
  if (!ouvert) return null
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={fermer}>
    <div className="w-[480px] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <header className="flex items-center justify-between border-b border-slate-700 px-5 py-4"><div><h2 className="font-semibold">{t('about.title')}</h2><p className="text-xs text-slate-400">{t('common.version', { version: version ?? '…' })}</p></div><button onClick={fermer}>✕</button></header>
      <div className="space-y-4 p-5 text-sm text-slate-300"><p>{t('about.description')}</p><section><h3 className="mb-1 font-semibold text-white">{t('about.credits')}</h3><p>{t('about.design')}</p><p>{t('about.builtWith')}</p></section><p className="border-t border-slate-700 pt-3 text-xs text-slate-500">{t('about.createdBy')}</p></div>
      <footer className="flex justify-end border-t border-slate-700 px-5 py-4"><button className="rounded border border-slate-600 px-4 py-2" onClick={fermer}>{t('common.close')}</button></footer>
    </div>
  </div>
}
