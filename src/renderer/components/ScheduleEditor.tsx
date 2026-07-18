import type { FrequencePlanification, Planification, TypeDeclenchement } from '@shared/types'
import { useI18n } from '../i18n'
import type { CleTraduction } from '@shared/i18n'

const JOURS: CleTraduction[] = ['day.sun', 'day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat']
const LIBELLE_TYPE: Record<TypeDeclenchement, CleTraduction> = { manuel: 'schedule.manual', planifie: 'schedule.scheduled', demarrage: 'schedule.startup' }

interface Props {
  valeur: Planification
  onChange: (p: Planification) => void
}

export default function ScheduleEditor({ valeur, onChange }: Props) {
  const { t } = useI18n()
  const toggleJour = (jour: number): void => {
    const jours = new Set(valeur.joursSemaine ?? [1])
    if (jours.has(jour)) jours.delete(jour)
    else jours.add(jour)
    onChange({ ...valeur, joursSemaine: [...jours].sort() })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {(Object.keys(LIBELLE_TYPE) as TypeDeclenchement[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange({ ...valeur, type })}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              valeur.type === type ? 'bg-blue-600 text-white' : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {t(LIBELLE_TYPE[type])}
          </button>
        ))}
      </div>

      {valeur.type === 'planifie' && (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-800 p-3">
          <select
            value={valeur.frequence ?? 'quotidienne'}
            onChange={(e) => onChange({ ...valeur, frequence: e.target.value as FrequencePlanification })}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
          >
            <option value="quotidienne">{t('schedule.daily')}</option>
            <option value="hebdomadaire">{t('schedule.weekly')}</option>
            <option value="intervalle">{t('schedule.interval')}</option>
          </select>

          {(valeur.frequence ?? 'quotidienne') !== 'intervalle' && (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              {t('schedule.time')}
              <input
                type="time"
                value={valeur.heure ?? '02:00'}
                onChange={(e) => onChange({ ...valeur, heure: e.target.value })}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200"
              />
            </label>
          )}

          {valeur.frequence === 'hebdomadaire' && (
            <div className="flex gap-1">
              {JOURS.map((nom, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleJour(i)}
                  className={`h-8 w-10 rounded-lg text-xs font-medium ${
                    (valeur.joursSemaine ?? [1]).includes(i)
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {t(nom)}
                </button>
              ))}
            </div>
          )}

          {valeur.frequence === 'intervalle' && (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              {t('schedule.every')}
              <input
                type="number"
                min={5}
                value={valeur.intervalleMinutes ?? 60}
                onChange={(e) => onChange({ ...valeur, intervalleMinutes: Number(e.target.value) })}
                className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200"
              />
              {t('common.minutes')}
            </label>
          )}
        </div>
      )}
    </div>
  )
}
