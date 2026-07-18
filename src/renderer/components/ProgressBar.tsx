import { useI18n } from '../i18n'

export function formaterOctets(octets: number, locale = 'fr-FR'): string {
  if (!Number.isFinite(octets) || octets <= 0) return '0 B'
  const unites = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  let valeur = octets
  let unite = 0
  while (valeur >= 1024 && unite < unites.length - 1) {
    valeur /= 1024
    unite++
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: unite === 0 ? 0 : 1 }).format(valeur)} ${unites[unite]}`
}

interface ProgressBarProps {
  fichiersTraites: number
  fichiersTotal: number
  octetsTransferes: number
  octetsTotal: number
  vitesseOctetsParSeconde: number
  phase: string
  fichierCourant: string | null
}

export default function ProgressBar(props: ProgressBarProps) {
  const { t, locale } = useI18n()
  const pourcentage = props.fichiersTotal > 0 ? Math.min(100, Math.round((props.fichiersTraites / props.fichiersTotal) * 100)) : 0

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span className="truncate">{props.fichierCourant ?? libellePhase(props.phase, t)}</span>
        <span>{pourcentage}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pourcentage}%` }} />
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          {t('progress.files', { done: props.fichiersTraites, total: props.fichiersTotal })}
        </span>
        <span>
          {formaterOctets(props.octetsTransferes, locale)} · {formaterOctets(props.vitesseOctetsParSeconde, locale)}/s
        </span>
      </div>
    </div>
  )
}

function libellePhase(phase: string, t: ReturnType<typeof useI18n>['t']): string {
  switch (phase) {
    case 'analyse':
      return t('phase.analysis')
    case 'copie':
      return t('phase.copy')
    case 'verification':
      return t('phase.verify')
    case 'suppression':
      return t('phase.delete')
    case 'termine':
      return t('phase.done')
    default:
      return phase
  }
}
