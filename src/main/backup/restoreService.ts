import { copyFile, mkdir, stat } from 'node:fs/promises'
import { basename, dirname, join, relative } from 'node:path'
import type { ResultatRestauration, RunFile } from '@shared/types'
import { hacherFichier } from './integrity'

export async function restaurerFichiers(
  fichiers: RunFile[],
  destination: string
): Promise<ResultatRestauration> {
  const resultat: ResultatRestauration = { fichiersRestaures: 0, fichiersIgnores: 0, erreurs: [] }
  const valides = fichiers.filter((f) => f.etat === 'done' || f.etat === 'copied')
  if (valides.length === 0) return resultat
  const racineCommune = dirname(valides[0].cheminSource)

  for (const fichier of valides) {
    try {
      await stat(fichier.cheminDestination)
      let rel = relative(racineCommune, fichier.cheminSource)
      if (!rel || rel.startsWith('..')) rel = basename(fichier.cheminSource)
      const cible = join(destination, rel)
      await mkdir(dirname(cible), { recursive: true })
      await copyFile(fichier.cheminDestination, cible)
      if (fichier.hashSource) {
        const hash = await hacherFichier(cible)
        if (hash !== fichier.hashSource) throw new Error('verification SHA-256 echouee')
      }
      resultat.fichiersRestaures++
    } catch (error) {
      resultat.erreurs.push(`${fichier.cheminSource}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return resultat
}
