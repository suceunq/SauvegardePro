import type { Database } from './database'
import type { Parametres } from '@shared/types'
import { PARAMETRES_DEFAUT } from '@shared/types'

const CLE = 'parametres_globaux'

export class SettingsRepo {
  constructor(private readonly db: Database) {}

  obtenir(): Parametres {
    const ligne = this.db.get<{ valeur: string }>('SELECT valeur FROM settings WHERE cle = ?', [CLE])
    if (!ligne) return { ...PARAMETRES_DEFAUT }
    try {
      return { ...PARAMETRES_DEFAUT, ...JSON.parse(ligne.valeur) }
    } catch {
      return { ...PARAMETRES_DEFAUT }
    }
  }

  enregistrer(parametres: Parametres): void {
    this.db.run(
      `INSERT INTO settings (cle, valeur) VALUES (?, ?)
       ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur`,
      [CLE, JSON.stringify(parametres)]
    )
  }
}
