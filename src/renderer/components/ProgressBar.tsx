export function formaterOctets(octets: number): string {
  if (!Number.isFinite(octets) || octets <= 0) return '0 o'
  const unites = ['o', 'Ko', 'Mo', 'Go', 'To']
  let valeur = octets
  let unite = 0
  while (valeur >= 1024 && unite < unites.length - 1) {
    valeur /= 1024
    unite++
  }
  return `${valeur.toFixed(unite === 0 ? 0 : 1)} ${unites[unite]}`
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
  const pourcentage = props.fichiersTotal > 0 ? Math.min(100, Math.round((props.fichiersTraites / props.fichiersTotal) * 100)) : 0

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span className="truncate">{props.fichierCourant ?? libellePhase(props.phase)}</span>
        <span>{pourcentage}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pourcentage}%` }} />
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          {props.fichiersTraites} / {props.fichiersTotal} fichier(s)
        </span>
        <span>
          {formaterOctets(props.octetsTransferes)} · {formaterOctets(props.vitesseOctetsParSeconde)}/s
        </span>
      </div>
    </div>
  )
}

function libellePhase(phase: string): string {
  switch (phase) {
    case 'analyse':
      return 'Analyse des fichiers...'
    case 'copie':
      return 'Copie en cours...'
    case 'verification':
      return "Verification de l'integrite..."
    case 'suppression':
      return 'Suppression des fichiers obsoletes...'
    case 'termine':
      return 'Termine'
    default:
      return phase
  }
}
