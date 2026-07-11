import type { Database } from './database'
import type { Job, NouveauJob } from '@shared/types'

interface LigneJob {
  id: number
  nom: string
  sources: string
  destination: string
  mode: string
  planification: string
  exclusions: string
  parametres: string
  actif: number
  cree_le: number
  modifie_le: number
  dernier_run_id: number | null
}

function versJob(ligne: LigneJob): Job {
  return {
    id: ligne.id,
    nom: ligne.nom,
    sources: JSON.parse(ligne.sources),
    destination: ligne.destination,
    mode: ligne.mode as Job['mode'],
    planification: JSON.parse(ligne.planification),
    exclusions: JSON.parse(ligne.exclusions),
    parametres: JSON.parse(ligne.parametres),
    actif: ligne.actif === 1,
    creeLe: ligne.cree_le,
    modifieLe: ligne.modifie_le,
    dernierRunId: ligne.dernier_run_id
  }
}

const SELECT_AVEC_DERNIER_RUN = `
  SELECT j.id, j.nom, j.sources, j.destination, j.mode, j.planification, j.exclusions,
         j.parametres, j.actif, j.cree_le, j.modifie_le,
         (SELECT r.id FROM runs r WHERE r.job_id = j.id ORDER BY r.demarre_le DESC LIMIT 1) AS dernier_run_id
  FROM jobs j
`

export class JobsRepo {
  constructor(private readonly db: Database) {}

  lister(): Job[] {
    return this.db
      .all<LigneJob>(`${SELECT_AVEC_DERNIER_RUN} ORDER BY j.nom COLLATE NOCASE ASC`)
      .map(versJob)
  }

  obtenir(id: number): Job | undefined {
    const ligne = this.db.get<LigneJob>(`${SELECT_AVEC_DERNIER_RUN} WHERE j.id = ?`, [id])
    return ligne ? versJob(ligne) : undefined
  }

  /** Carte {cheminSource -> identifiant de volume} enregistree lors du premier run miroir reussi. */
  obtenirVolumesEnregistres(id: number): Record<string, string> {
    const ligne = this.db.get<{ volume_serial: string | null }>(
      'SELECT volume_serial FROM jobs WHERE id = ?',
      [id]
    )
    if (!ligne?.volume_serial) return {}
    try {
      return JSON.parse(ligne.volume_serial)
    } catch {
      return {}
    }
  }

  enregistrerVolumes(id: number, volumes: Record<string, string>): void {
    this.db.run('UPDATE jobs SET volume_serial = ? WHERE id = ?', [JSON.stringify(volumes), id])
  }

  creer(job: NouveauJob): Job {
    const maintenant = Date.now()
    this.db.run(
      `INSERT INTO jobs (nom, sources, destination, mode, planification, exclusions, parametres, actif, cree_le, modifie_le)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        job.nom,
        JSON.stringify(job.sources),
        job.destination,
        job.mode,
        JSON.stringify(job.planification),
        JSON.stringify(job.exclusions),
        JSON.stringify(job.parametres),
        job.actif ? 1 : 0,
        maintenant,
        maintenant
      ]
    )
    const id = this.db.dernierIdInsere()
    const cree = this.obtenir(id)
    if (!cree) throw new Error("Echec de la creation du job")
    return cree
  }

  mettreAJour(id: number, job: NouveauJob): Job {
    this.db.run(
      `UPDATE jobs SET nom = ?, sources = ?, destination = ?, mode = ?, planification = ?,
         exclusions = ?, parametres = ?, actif = ?, modifie_le = ? WHERE id = ?`,
      [
        job.nom,
        JSON.stringify(job.sources),
        job.destination,
        job.mode,
        JSON.stringify(job.planification),
        JSON.stringify(job.exclusions),
        JSON.stringify(job.parametres),
        job.actif ? 1 : 0,
        Date.now(),
        id
      ]
    )
    const maj = this.obtenir(id)
    if (!maj) throw new Error('Job introuvable apres mise a jour')
    return maj
  }

  supprimer(id: number): void {
    this.db.run('DELETE FROM jobs WHERE id = ?', [id])
  }
}
