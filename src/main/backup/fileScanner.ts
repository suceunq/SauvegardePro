import { readdir, stat } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { join, relative } from 'node:path'
import type { FiltreExclusion } from '@shared/types'
import { dossierExclu, fichierExclu } from './exclusions'
import { dossierRacinePourSource } from './pathMapping'

export interface FichierScanne {
  cheminSource: string
  /** Chemin relatif a l'interieur de la destination, prefixe par le dossier racine de la source. */
  cheminRelatif: string
  taille: number
  mtime: number
}

export interface ErreurEnumeration {
  chemin: string
  code: string
}

export interface ResultatScan {
  fichiers: FichierScanne[]
  erreurs: ErreurEnumeration[]
  /** Chemins relatifs (forme destination) dont l'enumeration a echoue : exclus de toute decision de suppression. */
  sousArbresIncomplets: Set<string>
}

export async function scannerSources(sources: string[], filtre: FiltreExclusion): Promise<ResultatScan> {
  const fichiers: FichierScanne[] = []
  const erreurs: ErreurEnumeration[] = []
  const sousArbresIncomplets = new Set<string>()

  for (const source of sources) {
    const dossierRacineDest = dossierRacinePourSource(source)
    await parcourir(source, source, dossierRacineDest, filtre, fichiers, erreurs, sousArbresIncomplets)
  }

  return { fichiers, erreurs, sousArbresIncomplets }
}

/** Scanne une seule arborescence en pretixant les chemins relatifs par `prefixeDest` (utilise pour relire la destination en mode miroir). */
export async function scannerArborescence(
  racine: string,
  filtre: FiltreExclusion,
  prefixeDest = ''
): Promise<ResultatScan> {
  const fichiers: FichierScanne[] = []
  const erreurs: ErreurEnumeration[] = []
  const sousArbresIncomplets = new Set<string>()

  await parcourir(racine, racine, prefixeDest, filtre, fichiers, erreurs, sousArbresIncomplets)

  return { fichiers, erreurs, sousArbresIncomplets }
}

async function parcourir(
  racineSource: string,
  cheminCourant: string,
  dossierRacineDest: string,
  filtre: FiltreExclusion,
  fichiers: FichierScanne[],
  erreurs: ErreurEnumeration[],
  sousArbresIncomplets: Set<string>
): Promise<void> {
  let entrees: Dirent[]
  try {
    entrees = await readdir(cheminCourant, { withFileTypes: true })
  } catch (erreur) {
    const e = erreur as NodeJS.ErrnoException
    erreurs.push({ chemin: cheminCourant, code: e.code ?? 'INCONNU' })
    sousArbresIncomplets.add(join(dossierRacineDest, relative(racineSource, cheminCourant)))
    return
  }

  for (const entree of entrees) {
    const cheminAbsolu = join(cheminCourant, entree.name)

    if (entree.isSymbolicLink()) continue

    if (entree.isDirectory()) {
      if (dossierExclu(entree.name, filtre)) continue
      await parcourir(racineSource, cheminAbsolu, dossierRacineDest, filtre, fichiers, erreurs, sousArbresIncomplets)
      continue
    }

    if (!entree.isFile()) continue
    if (fichierExclu(entree.name, filtre)) continue

    try {
      const infos = await stat(cheminAbsolu)
      fichiers.push({
        cheminSource: cheminAbsolu,
        cheminRelatif: join(dossierRacineDest, relative(racineSource, cheminAbsolu)),
        taille: infos.size,
        mtime: Math.floor(infos.mtimeMs)
      })
    } catch (erreur) {
      const e = erreur as NodeJS.ErrnoException
      erreurs.push({ chemin: cheminAbsolu, code: e.code ?? 'INCONNU' })
    }
  }
}
