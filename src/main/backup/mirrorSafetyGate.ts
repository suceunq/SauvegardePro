import { access, constants } from 'node:fs/promises'
import { sep } from 'node:path'
import type { DemandeConfirmationMiroir, ParametresAvances } from '@shared/types'
import { extraireLettreLecteur, identifiantVolume } from '../discovery/windowsVolume'

/**
 * Verifie que toutes les racines source sont bien accessibles avant tout calcul de suppression.
 * Une source injoignable est TOUJOURS traitee comme "annuler", jamais comme "vide donc tout supprimer".
 */
export async function sourcesAccessibles(sources: string[]): Promise<boolean> {
  for (const source of sources) {
    try {
      await access(source, constants.R_OK)
    } catch {
      return false
    }
  }
  return true
}

/**
 * Compare l'identifiant de volume courant de chaque source lecteur a celui enregistre lors du
 * premier run miroir reussi. Un changement (disque different monte sur la meme lettre) bloque le run.
 */
export async function volumesInchanges(sources: string[], volumesEnregistres: Record<string, string>): Promise<boolean> {
  for (const source of sources) {
    const enregistre = volumesEnregistres[source]
    if (!enregistre) continue // pas encore de reference (premier run) : pas de blocage

    const lettre = extraireLettreLecteur(source)
    if (!lettre) continue // chemin reseau/UNC : pas de verification de volume applicable

    const idActuel = await identifiantVolume(lettre)
    if (!idActuel) continue // impossible a determiner : ne pas bloquer sur une incertitude technique
    if (idActuel !== enregistre) return false
  }
  return true
}

/** Construit la carte {source -> identifiant de volume} courante, pour les sources situees sur un lecteur. */
export async function capturerVolumesActuels(sources: string[]): Promise<Record<string, string>> {
  const volumes: Record<string, string> = {}
  for (const source of sources) {
    const lettre = extraireLettreLecteur(source)
    if (!lettre) continue
    const id = await identifiantVolume(lettre)
    if (id) volumes[source] = id
  }
  return volumes
}

export interface ResultatGardeFouMiroir {
  autorise: boolean
  demandeConfirmation: DemandeConfirmationMiroir | null
  suppressionsFiltrees: string[]
}

/**
 * Filtre les suppressions candidates (exclusion des sous-arbres dont l'enumeration a echoue),
 * puis applique le disjoncteur : au-dela du seuil, exige une confirmation explicite avant suppression.
 */
export function evaluerSuppressionsMiroir(
  runId: number,
  jobId: number,
  suppressionsCandidates: string[],
  sousArbresIncomplets: Set<string>,
  fichiersConnus: number,
  parametres: ParametresAvances
): ResultatGardeFouMiroir {
  const prefixesIncomplets = [...sousArbresIncomplets]
  const suppressionsFiltrees = suppressionsCandidates.filter(
    (chemin) => !prefixesIncomplets.some((prefixe) => chemin === prefixe || chemin.startsWith(prefixe + sep))
  )

  if (suppressionsFiltrees.length === 0) {
    return { autorise: true, demandeConfirmation: null, suppressionsFiltrees }
  }

  const pourcentage = fichiersConnus > 0 ? (suppressionsFiltrees.length / fichiersConnus) * 100 : 100
  const depasseSeuil =
    pourcentage > parametres.seuilSuppressionPourcent || suppressionsFiltrees.length > parametres.seuilSuppressionAbsolu

  if (depasseSeuil) {
    return {
      autorise: false,
      suppressionsFiltrees,
      demandeConfirmation: {
        runId,
        jobId,
        suppressionsPrevues: suppressionsFiltrees.length,
        fichiersConnus,
        pourcentage: Math.round(pourcentage)
      }
    }
  }

  return { autorise: true, demandeConfirmation: null, suppressionsFiltrees }
}
