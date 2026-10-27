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
  const ratio =
    props.fichiersTotal > 0
      ? props.fichiersTraites / props.fichiersTotal
      : props.octetsTotal > 0
        ? props.octetsTransferes / props.octetsTotal
        : 0
  const pourcentage = Math.max(0, Math.min(100, Math.round(ratio * 100)))
  const libelle = props.fichierCourant ?? libellePhase(props.phase, t)

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs text-slate-400">
        <span className="truncate" title={libelle}>{libelle}</span>
        <span className="font-medium tabular-nums text-slate-200">{pourcentage}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={libelle}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pourcentage}
        className="progress-track h-2 w-full overflow-hidden rounded-full"
      >
        <div className="progress-fill h-full rounded-full" style={{ width: `${pourcentage}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums text-slate-500">
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
