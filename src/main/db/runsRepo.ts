import type { Database } from './database'
import type { EntreeJournal, EtatFichierRun, NiveauJournal, Run, RunFile, StatutRun } from '@shared/types'
import { tMain } from '../i18n'

interface LigneRun {
  id: number
  job_id: number
  statut: string
  demarre_le: number
  termine_le: number | null
  fichiers_copies: number
  fichiers_mis_a_jour: number
  fichiers_supprimes: number
  fichiers_ignores: number
  fichiers_en_erreur: number
  octets_transferes: number
  message: string | null
  version_dossier: string | null
}

function versRun(ligne: LigneRun): Run {
  return {
    id: ligne.id,
    jobId: ligne.job_id,
    statut: ligne.statut as StatutRun,
    demarreLe: ligne.demarre_le,
    termineLe: ligne.termine_le,
    fichiersCopies: ligne.fichiers_copies,
    fichiersMisAJour: ligne.fichiers_mis_a_jour,
    fichiersSupprimes: ligne.fichiers_supprimes,
    fichiersIgnores: ligne.fichiers_ignores,
    fichiersEnErreur: ligne.fichiers_en_erreur,
    octetsTransferes: ligne.octets_transferes,
    message: ligne.message
  }
}

interface LigneRunFile {
  run_id: number
  chemin_source: string
  chemin_destination: string
  etat: string
  taille_source: number | null
  mtime_source: number | null
  hash_source: string | null
  chemin_temp: string | null
  nombre_tentatives: number
  derniere_erreur: string | null
}

function versRunFile(ligne: LigneRunFile): RunFile {
  return {
    runId: ligne.run_id,
    cheminSource: ligne.chemin_source,
    cheminDestination: ligne.chemin_destination,
    etat: ligne.etat as EtatFichierRun,
    tailleSource: ligne.taille_source,
    mtimeSource: ligne.mtime_source,
    hashSource: ligne.hash_source,
    cheminTemp: ligne.chemin_temp,
    nombreTentatives: ligne.nombre_tentatives,
    derniereErreur: ligne.derniere_erreur
  }
}

export class RunsRepo {
  constructor(private readonly db: Database) {}

  // --- runs ---

  creerRun(jobId: number, versionDossier: string | null): Run {
    this.db.run(
      `INSERT INTO runs (job_id, statut, demarre_le, version_dossier) VALUES (?, 'en_cours', ?, ?)`,
      [jobId, Date.now(), versionDossier]
    )
    const id = this.db.dernierIdInsere()
    const run = this.obtenirRun(id)
    if (!run) throw new Error(tMain('main.createRunFailed'))
    return run
  }

  obtenirRun(id: number): Run | undefined {
    const ligne = this.db.get<LigneRun>('SELECT * FROM runs WHERE id = ?', [id])
    return ligne ? versRun(ligne) : undefined
  }

  definirVersionDossier(id: number, versionDossier: string): void {
    this.db.run('UPDATE runs SET version_dossier = ? WHERE id = ?', [versionDossier, id])
  }

  versionDossierRun(id: number): string | null {
    const ligne = this.db.get<{ version_dossier: string | null }>(
      'SELECT version_dossier FROM runs WHERE id = ?',
      [id]
    )
    return ligne?.version_dossier ?? null
  }

  runsInterrompus(): Run[] {
    return this.db
      .all<LigneRun>(`SELECT * FROM runs WHERE statut = 'en_cours'`)
      .map(versRun)
  }

  marquerInterrompu(id: number): void {
    this.db.run(`UPDATE runs SET statut = 'interrompu' WHERE id = ? AND statut = 'en_cours'`, [id])
  }

  changerStatut(id: number, statut: StatutRun, message: string | null = null): void {
    const termineLe = statut === 'termine' || statut === 'echec' || statut === 'annule' ? Date.now() : null
    this.db.run('UPDATE runs SET statut = ?, message = ?, termine_le = COALESCE(?, termine_le) WHERE id = ?', [
      statut,
      message,
      termineLe,
      id
    ])
  }

  incrementerCompteurs(
    id: number,
    delta: Partial<
      Pick<
        Run,
        | 'fichiersCopies'
        | 'fichiersMisAJour'
        | 'fichiersSupprimes'
        | 'fichiersIgnores'
        | 'fichiersEnErreur'
        | 'octetsTransferes'
      >
    >
  ): void {
    this.db.run(
      `UPDATE runs SET
        fichiers_copies = fichiers_copies + ?,
        fichiers_mis_a_jour = fichiers_mis_a_jour + ?,
        fichiers_supprimes = fichiers_supprimes + ?,
        fichiers_ignores = fichiers_ignores + ?,
        fichiers_en_erreur = fichiers_en_erreur + ?,
        octets_transferes = octets_transferes + ?
       WHERE id = ?`,
      [
        delta.fichiersCopies ?? 0,
        delta.fichiersMisAJour ?? 0,
        delta.fichiersSupprimes ?? 0,
        delta.fichiersIgnores ?? 0,
        delta.fichiersEnErreur ?? 0,
        delta.octetsTransferes ?? 0,
        id
      ]
    )
  }

  runsRecents(jobId?: number, limite = 100): Run[] {
    if (jobId !== undefined) {
      return this.db
        .all<LigneRun>('SELECT * FROM runs WHERE job_id = ? ORDER BY demarre_le DESC LIMIT ?', [jobId, limite])
        .map(versRun)
    }
    return this.db.all<LigneRun>('SELECT * FROM runs ORDER BY demarre_le DESC LIMIT ?', [limite]).map(versRun)
  }

  dernierRunTermine(jobId: number): Run | undefined {
    const ligne = this.db.get<LigneRun>(
      `SELECT * FROM runs WHERE job_id = ? AND statut = 'termine' ORDER BY demarre_le DESC LIMIT 1`,
      [jobId]
    )
    return ligne ? versRun(ligne) : undefined
  }

  runsTerminesOrdreAnciennete(jobId: number): Run[] {
    return this.db
      .all<LigneRun>(
        `SELECT * FROM runs WHERE job_id = ? AND statut = 'termine' AND version_dossier IS NOT NULL ORDER BY demarre_le ASC`,
        [jobId]
      )
      .map(versRun)
  }

  scanIncomplet(runId: number): boolean {
    return !!this.db.get(
      `SELECT 1 FROM run_log
       WHERE run_id = ? AND niveau = 'avertissement' AND message LIKE 'Impossible de lire %'
       LIMIT 1`,
      [runId]
    )
  }

  // --- run_files (plan-then-execute + reprise) ---

  planifierFichiers(
    runId: number,
    fichiers: Array<{ cheminSource: string; cheminDestination: string; taille: number; mtime: number }>
  ): void {
    this.db.transaction(() => {
      for (const f of fichiers) {
        this.db.run(
          `INSERT OR REPLACE INTO run_files (run_id, chemin_source, chemin_destination, etat, taille_source, mtime_source)
           VALUES (?, ?, ?, 'pending', ?, ?)`,
          [runId, f.cheminSource, f.cheminDestination, f.taille, f.mtime]
        )
      }
    })
  }

  fichiersDuRun(runId: number): RunFile[] {
    return this.db
      .all<LigneRunFile>('SELECT * FROM run_files WHERE run_id = ?', [runId])
      .map(versRunFile)
  }

  fichiersParEtat(runId: number, etat: EtatFichierRun): RunFile[] {
    return this.db
      .all<LigneRunFile>('SELECT * FROM run_files WHERE run_id = ? AND etat = ?', [runId, etat])
      .map(versRunFile)
  }

  marquerEtatFichier(
    runId: number,
    cheminSource: string,
    etat: EtatFichierRun,
    extra: { cheminTemp?: string | null; hashSource?: string | null; derniereErreur?: string | null } = {}
  ): void {
    this.db.run(
      `UPDATE run_files SET etat = ?,
         chemin_temp = COALESCE(?, chemin_temp),
         hash_source = COALESCE(?, hash_source),
         derniere_erreur = ?
       WHERE run_id = ? AND chemin_source = ?`,
      [etat, extra.cheminTemp ?? null, extra.hashSource ?? null, extra.derniereErreur ?? null, runId, cheminSource]
    )
  }

  incrementerTentative(runId: number, cheminSource: string): number {
    this.db.run(
      'UPDATE run_files SET nombre_tentatives = nombre_tentatives + 1 WHERE run_id = ? AND chemin_source = ?',
      [runId, cheminSource]
    )
    const ligne = this.db.get<{ nombre_tentatives: number }>(
      'SELECT nombre_tentatives FROM run_files WHERE run_id = ? AND chemin_source = ?',
      [runId, cheminSource]
    )
    return ligne?.nombre_tentatives ?? 0
  }

  // --- mirror_delete_queue ---

  planifierSuppressions(runId: number, chemins: string[]): void {
    this.db.transaction(() => {
      for (const chemin of chemins) {
        this.db.run(
          `INSERT OR REPLACE INTO mirror_delete_queue (run_id, chemin_destination, etat) VALUES (?, ?, 'delete_pending')`,
          [runId, chemin]
        )
      }
    })
  }

  suppressionsEnAttente(runId: number): string[] {
    return this.db
      .all<{ chemin_destination: string }>(
        `SELECT chemin_destination FROM mirror_delete_queue WHERE run_id = ? AND etat = 'delete_pending'`,
        [runId]
      )
      .map((l) => l.chemin_destination)
  }

  marquerSupprime(runId: number, cheminDestination: string): void {
    this.db.run(
      `UPDATE mirror_delete_queue SET etat = 'deleted' WHERE run_id = ? AND chemin_destination = ?`,
      [runId, cheminDestination]
    )
  }

  // --- run_log (journal detaille) ---

  journaliser(runId: number | null, niveau: NiveauJournal, message: string, chemin: string | null = null): void {
    this.db.run(
      'INSERT INTO run_log (run_id, horodatage, niveau, message, chemin) VALUES (?, ?, ?, ?, ?)',
      [runId, Date.now(), niveau, message, chemin]
    )
  }

  journalDuRun(runId: number): EntreeJournal[] {
    return this.db
      .all<{
        id: number
        run_id: number | null
        horodatage: number
        niveau: string
        message: string
        chemin: string | null
      }>('SELECT * FROM run_log WHERE run_id = ? ORDER BY horodatage ASC', [runId])
      .map((l) => ({
        id: l.id,
        runId: l.run_id,
        horodatage: l.horodatage,
        niveau: l.niveau as NiveauJournal,
        message: l.message,
        chemin: l.chemin
      }))
  }

  purgerJournauxAnterieurs(horodatageLimite: number): void {
    this.db.run('DELETE FROM run_log WHERE horodatage < ?', [horodatageLimite])
  }
}
