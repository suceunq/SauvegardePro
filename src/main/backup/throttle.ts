import { Transform, type TransformCallback } from 'node:stream'

/** Limiteur de debit en flux (seau a jetons), applique au flux de copie lorsqu'une limite est definie. */
export class LimiteurDebit extends Transform {
  private jetons: number
  private dernierRemplissage = Date.now()

  constructor(private readonly limiteOctetsParSeconde: number | null) {
    super()
    this.jetons = limiteOctetsParSeconde ?? Number.POSITIVE_INFINITY
  }

  override _transform(chunk: Buffer, _enc: BufferEncoding, callback: TransformCallback): void {
    if (!this.limiteOctetsParSeconde) {
      callback(null, chunk)
      return
    }
    this.consommer(chunk, callback)
  }

  private consommer(chunk: Buffer, callback: TransformCallback): void {
    this.remplir()

    if (chunk.length <= this.jetons) {
      this.jetons -= chunk.length
      callback(null, chunk)
      return
    }

    const disponible = chunk.subarray(0, this.jetons)
    const reste = chunk.subarray(this.jetons)
    this.jetons = 0
    if (disponible.length > 0) this.push(disponible)

    const delaiMs = Math.max(10, Math.ceil((reste.length / this.limiteOctetsParSeconde!) * 1000))
    setTimeout(() => this.consommer(reste, callback), delaiMs)
  }

  private remplir(): void {
    if (!this.limiteOctetsParSeconde) return
    const maintenant = Date.now()
    const ecouleMs = maintenant - this.dernierRemplissage
    if (ecouleMs <= 0) return
    this.jetons = Math.min(
      this.limiteOctetsParSeconde,
      this.jetons + (ecouleMs / 1000) * this.limiteOctetsParSeconde
    )
    this.dernierRemplissage = maintenant
  }
}
