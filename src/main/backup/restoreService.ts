import { copyFile, mkdir, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import type { ResultatRestauration, RunFile } from '@shared/types'
import { hacherFichier } from './integrity'
import { dossierRacinePourSource } from './pathMapping'

function cheminRelatifRestauration(cheminSource: string, sources: string[]): string {
  const source = sources
    .map((racine) => ({ racine: resolve(racine), rel: relative(resolve(racine), resolve(cheminSource)) }))
    .filter(({ rel }) => rel === '' || (!rel.startsWith('..') && !isAbsolute(rel)))
    .sort((a, b) => b.racine.length - a.racine.length)[0]

  if (!source || !source.rel) throw new Error('impossible de rattacher le fichier a une source du job')
  return join(dossierRacinePourSource(source.racine), source.rel)
}

export async function restaurerFichiers(
  fichiers: RunFile[],
  destination: string,
  sources: string[]
): Promise<ResultatRestauration> {
  const resultat: ResultatRestauration = { fichiersRestaures: 0, fichiersIgnores: 0, erreurs: [] }
  const valides = fichiers.filter((f) => f.etat === 'done' || f.etat === 'copied')
  if (valides.length === 0) return resultat
  for (const fichier of valides) {
    try {
      await stat(fichier.cheminDestination)
      const rel = cheminRelatifRestauration(fichier.cheminSource, sources)
      const cible = join(destination, rel)
      await mkdir(dirname(cible), { recursive: true })
      try {
        await copyFile(fichier.cheminDestination, cible, constants.COPYFILE_EXCL)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
          resultat.fichiersIgnores++
          continue
        }
        throw error
      }
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
