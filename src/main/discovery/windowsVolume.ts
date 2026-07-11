import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

async function executerPowerShell(commande: string): Promise<string> {
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', commande],
    { windowsHide: true, timeout: 15_000 }
  )
  return stdout.trim()
}

/** Identifiant stable d'un volume (utilise pour detecter un lecteur demonte/remplace en mode miroir). */
export async function identifiantVolume(lettreLecteur: string): Promise<string | null> {
  const lettre = lettreLecteur.replace(/[^A-Za-z]/g, '').toUpperCase()
  if (!lettre) return null
  try {
    const valeur = await executerPowerShell(`(Get-Volume -DriveLetter '${lettre}' -ErrorAction Stop).UniqueId`)
    return valeur || null
  } catch {
    return null
  }
}

export function extraireLettreLecteur(cheminSource: string): string | null {
  const correspondance = cheminSource.match(/^([A-Za-z]):\\/)
  return correspondance ? correspondance[1].toUpperCase() : null
}

export { executerPowerShell }
