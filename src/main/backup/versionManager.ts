import { link, mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { FichierScanne } from './fileScanner'
import type { LigneManifest } from '../db/manifestRepo'
import type { RunsRepo } from '../db/runsRepo'

export function horodatageVersion(date: Date = new Date()): string {
  return date.toISOString().replace(/:/g, '-').replace(/\..+/, '')
}

export function dossierVersions(destinationRacine: string): string {
  return join(destinationRacine, 'versions')
}

export function cheminNouvelleVersion(destinationRacine: string, horodatage: string): string {
  return join(dossierVersions(destinationRacine), horodatage)
}

export interface PlanIncrementiel {
  aCopier: FichierScanne[]
  aLier: Array<{ fichier: FichierScanne; cheminExistant: string }>
}

/**
 * Decide, pour chaque fichier scanne, s'il peut etre relie (hardlink NTFS, gratuit et instantane)
 * a la version precedente ou s'il doit etre reellement copie (nouveau ou modifie).
 */
export function planifierIncrementiel(
  fichiers: FichierScanne[],
  manifesteAncien: Map<string, LigneManifest>,
  dossierVersionAncien: string | null
): PlanIncrementiel {
  const aCopier: FichierScanne[] = []
  const aLier: PlanIncrementiel['aLier'] = []

  for (const fichier of fichiers) {
    const ancien = manifesteAncien.get(fichier.cheminRelatif)
    const inchange = !!ancien && ancien.taille === fichier.taille && ancien.mtime === fichier.mtime

    if (inchange && dossierVersionAncien) {
      aLier.push({ fichier, cheminExistant: join(dossierVersionAncien, fichier.cheminRelatif) })
    } else {
      aCopier.push(fichier)
    }
  }

  return { aCopier, aLier }
}

/** Cree un hardlink NTFS ; leve une erreur EXDEV si les deux chemins ne sont pas sur le meme volume. */
export async function creerHardlink(cheminExistant: string, cheminDestination: string): Promise<void> {
  await mkdir(dirname(cheminDestination), { recursive: true })
  await link(cheminExistant, cheminDestination)
}

/**
 * Supprime les dossiers de version les plus anciens au-dela du nombre a conserver.
 * Les fichiers encore references par des versions plus recentes (hardlinks) survivent
 * automatiquement grace au comptage de references NTFS : seul le lien de la version supprimee disparait.
 */
export async function purgerAnciennesVersions(
  jobId: number,
  destinationRacine: string,
  runsRepo: RunsRepo,
  nombreAConserver: number
): Promise<number> {
  const runsTermines = runsRepo.runsTerminesOrdreAnciennete(jobId)
  const excedent = runsTermines.length - Math.max(1, nombreAConserver)
  if (excedent <= 0) return 0

  const aPurger = runsTermines.slice(0, excedent)
  let purges = 0

  for (const run of aPurger) {
    const horodatage = runsRepo.versionDossierRun(run.id)
    if (!horodatage) continue
    const dossier = cheminNouvelleVersion(destinationRacine, horodatage)
    await rm(dossier, { recursive: true, force: true })
    purges++
  }

  return purges
}
