import { useEffect, useState } from 'react'
import { FolderPlus, X, Save, HardDrive, Wifi, Server } from 'lucide-react'
import { useAppStore } from '../state/store'
import ScheduleEditor from '../components/ScheduleEditor'
import ExclusionEditor from '../components/ExclusionEditor'
import { PARAMETRES_AVANCES_DEFAUT } from '@shared/types'
import type { ModeSauvegarde, NouveauJob } from '@shared/types'
import type { CleTraduction } from '@shared/i18n'
import { useI18n } from '../i18n'

const MODES: Array<{ valeur: ModeSauvegarde; titre: CleTraduction; description: CleTraduction }> = [
  {
    valeur: 'complete',
    titre: 'mode.complete',
    description: 'mode.complete.description'
  },
  {
    valeur: 'incrementielle',
    titre: 'mode.incremental',
    description: 'mode.incremental.description'
  },
  {
    valeur: 'miroir',
    titre: 'mode.mirror',
    description: 'mode.mirror.description'
  }
]

function jobParDefaut(): NouveauJob {
  return {
    nom: '',
    sources: [],
    destination: '',
    mode: 'incrementielle',
    planification: { type: 'manuel' },
    exclusions: { extensions: [], dossiers: [], fichiers: [] },
    parametres: { ...PARAMETRES_AVANCES_DEFAUT },
    actif: true
  }
}

export default function NewJobPage() {
  const { t } = useI18n()
  const jobEnEdition = useAppStore((e) => e.jobEnEdition)
  const lecteurs = useAppStore((e) => e.lecteurs)
  const appareilsReseau = useAppStore((e) => e.appareilsReseau)
  const emplacementsReseau = useAppStore((e) => e.emplacementsReseau)
  const chargerLecteurs = useAppStore((e) => e.chargerLecteurs)
  const chargerReseau = useAppStore((e) => e.chargerReseau)
  const chargerEmplacements = useAppStore((e) => e.chargerEmplacements)
  const ajouterEmplacement = useAppStore((e) => e.ajouterEmplacement)
  const choisirDossier = useAppStore((e) => e.choisirDossier)
  const creerJob = useAppStore((e) => e.creerJob)
  const mettreAJourJob = useAppStore((e) => e.mettreAJourJob)
  const allerA = useAppStore((e) => e.allerA)

  const [job, setJob] = useState<NouveauJob>(jobEnEdition ?? jobParDefaut())
  const [enregistrement, setEnregistrement] = useState(false)

  useEffect(() => {
    setJob(jobEnEdition ?? jobParDefaut())
  }, [jobEnEdition])

  useEffect(() => {
    void chargerLecteurs()
    void chargerReseau()
    void chargerEmplacements()
  }, [])

  const ajouterSourceDossier = async (): Promise<void> => {
    const dossier = await choisirDossier()
    if (dossier && !job.sources.includes(dossier)) setJob({ ...job, sources: [...job.sources, dossier] })
  }

  const ajouterSourceLecteur = (identifiant: string): void => {
    if (!job.sources.includes(identifiant)) setJob({ ...job, sources: [...job.sources, identifiant] })
  }

  const retirerSource = (source: string): void => {
    setJob({ ...job, sources: job.sources.filter((s) => s !== source) })
  }

  const choisirDestinationDossier = async (): Promise<void> => {
    const dossier = await choisirDossier()
    if (dossier) setJob({ ...job, destination: dossier })
  }

  const ajouterEtUtiliserEmplacement = async (): Promise<void> => {
    const chemin = prompt(t('job.networkPathPrompt'))
    if (!chemin) return
    const nom = prompt(t('job.networkNamePrompt'), chemin) ?? chemin
    await ajouterEmplacement(nom, chemin)
    setJob({ ...job, destination: chemin })
  }

  const enregistrer = async (): Promise<void> => {
    if (!job.nom.trim() || job.sources.length === 0 || !job.destination.trim()) {
      alert(t('job.missingFields'))
      return
    }
    setEnregistrement(true)
    try {
      if (jobEnEdition) await mettreAJourJob(jobEnEdition.id, job)
      else await creerJob(job)
      allerA('sauvegardes')
    } finally {
      setEnregistrement(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">{jobEnEdition ? t('job.editTitle') : t('job.newTitle')}</h1>
        <p className="text-sm text-slate-400">{t('job.subtitle')}</p>
      </div>

      <Section titre={t('job.name')}>
        <input
          type="text"
          value={job.nom}
          onChange={(e) => setJob({ ...job, nom: e.target.value })}
          placeholder={t('job.namePlaceholder')}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"
        />
      </Section>

      <Section titre={t('job.sources')}>
        <div className="flex flex-wrap gap-2">
          {job.sources.map((source) => (
            <span key={source} className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-200">
              {source}
              <button onClick={() => retirerSource(source)} className="text-slate-500 hover:text-red-400">
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void ajouterSourceDossier()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            <FolderPlus size={14} /> {t('job.addFolder')}
          </button>
          {lecteurs.map((l) => (
            <button
              key={l.identifiant}
              onClick={() => ajouterSourceLecteur(l.identifiant)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
            >
              <HardDrive size={12} /> {l.identifiant}
            </button>
          ))}
        </div>
      </Section>

      <Section titre={t('job.destination')}>
        <div className="flex gap-2">
          <input
            type="text"
            value={job.destination}
            onChange={(e) => setJob({ ...job, destination: e.target.value })}
            placeholder={t('job.destinationPlaceholder')}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"
          />
          <button
            onClick={() => void choisirDestinationDossier()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            <FolderPlus size={14} /> {t('common.browse')}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {lecteurs
            .filter((l) => l.type === 'amovible' || l.type === 'reseau')
            .map((l) => (
              <button
                key={l.identifiant}
                onClick={() => setJob({ ...job, destination: l.identifiant })}
                className="flex items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
              >
                <HardDrive size={12} /> {l.nom} ({l.identifiant})
              </button>
            ))}
          {appareilsReseau.map((a) => (
            <button
              key={a.adresseIp}
              onClick={() => setJob({ ...job, destination: `\\\\${a.adresseIp}` })}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
            >
              <Wifi size={12} /> {a.nom}
            </button>
          ))}
          {emplacementsReseau.map((e) => (
            <button
              key={e.id}
              onClick={() => setJob({ ...job, destination: e.chemin })}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
            >
              <Server size={12} /> {e.nom}
            </button>
          ))}
          <button onClick={() => void ajouterEtUtiliserEmplacement()} className="text-xs text-blue-400 hover:underline">
            + {t('job.addNetwork')}
          </button>
        </div>
      </Section>

      <Section titre={t('job.mode')}>
        <div className="flex flex-col gap-2">
          {MODES.map((m) => (
            <label
              key={m.valeur}
              className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 ${
                job.mode === m.valeur ? 'border-blue-600 bg-blue-600/10' : 'border-slate-800 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <input type="radio" checked={job.mode === m.valeur} onChange={() => setJob({ ...job, mode: m.valeur })} />
                <span className="font-medium text-slate-100">{t(m.titre)}</span>
              </div>
              <span className="pl-6 text-xs text-slate-400">{t(m.description)}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section titre={t('job.schedule')}>
        <ScheduleEditor valeur={job.planification} onChange={(planification) => setJob({ ...job, planification })} />
      </Section>

      <Section titre={t('job.exclusions')}>
        <ExclusionEditor valeur={job.exclusions} onChange={(exclusions) => setJob({ ...job, exclusions })} />
      </Section>

      <Section titre={t('job.advanced')}>
        <div className="grid grid-cols-2 gap-4">
          <ChampNombre
            libelle={t('job.bandwidth')}
            valeur={job.parametres.limiteDebitKoS ?? 0}
            onChange={(v) => setJob({ ...job, parametres: { ...job.parametres, limiteDebitKoS: v > 0 ? v : null } })}
          />
          <ChampNombre
            libelle={t('job.versions')}
            valeur={job.parametres.nombreVersionsAConserver}
            onChange={(v) => setJob({ ...job, parametres: { ...job.parametres, nombreVersionsAConserver: Math.max(1, v) } })}
          />
          <ChampNombre
            libelle={t('job.retries')}
            valeur={job.parametres.nombreTentatives}
            onChange={(v) => setJob({ ...job, parametres: { ...job.parametres, nombreTentatives: Math.max(0, v) } })}
          />
          {job.mode === 'miroir' && (
            <>
              <ChampNombre
                libelle={t('job.mirrorPercent')}
                valeur={job.parametres.seuilSuppressionPourcent}
                onChange={(v) => setJob({ ...job, parametres: { ...job.parametres, seuilSuppressionPourcent: v } })}
              />
              <ChampNombre
                libelle={t('job.mirrorFiles')}
                valeur={job.parametres.seuilSuppressionAbsolu}
                onChange={(v) => setJob({ ...job, parametres: { ...job.parametres, seuilSuppressionAbsolu: v } })}
              />
            </>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={job.parametres.verifierIntegrite}
            onChange={(e) => setJob({ ...job, parametres: { ...job.parametres, verifierIntegrite: e.target.checked } })}
          />
          {t('job.verifyIntegrity')}
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={job.actif} onChange={(e) => setJob({ ...job, actif: e.target.checked })} />
          {t('job.active')}
        </label>
      </Section>

      <div className="flex justify-end gap-3 pb-8">
        <button onClick={() => allerA('sauvegardes')} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-800">
          {t('common.cancel')}
        </button>
        <button
          onClick={() => void enregistrer()}
          disabled={enregistrement}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          <Save size={16} /> {t('common.save')}
        </button>
      </div>
    </div>
  )
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
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
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
      />
    </label>
  )
}
