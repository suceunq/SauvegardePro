import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, open, rename } from 'node:fs/promises'
import { dirname } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Transform } from 'node:stream'
import { creerTransformHachage } from './integrity'
import { LimiteurDebit } from './throttle'

export interface OptionsCopie {
  cheminSource: string
  cheminDestinationFinal: string
  /** Identifiant du run en cours : rend le nom du fichier temporaire deterministe et sans collision inter-run. */
  runId: number
  limiteOctetsParSeconde: number | null
  calculerHash: boolean
  surProgression?: (octetsEcrits: number) => void
}

export interface ResultatCopie {
  octets: number
  hash: string | null
}

/** Nom deterministe du fichier temporaire : permet a la reprise de nettoyer/reutiliser un fichier orphelin. */
export function cheminTemporaire(cheminDestinationFinal: string, runId: number): string {
  return `${cheminDestinationFinal}.part-${runId}`
}

/**
 * Copie source -> fichier temporaire (meme volume que la destination finale) puis renommage atomique.
 * Aucune ecriture directe sur le nom final : en cas d'echec/interruption, seul le .part-<runId> est corrompu.
 */
export async function copierFichierAtomique(options: OptionsCopie): Promise<ResultatCopie> {
  const { cheminSource, cheminDestinationFinal, runId, limiteOctetsParSeconde, calculerHash } = options
  await mkdir(dirname(cheminDestinationFinal), { recursive: true })

  const cheminTemp = cheminTemporaire(cheminDestinationFinal, runId)
  const fh = await open(cheminTemp, 'w')

  let octets = 0
  const transformHachage = calculerHash ? creerTransformHachage() : null

  try {
    const lectureSource = createReadStream(cheminSource)
    // autoClose:false : le FileHandle `fh` reste le seul proprietaire du descripteur, ferme explicitement
    // ci-dessous apres fsync. Sans cela, la fin du flux ferme deja le fd et fh.sync()/fh.close() echouent
    // avec "file closed".
    const ecritureTemp = createWriteStream(cheminTemp, { fd: fh.fd, autoClose: false })

    const compteur = new Transform({
      transform(chunk, _enc, callback) {
        octets += chunk.length
        options.surProgression?.(chunk.length)
        callback(null, chunk)
      }
    })

    const etapes: Array<NodeJS.ReadableStream | NodeJS.WritableStream> = [lectureSource, compteur]
    if (transformHachage) etapes.push(transformHachage.flux)
    if (limiteOctetsParSeconde) etapes.push(new LimiteurDebit(limiteOctetsParSeconde))
    etapes.push(ecritureTemp)

    await pipeline(etapes as unknown as [NodeJS.ReadableStream, NodeJS.WritableStream])
    await fh.sync()
  } finally {
    await fh.close()
  }

  await rename(cheminTemp, cheminDestinationFinal)

  return { octets, hash: transformHachage?.obtenirHash() ?? null }
}
