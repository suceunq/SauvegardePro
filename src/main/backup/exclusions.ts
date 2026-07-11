import micromatch from 'micromatch'
import { extname } from 'node:path'
import type { FiltreExclusion } from '@shared/types'

function normaliserExtension(ext: string): string {
  const e = ext.trim().toLowerCase()
  if (!e) return e
  return e.startsWith('.') ? e : `.${e}`
}

function segmentCorrespond(nom: string, motifs: string[]): boolean {
  if (motifs.length === 0) return false
  return micromatch.isMatch(nom, motifs, { nocase: true, dot: true })
}

/** Un nom de dossier a exclure interrompt la descente : tout son contenu est ignore. */
export function dossierExclu(nomDossier: string, filtre: FiltreExclusion): boolean {
  return segmentCorrespond(nomDossier, filtre.dossiers)
}

export function fichierExclu(nomFichier: string, filtre: FiltreExclusion): boolean {
  const ext = normaliserExtension(extname(nomFichier))
  if (ext && filtre.extensions.some((e) => normaliserExtension(e) === ext)) return true
  return segmentCorrespond(nomFichier, filtre.fichiers)
}
