import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
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
