export type ClasseErreur = 'verrouille' | 'permission' | 'disque_plein' | 'source_disparue' | 'inconnue'

export function classifierErreur(erreur: NodeJS.ErrnoException): ClasseErreur {
  switch (erreur.code) {
    case 'EBUSY':
    case 'EMFILE':
    case 'ENFILE':
    case 'EAGAIN':
      return 'verrouille'
    case 'EACCES':
    case 'EPERM':
      return 'permission'
    case 'ENOSPC':
      return 'disque_plein'
    case 'ENOENT':
      return 'source_disparue'
    default:
      return 'inconnue'
  }
}

export interface DecisionErreur {
  reessayer: boolean
  delaiMs: number
  abandonnerRun: boolean
}

const DELAIS_REESSAI_MS = [1000, 4000, 10000]

export function decisionPourErreur(classe: ClasseErreur, tentative: number, maxTentatives: number): DecisionErreur {
  const peutReessayer = tentative < maxTentatives
  const delaiMs = DELAIS_REESSAI_MS[Math.min(tentative, DELAIS_REESSAI_MS.length - 1)]

  switch (classe) {
    case 'verrouille':
    case 'inconnue':
      return peutReessayer
        ? { reessayer: true, delaiMs, abandonnerRun: false }
        : { reessayer: false, delaiMs: 0, abandonnerRun: false }
    case 'permission':
    case 'source_disparue':
      return { reessayer: false, delaiMs: 0, abandonnerRun: false }
    case 'disque_plein':
      return { reessayer: false, delaiMs: 0, abandonnerRun: true }
  }
}

/**
 * Detecte une deconnexion probable du support de destination : une rafale d'echecs
 * dans une courte fenetre de temps declenche une pause plutot qu'un abandon fichier par fichier.
 */
export class SurveillantDeconnexion {
  private echecsRecents: number[] = []

  constructor(
    private readonly seuilEchecs = 5,
    private readonly fenetreMs = 15_000
  ) {}

  enregistrerEchec(): boolean {
    const maintenant = Date.now()
    this.echecsRecents.push(maintenant)
    this.echecsRecents = this.echecsRecents.filter((t) => maintenant - t <= this.fenetreMs)
    return this.echecsRecents.length >= this.seuilEchecs
  }

  reinitialiser(): void {
    this.echecsRecents = []
  }
}

export async function attendre(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
