import type { Database } from './database'

export interface LigneManifest {
  cheminRelatif: string
  taille: number
  mtime: number
  hash: string | null
}

export class ManifestRepo {
  constructor(private readonly db: Database) {}

  enregistrer(jobId: number, runId: number, entrees: LigneManifest[]): void {
    this.db.transaction(() => {
      for (const e of entrees) {
        this.db.run(
          `INSERT OR REPLACE INTO manifest (job_id, run_id, chemin_relatif, taille, mtime, hash)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [jobId, runId, e.cheminRelatif, e.taille, e.mtime, e.hash]
        )
      }
    })
  }

  /** Dernier manifeste connu pour un job (celui du run termine le plus recent), indexe par chemin relatif. */
  dernierManifeste(jobId: number): Map<string, LigneManifest> {
    const lignes = this.db.all<{
      chemin_relatif: string
      taille: number
      mtime: number
      hash: string | null
    }>(
      `SELECT m.chemin_relatif, m.taille, m.mtime, m.hash
       FROM manifest m
       WHERE m.run_id = (
         SELECT r.id FROM runs r
         WHERE r.job_id = ? AND r.statut = 'termine' AND r.version_dossier IS NOT NULL
         ORDER BY r.demarre_le DESC LIMIT 1
       )`,
      [jobId]
    )
    const carte = new Map<string, LigneManifest>()
    for (const l of lignes) {
      carte.set(l.chemin_relatif, { cheminRelatif: l.chemin_relatif, taille: l.taille, mtime: l.mtime, hash: l.hash })
    }
    return carte
  }

  supprimerPourRun(runId: number): void {
    this.db.run('DELETE FROM manifest WHERE run_id = ?', [runId])
  }
}
