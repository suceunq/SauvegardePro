import type { LecteurDetecte, TypeLecteur } from '@shared/types'
import { executerPowerShell } from './windowsVolume'

interface LigneVolumePowerShell {
  DriveLetter: string | null
  FileSystemLabel: string | null
  FileSystem: string | null
  Size: number | null
  SizeRemaining: number | null
  DriveType: string | null
}

function mapperType(driveType: string | null): TypeLecteur {
  switch (driveType) {
    case 'Fixed':
      return 'interne'
    case 'Removable':
      return 'amovible'
    case 'Network':
      return 'reseau'
    case 'CD-ROM':
      return 'cdrom'
    default:
      return 'inconnu'
  }
}

export async function detecterLecteurs(): Promise<LecteurDetecte[]> {
  const sortie = await executerPowerShell(
    'Get-Volume | Where-Object { $_.DriveLetter } | ' +
      'Select-Object DriveLetter, FileSystemLabel, FileSystem, Size, SizeRemaining, DriveType | ConvertTo-Json -Compress'
  )
  if (!sortie) return []

  let donnees: LigneVolumePowerShell | LigneVolumePowerShell[]
  try {
    donnees = JSON.parse(sortie)
  } catch {
    return []
  }

  const lignes = Array.isArray(donnees) ? donnees : [donnees]

  return lignes
    .filter((l) => l.DriveLetter)
    .map((l) => ({
      identifiant: `${l.DriveLetter}:\\`,
      nom: l.FileSystemLabel?.trim() || `Lecteur ${l.DriveLetter}`,
      type: mapperType(l.DriveType),
      systemeFichiers: l.FileSystem,
      tailleTotale: l.Size,
      espaceLibre: l.SizeRemaining
    }))
}

export class SurveillantLecteurs {
  private minuteur: ReturnType<typeof setInterval> | null = null
  private dernierEtat = new Map<string, LecteurDetecte>()

  constructor(
    private readonly surChangement: (lecteurs: LecteurDetecte[]) => void,
    private readonly intervalleMs = 5000
  ) {}

  demarrer(): void {
    void this.verifier()
    this.minuteur = setInterval(() => void this.verifier(), this.intervalleMs)
  }

  arreter(): void {
    if (this.minuteur) clearInterval(this.minuteur)
    this.minuteur = null
  }

  private async verifier(): Promise<void> {
    const lecteurs = await detecterLecteurs()
    const etatActuel = new Map(lecteurs.map((l) => [l.identifiant, l] as const))

    const changement =
      etatActuel.size !== this.dernierEtat.size ||
      [...etatActuel.keys()].some((cle) => !this.dernierEtat.has(cle))

    this.dernierEtat = etatActuel
    if (changement) this.surChangement(lecteurs)
  }
}
