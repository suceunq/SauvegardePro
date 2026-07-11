import type { FiltreExclusion } from '@shared/types'

interface Props {
  valeur: FiltreExclusion
  onChange: (f: FiltreExclusion) => void
}

function ChampListe({
  libelle,
  placeholder,
  valeurs,
  onChange
}: {
  libelle: string
  placeholder: string
  valeurs: string[]
  onChange: (v: string[]) => void
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-300">{libelle}</span>
      <input
        type="text"
        placeholder={placeholder}
        defaultValue={valeurs.join(', ')}
        onBlur={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean)
          )
        }
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"
      />
    </label>
  )
}

export default function ExclusionEditor({ valeur, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <ChampListe
        libelle="Extensions a exclure"
        placeholder=".tmp, .log, .bak"
        valeurs={valeur.extensions}
        onChange={(extensions) => onChange({ ...valeur, extensions })}
      />
      <ChampListe
        libelle="Dossiers a exclure"
        placeholder="node_modules, $RECYCLE.BIN"
        valeurs={valeur.dossiers}
        onChange={(dossiers) => onChange({ ...valeur, dossiers })}
      />
      <ChampListe
        libelle="Fichiers a exclure"
        placeholder="desktop.ini, Thumbs.db"
        valeurs={valeur.fichiers}
        onChange={(fichiers) => onChange({ ...valeur, fichiers })}
      />
    </div>
  )
}
