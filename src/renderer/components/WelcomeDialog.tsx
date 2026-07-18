import { useEffect } from 'react'
import { ExternalLink, HeartHandshake, ShieldCheck, X } from 'lucide-react'
import { estUrlPaypalValide } from '@shared/donation'
import { useAppStore } from '../state/store'
import { useI18n } from '../i18n'

export default function WelcomeDialog({ ouvert, fermer }: { ouvert: boolean; fermer: () => void }) {
  const { t } = useI18n()
  const parametres = useAppStore((etat) => etat.parametres)
  const enregistrerParametres = useAppStore((etat) => etat.enregistrerParametres)
  const urlPaypal = parametres?.urlDonPaypal.trim() ?? ''
  const donDisponible = estUrlPaypalValide(urlPaypal)

  useEffect(() => {
    if (!ouvert) return
    const fermerAvecEchap = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') fermer()
    }
    window.addEventListener('keydown', fermerAvecEchap)
    return () => window.removeEventListener('keydown', fermerAvecEchap)
  }, [ouvert, fermer])

  if (!ouvert) return null

  const changerAffichageAutomatique = async (nePlusAfficher: boolean): Promise<void> => {
    if (!parametres) return
    await enregistrerParametres({ ...parametres, afficherBienvenueAuDemarrage: !nePlusAfficher })
  }

  const faireUnDon = (): void => {
    if (!donDisponible) return
    window.open(urlPaypal, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm"
      onClick={fermer}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-blue-950/40"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="relative overflow-hidden border-b border-slate-800 px-6 py-6">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-slate-950 to-cyan-500/10" />
          <div className="relative flex items-start gap-4">
            <div className="metal-logo flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
              <ShieldCheck size={28} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">{t('welcome.badge')}</span>
              <h2 id="welcome-title" className="mt-1 text-2xl font-semibold text-white">{t('welcome.title')}</h2>
              <p className="mt-1 text-sm text-slate-400">{t('welcome.subtitle')}</p>
            </div>
            <button
              onClick={fermer}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white"
              aria-label={t('common.close')}
            >
              <X size={19} />
            </button>
          </div>
        </header>

        <div className="space-y-5 px-6 py-5">
          <p className="text-sm leading-6 text-slate-300">{t('welcome.description')}</p>
          <p className="rounded-xl border border-blue-900/70 bg-blue-950/30 px-4 py-3 text-sm leading-6 text-blue-100">
            {t('welcome.thanks')}
          </p>
          <div className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <HeartHandshake size={24} className="mt-0.5 shrink-0 text-rose-400" />
            <div>
              <h3 className="font-medium text-slate-100">{t('welcome.supportTitle')}</h3>
              <p className="mt-1 text-sm leading-5 text-slate-400">{t('welcome.supportBody')}</p>
              {!donDisponible && <p className="mt-2 text-xs text-amber-400">{t('welcome.donationUnavailable')}</p>}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={!(parametres?.afficherBienvenueAuDemarrage ?? true)}
              onChange={(event) => void changerAffichageAutomatique(event.target.checked)}
            />
            {t('welcome.dontShowAgain')}
          </label>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-800 bg-slate-900/40 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            onClick={fermer}
            className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            {t('welcome.later')}
          </button>
          <button
            onClick={faireUnDon}
            disabled={!donDisponible}
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/40 hover:from-blue-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <HeartHandshake size={17} /> {t('welcome.donate')} <ExternalLink size={14} />
          </button>
        </footer>
      </section>
    </div>
  )
}
