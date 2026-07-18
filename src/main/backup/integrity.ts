import { createHash, type Hash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { Transform } from 'node:stream'
import { tMain } from '../i18n'

export function hacherFichier(chemin: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const flux = createReadStream(chemin)
    flux.on('data', (chunk) => hash.update(chunk as Buffer))
    flux.on('end', () => resolve(hash.digest('hex')))
    flux.on('error', reject)
  })
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

/** Relit le fichier de destination et compare son empreinte a celle attendue (verification post-copie reelle). */
export async function verifierIntegriteFichier(cheminDestination: string, hashAttendu: string): Promise<boolean> {
  const hashObtenu = await hacherFichier(cheminDestination)
  return hashObtenu === hashAttendu
}
