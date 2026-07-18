import { app, safeStorage } from 'electron'
import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tMain } from '../i18n'

function cheminCle(): string {
  return join(app.getPath('userData'), 'backup-encryption.key')
}

let cleCache: Buffer | null = null

/**
 * Cle AES-256 unique pour toutes les sauvegardes chiffrees de l'application, protegee au repos
 * via le stockage securise du systeme d'exploitation (DPAPI sous Windows, lie au compte utilisateur
 * courant) - jamais redemandee a l'utilisateur, ce qui est necessaire pour des sauvegardes planifiees
 * qui s'executent sans interaction. Protege contre le vol/la perte du support de destination, pas
 * contre la compromission du compte Windows source (hors du perimetre d'un logiciel de sauvegarde local).
 */
export async function obtenirCleChiffrement(): Promise<Buffer> {
  if (cleCache) return cleCache
  if (!safeStorage.isEncryptionAvailable()) throw new Error(tMain('main.encryptionUnavailable'))

  try {
    const chiffree = await readFile(cheminCle())
    cleCache = Buffer.from(safeStorage.decryptString(chiffree), 'base64')
    return cleCache
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }

  const cle = randomBytes(32)
  const chiffree = safeStorage.encryptString(cle.toString('base64'))
  await mkdir(dirname(cheminCle()), { recursive: true })
  await writeFile(cheminCle(), chiffree)
  cleCache = cle
  return cle
}
