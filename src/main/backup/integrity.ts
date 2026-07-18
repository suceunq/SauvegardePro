import { createHash, type Hash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import type { Readable } from 'node:stream'
import { Transform } from 'node:stream'
import { creerFluxDechiffrement } from './encryption'
import { tMain } from '../i18n'

function hacherFlux(flux: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    flux.on('data', (chunk) => hash.update(chunk as Buffer))
    flux.on('end', () => resolve(hash.digest('hex')))
    flux.on('error', reject)
  })
}

export function hacherFichier(chemin: string): Promise<string> {
  return hacherFlux(createReadStream(chemin))
}

export interface TransformHachage {
  flux: Transform
  obtenirHash: () => string
}

/** Transform passthrough qui calcule le SHA-256 du contenu au fil de la copie, sans relecture. */
export function creerTransformHachage(): TransformHachage {
  const hash: Hash = createHash('sha256')
  let termine = false

  const flux = new Transform({
    transform(chunk, _enc, callback) {
      hash.update(chunk as Buffer)
      callback(null, chunk)
    },
    flush(callback) {
      termine = true
      callback()
    }
  })

  return {
    flux,
    obtenirHash: () => {
      if (!termine) throw new Error(tMain('main.hashPending'))
      return hash.digest('hex')
    }
  }
}

/**
 * Relit le fichier de destination et compare son empreinte a celle attendue (verification post-copie
 * reelle). `hashAttendu` porte toujours sur le contenu en clair : si le fichier est chiffre, il est
 * dechiffre a la volee avant hachage plutot que hache tel quel.
 */
export async function verifierIntegriteFichier(
  cheminDestination: string,
  hashAttendu: string,
  cleChiffrement: Buffer | null = null
): Promise<boolean> {
  const flux = cleChiffrement ? await creerFluxDechiffrement(cheminDestination, cleChiffrement) : createReadStream(cheminDestination)
  const hashObtenu = await hacherFlux(flux)
  return hashObtenu === hashAttendu
}
