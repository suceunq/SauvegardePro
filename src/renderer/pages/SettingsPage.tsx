import { useEffect, useState } from 'react'
import { CheckCircle2, DownloadCloud, Loader2, RefreshCw, RotateCw, Save, TriangleAlert } from 'lucide-react'
import { useAppStore } from '../state/store'
import type { Parametres } from '@shared/types'
import { PARAMETRES_DEFAUT } from '@shared/types'

export default function SettingsPage() {
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

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Parametres</h1>
        <p className="text-sm text-slate-400">Preferences generales de l'application.</p>
      </div>

      <Section titre="Performance">
        <ChampNombre
          libelle="Limite de debit par defaut (Ko/s, 0 = illimite)"
          valeur={local.limiteDebitKoS ?? 0}
          onChange={(v) => setLocal({ ...local, limiteDebitKoS: v > 0 ? v : null })}
        />
        <ChampNombre
          libelle="Nombre de versions a conserver par defaut"
          valeur={local.nombreVersionsParDefaut}
          onChange={(v) => setLocal({ ...local, nombreVersionsParDefaut: Math.max(1, v) })}
        />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={local.verifierIntegriteParDefaut}
            onChange={(e) => setLocal({ ...local, verifierIntegriteParDefaut: e.target.checked })}
          />
          Verifier l'integrite des fichiers par defaut
        </label>
      </Section>

      <Section titre="Notifications">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={local.notifications.surSucces}
            onChange={(e) => setLocal({ ...local, notifications: { ...local.notifications, surSucces: e.target.checked } })}
          />
          Notifier en cas de succes
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={local.notifications.surEchec}
            onChange={(e) => setLocal({ ...local, notifications: { ...local.notifications, surEchec: e.target.checked } })}
          />
          Notifier en cas d'echec
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={local.notifications.surAvertissement}
            onChange={(e) => setLocal({ ...local, notifications: { ...local.notifications, surAvertissement: e.target.checked } })}
          />
          Notifier en cas d'avertissement
        </label>
      </Section>

      <Section titre="Application">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={local.demarrerAvecWindows}
            onChange={(e) => setLocal({ ...local, demarrerAvecWindows: e.target.checked })}
          />
          Demarrer SauvegardePro avec Windows
        </label>
        <ChampNombre
          libelle="Conserver le journal pendant (jours)"
          valeur={local.conserverJournauxJours}
          onChange={(v) => setLocal({ ...local, conserverJournauxJours: Math.max(1, v) })}
        />
      </Section>

      <SectionMiseAJour />

      <div className="flex items-center gap-3">
        <button
          onClick={() => void enregistrer()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          <Save size={16} /> Enregistrer
        </button>
        {enregistre && <span className="text-sm text-emerald-400">Parametres enregistres.</span>}
      </div>
    </div>
  )
}

function SectionMiseAJour() {
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
    <Section titre="Mises a jour">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-300">
          Version installee : <span className="font-mono text-slate-100">{miseAJour?.versionActuelle ?? '...'}</span>
        </span>
        {(phase === 'inactif' || phase === 'a_jour' || phase === 'erreur') && (
          <button
            onClick={() => void verifierMiseAJour()}
            className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            <RefreshCw size={15} /> Rechercher une mise a jour
          </button>
        )}
      </div>

      {phase === 'indisponible_dev' && (
        <p className="text-sm text-slate-500">
          Recherche de mise a jour indisponible en mode developpement (necessite une version installee via
          l'installateur).
        </p>
      )}

      {phase === 'verification' && (
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={15} className="animate-spin" /> Recherche en cours...
        </p>
      )}

      {phase === 'a_jour' && (
        <p className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 size={15} /> SauvegardePro est a jour.
        </p>
      )}

      {phase === 'disponible' && (
        <div className="flex flex-col gap-2 rounded-lg border border-blue-800 bg-blue-950/40 p-3">
          <p className="text-sm text-blue-200">
            Version {miseAJour?.versionDisponible} disponible sur GitHub.
          </p>
          {miseAJour?.notesVersion && (
            <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs text-slate-400">
              {miseAJour.notesVersion}
            </pre>
          )}
          <button
            onClick={() => void telechargerMiseAJour()}
            className="flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            <DownloadCloud size={15} /> Telecharger la mise a jour
          </button>
        </div>
      )}

      {phase === 'telechargement' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-slate-300">Telechargement en cours...</p>
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
            Version {miseAJour?.versionDisponible} prete. Redemarrage necessaire pour l'installer.
          </span>
          <button
            onClick={() => void installerMiseAJour()}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            <RotateCw size={15} /> Installer et redemarrer
          </button>
        </div>
      )}

      {phase === 'erreur' && (
        <p className="flex items-center gap-2 text-sm text-red-400">
          <TriangleAlert size={15} /> {miseAJour?.message ?? 'Erreur lors de la verification.'}
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
