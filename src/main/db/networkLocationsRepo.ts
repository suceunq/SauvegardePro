import type { Database } from './database'
import type { EmplacementReseau } from '@shared/types'
import { tMain } from '../i18n'

export class NetworkLocationsRepo {
  constructor(private readonly db: Database) {}

  lister(): EmplacementReseau[] {
    return this.db
      .all<{ id: number; nom: string; chemin: string; ajoute_le: number }>(
        'SELECT id, nom, chemin, ajoute_le FROM network_locations ORDER BY nom COLLATE NOCASE ASC'
      )
      .map((l) => ({ id: l.id, nom: l.nom, chemin: l.chemin, ajouteLe: l.ajoute_le }))
  }

  ajouter(nom: string, chemin: string): EmplacementReseau {
    this.db.run(
      `INSERT OR IGNORE INTO network_locations (nom, chemin, ajoute_le) VALUES (?, ?, ?)`,
      [nom, chemin, Date.now()]
    )
    const ligne = this.db.get<{ id: number; nom: string; chemin: string; ajoute_le: number }>(
      'SELECT id, nom, chemin, ajoute_le FROM network_locations WHERE chemin = ?',
      [chemin]
    )
    if (!ligne) throw new Error(tMain('main.addNetworkFailed'))
    return { id: ligne.id, nom: ligne.nom, chemin: ligne.chemin, ajouteLe: ligne.ajoute_le }
  }

  supprimer(id: number): void {
    this.db.run('DELETE FROM network_locations WHERE id = ?', [id])
  }
}
