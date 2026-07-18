import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import type { Readable } from 'node:stream'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { tMain } from '../i18n'

export const IV_LENGTH = 12
export const TAG_LENGTH = 16

export interface TransformChiffrement {
  flux: Transform
}

/**
 * Chiffre le contenu en transit vers le fichier de destination, au format autonome
 * [12o IV][texte chiffre][16o authTag] : l'IV et l'empreinte d'authentification voyagent avec le
 * fichier, aucune metadonnee separee n'est necessaire pour dechiffrer. L'authTag n'est disponible
 * qu'une fois tout le contenu chiffre (propriete de GCM) - il est donc ajoute a la toute fin du flux,
 * plutot qu'en entete, pour rester compatible avec un chiffrement en continu sans mise en memoire
 * tampon du fichier entier.
 */
export function creerTransformChiffrement(cle: Buffer): TransformChiffrement {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', cle, iv)
  let ivEcrit = false

  const flux = new Transform({
    transform(chunk, _enc, callback) {
      const morceaux: Buffer[] = []
      if (!ivEcrit) {
        morceaux.push(iv)
        ivEcrit = true
      }
      morceaux.push(cipher.update(chunk as Buffer))
      callback(null, Buffer.concat(morceaux))
    },
    flush(callback) {
      const morceaux: Buffer[] = []
      if (!ivEcrit) morceaux.push(iv) // fichier source vide : l'IV n'a pas encore ete emis
      morceaux.push(cipher.final(), cipher.getAuthTag())
      this.push(Buffer.concat(morceaux))
      callback()
    }
  })

  return { flux }
}

function lireOctets(chemin: string, start: number, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const morceaux: Buffer[] = []
    const flux = createReadStream(chemin, { start, end: start + length - 1 })
    flux.on('data', (chunk) => morceaux.push(chunk as Buffer))
    flux.on('end', () => resolve(Buffer.concat(morceaux)))
    flux.on('error', reject)
  })
}

/** Flux de dechiffrement d'un fichier ecrit par {@link creerTransformChiffrement}. */
export async function creerFluxDechiffrement(chemin: string, cle: Buffer): Promise<Readable> {
  const { size } = await stat(chemin)
  if (size < IV_LENGTH + TAG_LENGTH) throw new Error(tMain('main.encryptedFileInvalid'))

  const iv = await lireOctets(chemin, 0, IV_LENGTH)
  const authTag = await lireOctets(chemin, size - TAG_LENGTH, TAG_LENGTH)

  const decipher = createDecipheriv('aes-256-gcm', cle, iv)
  decipher.setAuthTag(authTag)

  return createReadStream(chemin, { start: IV_LENGTH, end: size - TAG_LENGTH - 1 }).pipe(decipher)
}

/**
 * Dechiffre `cheminSource` vers `cheminDestination`. Ouvre la destination en creation exclusive
 * (`wx`) : echoue avec EEXIST si le fichier existe deja, comme `copyFile(..., COPYFILE_EXCL)` pour
 * le chemin non chiffre, afin de ne jamais ecraser silencieusement une restauration existante.
 */
export async function dechiffrerVersFichier(cheminSource: string, cheminDestination: string, cle: Buffer): Promise<void> {
  const flux = await creerFluxDechiffrement(cheminSource, cle)
  const ecriture = createWriteStream(cheminDestination, { flags: 'wx' })
  await pipeline(flux, ecriture)
}
