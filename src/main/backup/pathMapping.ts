import { basename } from 'node:path'

/**
 * Nom de dossier stable et sans collision pour representer une racine source donnee
 * a l'interieur de la destination (une lettre de lecteur ou un partage reseau).
 */
export function dossierRacinePourSource(cheminSource: string): string {
  const normalise = cheminSource.replace(/\//g, '\\')

  // Uniquement la racine du lecteur elle-meme (ex: "C:\"), pas un dossier quelconque situe dessus.
  const lecteur = normalise.match(/^([A-Za-z]):\\?$/)
  if (lecteur) {
    return `Lecteur_${lecteur[1].toUpperCase()}`
  }

  const unc = normalise.match(/^\\\\([^\\]+)\\([^\\]+)/)
  if (unc) {
    return `Reseau_${unc[1]}_${unc[2]}`.replace(/[^A-Za-z0-9_-]/g, '_')
  }

  return basename(normalise) || 'Source'
}
