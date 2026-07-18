import { Fragment, type ReactNode } from 'react'

function rendreInline(texte: string, cle: string): ReactNode {
  const parties = texte.split(/(\*\*[^*]+\*\*)/g)
  return parties.map((partie, index) => {
    if (partie.startsWith('**') && partie.endsWith('**') && partie.length > 4) {
      return <strong key={`${cle}-${index}`}>{partie.slice(2, -2)}</strong>
    }
    return <Fragment key={`${cle}-${index}`}>{partie}</Fragment>
  })
}

/** Rendu Markdown minimal (titres, listes, gras) sans dependance externe ni injection HTML. */
export function RenduMarkdownLeger({ texte }: { texte: string }) {
  const normalise = texte
    .replace(/\\r\\n|\\n|\\r/g, '\n')
    .replace(/\r\n|\r/g, '\n')
    .trim()
  const lignes = normalise.split('\n')
  const blocs: ReactNode[] = []
  let elementsListe: string[] = []

  const viderListe = (cle: string): void => {
    if (elementsListe.length === 0) return
    blocs.push(
      <ul key={cle} className="ml-4 list-disc space-y-1">
        {elementsListe.map((item, index) => (
          <li key={index}>{rendreInline(item, `${cle}-li-${index}`)}</li>
        ))}
      </ul>
    )
    elementsListe = []
  }

  lignes.forEach((ligneBrute, index) => {
    const ligne = ligneBrute.trim()
    const cle = `bloc-${index}`
    if (!ligne) {
      viderListe(cle)
      return
    }
    const titre = ligne.match(/^(#{1,3})\s+(.*)$/)
    if (titre) {
      viderListe(cle)
      const niveau = titre[1].length
      const contenu = titre[2]
      const classes =
        niveau === 1
          ? 'text-base font-semibold text-slate-100'
          : niveau === 2
            ? 'text-sm font-semibold text-slate-100'
            : 'text-sm font-medium text-slate-200'
      blocs.push(
        <p key={cle} className={classes}>
          {rendreInline(contenu, cle)}
        </p>
      )
      return
    }
    const puce = ligne.match(/^[-*]\s+(.*)$/)
    if (puce) {
      elementsListe.push(puce[1])
      return
    }
    viderListe(cle)
    blocs.push(
      <p key={cle} className="text-sm leading-6 text-slate-300">
        {rendreInline(ligne, cle)}
      </p>
    )
  })
  viderListe('fin')

  return <div className="space-y-2">{blocs}</div>
}
