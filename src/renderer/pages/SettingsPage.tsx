import { useEffect, useState } from 'react'
import { CheckCircle2, DownloadCloud, Loader2, RefreshCw, RotateCw, Save, TriangleAlert } from 'lucide-react'
import { useAppStore } from '../state/store'
import { formaterNotesVersion } from '../lib/releaseNotes'
import type { Parametres } from '@shared/types'
import { PARAMETRES_DEFAUT } from '@shared/types'
import { useI18n } from '../i18n'

export default function SettingsPage() {
  const { t } = useI18n()
  const parametres = useAppStore((e) => e.parametres)
  const chargerParametres = useAppStore((e) => e.chargerParametres)
  const enregistrerParametres = useAppStore((e) => e.enregistrerParametres)

  const [local, setLocal] = useState<Parametres>(parametres ?? PARAMETRES_DEFAUT)
  const [enregistre, setEnregistre] = useState(false)

  useEffect(() => {
    void chargerParametres()
  }, [])

  useEffect(() => {
    if (parametres) setLocal(parametres)
  }, [parametres])

  const enregistrer = async (): Promise<void> => {
    await enregistrerParametres(local)
    setEnregistre(true)
    setTimeout(() => setEnregistre(false), 2000)
  }

  const changerLangue = (langue: Parametres['langue']): void => {
    const nouveauxParametres = { ...local, langue }
    setLocal(nouveauxParametres)
    // Apercu immediat ; le bouton Enregistrer persiste ensuite le choix.
    useAppStore.setState({ parametres: nouveauxParametres })
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">{t('nav.settings')}</h1>
        <p className="text-sm text-slate-400">{t('settings.subtitle')}</p>
      </div>

      <Section titre={t('settings.language')}>
        <select
          value={local.langue}
          onChange={(e) => changerLangue(e.target.value as Parametres['langue'])}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
        >
          <option value="auto">{t('settings.languageAuto')}</option>
          <option value="fr">Français</option>
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="de">Deutsch</option>
        </select>
        <p className="text-xs text-slate-500">{t('settings.languageHelp')}</p>
      </Section>

      <Section titre={t('settings.performance')}>
        <ChampNombre
          libelle={t('settings.defaultBandwidth')}
          valeur={local.limiteDebitKoS ?? 0}
          onChange={(v) => setLocal({ ...local, limiteDebitKoS: v > 0 ? v : null })}
        />
        <ChampNombre
          libelle={t('settings.defaultVersions')}
          valeur={local.nombreVersionsParDefaut}
          onChange={(v) => setLocal({ ...local, nombreVersionsParDefaut: Math.max(1, v) })}
        />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={local.verifierIntegriteParDefaut}
            onChange={(e) => setLocal({ ...local, verifierIntegriteParDefaut: e.target.checked })}
          />
          {t('settings.defaultIntegrity')}
        </label>
      </Section>

      <Section titre={t('settings.notifications')}>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={local.notifications.surSucces}
            onChange={(e) => setLocal({ ...local, notifications: { ...local.notifications, surSucces: e.target.checked } })}
          />
          {t('settings.notifySuccess')}
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={local.notifications.surEchec}
            onChange={(e) => setLocal({ ...local, notifications: { ...local.notifications, surEchec: e.target.checked } })}
          />
          {t('settings.notifyFailure')}
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={local.notifications.surAvertissement}
            onChange={(e) => setLocal({ ...local, notifications: { ...local.notifications, surAvertissement: e.target.checked } })}
          />
          {t('settings.notifyWarning')}
        </label>
      </Section>

      <Section titre={t('settings.application')}>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={local.demarrerAvecWindows}
            onChange={(e) => setLocal({ ...local, demarrerAvecWindows: e.target.checked })}
          />
          {t('settings.startWindows')}
        </label>
        <ChampNombre
          libelle={t('settings.keepLogs')}
          valeur={local.conserverJournauxJours}
          onChange={(v) => setLocal({ ...local, conserverJournauxJours: Math.max(1, v) })}
        />
      </Section>

      <Section titre={t('settings.supportProject')}>
        <p className="text-xs leading-5 text-slate-500">{t('settings.supportHelp')}</p>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={local.afficherBienvenueAuDemarrage}
            onChange={(e) => setLocal({ ...local, afficherBienvenueAuDemarrage: e.target.checked })}
          />
          {t('settings.showWelcome')}
        </label>
      </Section>

      <SectionMiseAJour />

      <div className="flex items-center gap-3">
        <button
          onClick={() => void enregistrer()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          <Save size={16} /> {t('common.save')}
        </button>
        {enregistre && <span className="text-sm text-emerald-400">{t('settings.saved')}</span>}
      </div>
    </div>
  )
}

function SectionMiseAJour() {
  const { t } = useI18n()
  const miseAJour = useAppStore((e) => e.miseAJour)
  const chargerEtatMiseAJour = useAppStore((e) => e.chargerEtatMiseAJour)
  const verifierMiseAJour = useAppStore((e) => e.verifierMiseAJour)
  const telechargerMiseAJour = useAppStore((e) => e.telechargerMiseAJour)
  const installerMiseAJour = useAppStore((e) => e.installerMiseAJour)

  useEffect(() => {
    void chargerEtatMiseAJour()
  }, [])

  const phase = miseAJour?.phase ?? 'inactif'

  return (
    <Section titre={t('settings.updates')}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-300">
          {t('settings.installedVersion', { version: miseAJour?.versionActuelle ?? '…' })}
        </span>
        {(phase === 'inactif' || phase === 'a_jour' || phase === 'erreur') && (
          <button
            onClick={() => void verifierMiseAJour()}
            className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            <RefreshCw size={15} /> {t('settings.checkUpdate')}
          </button>
        )}
      </div>

      {phase === 'indisponible_dev' && (
        <p className="text-sm text-slate-500">
          {t('settings.updateDev')}
        </p>
      )}

      {phase === 'verification' && (
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={15} className="animate-spin" /> {t('settings.checking')}
        </p>
      )}

      {phase === 'a_jour' && (
        <p className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 size={15} /> {t('settings.upToDate')}
        </p>
      )}

      {phase === 'disponible' && (
        <div className="flex flex-col gap-2 rounded-lg border border-blue-800 bg-blue-950/40 p-3">
          <p className="text-sm text-blue-200">
            {t('settings.available', { version: miseAJour?.versionDisponible ?? '' })}
          </p>
          {miseAJour?.notesVersion && (
            <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs text-slate-400">
              {formaterNotesVersion(miseAJour.notesVersion)}
            </pre>
          )}
          <button
            onClick={() => void telechargerMiseAJour()}
            className="flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            <DownloadCloud size={15} /> {t('settings.downloadUpdate')}
          </button>
        </div>
      )}

      {phase === 'telechargement' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-slate-300">{t('settings.downloading')}</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${miseAJour?.progressionPourcent ?? 0}%` }}
            />
          </div>
          <span className="text-xs text-slate-500">{miseAJour?.progressionPourcent ?? 0}%</span>
        </div>
      )}

      {phase === 'pret' && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-800 bg-emerald-950/40 p-3">
          <span className="text-sm text-emerald-300">
            {t('settings.ready', { version: miseAJour?.versionDisponible ?? '' })}
          </span>
          <button
            onClick={() => void installerMiseAJour()}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            <RotateCw size={15} /> {t('common.installRestart')}
          </button>
        </div>
      )}

      {phase === 'erreur' && (
        <p className="flex items-center gap-2 text-sm text-red-400">
          <TriangleAlert size={15} /> {miseAJour?.message ?? t('settings.updateError')}
        </p>
      )}
    </Section>
  )
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-800 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{titre}</h2>
      {children}
    </section>
  )
}

function ChampNombre({ libelle, valeur, onChange }: { libelle: string; valeur: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-slate-300">{libelle}</span>
      <input
        type="number"
        value={valeur}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-40 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
      />
    </label>
  )
}
