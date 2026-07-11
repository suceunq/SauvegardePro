export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  sources TEXT NOT NULL,
  destination TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('complete','incrementielle','miroir')),
  planification TEXT NOT NULL,
  exclusions TEXT NOT NULL,
  parametres TEXT NOT NULL,
  actif INTEGER NOT NULL DEFAULT 1,
  cree_le INTEGER NOT NULL,
  modifie_le INTEGER NOT NULL,
  volume_serial TEXT
);

CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  statut TEXT NOT NULL CHECK (statut IN ('planification','en_cours','interrompu','confirmation_requise','termine','echec','annule')),
  demarre_le INTEGER NOT NULL,
  termine_le INTEGER,
  fichiers_copies INTEGER NOT NULL DEFAULT 0,
  fichiers_mis_a_jour INTEGER NOT NULL DEFAULT 0,
  fichiers_supprimes INTEGER NOT NULL DEFAULT 0,
  fichiers_ignores INTEGER NOT NULL DEFAULT 0,
  fichiers_en_erreur INTEGER NOT NULL DEFAULT 0,
  octets_transferes INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  version_dossier TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_job ON runs(job_id);
CREATE INDEX IF NOT EXISTS idx_runs_statut ON runs(statut);

CREATE TABLE IF NOT EXISTS run_files (
  run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  chemin_source TEXT NOT NULL,
  chemin_destination TEXT NOT NULL,
  etat TEXT NOT NULL,
  taille_source INTEGER,
  mtime_source INTEGER,
  hash_source TEXT,
  chemin_temp TEXT,
  nombre_tentatives INTEGER NOT NULL DEFAULT 0,
  derniere_erreur TEXT,
  PRIMARY KEY (run_id, chemin_source)
);
CREATE INDEX IF NOT EXISTS idx_run_files_state ON run_files(run_id, etat);

CREATE TABLE IF NOT EXISTS manifest (
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  run_id INTEGER NOT NULL,
  chemin_relatif TEXT NOT NULL,
  taille INTEGER NOT NULL,
  mtime INTEGER NOT NULL,
  hash TEXT,
  PRIMARY KEY (job_id, run_id, chemin_relatif)
);
CREATE INDEX IF NOT EXISTS idx_manifest_job ON manifest(job_id, run_id);

CREATE TABLE IF NOT EXISTS mirror_delete_queue (
  run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  chemin_destination TEXT NOT NULL,
  etat TEXT NOT NULL CHECK (etat IN ('delete_pending','deleted')),
  PRIMARY KEY (run_id, chemin_destination)
);

CREATE TABLE IF NOT EXISTS run_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER REFERENCES runs(id) ON DELETE CASCADE,
  horodatage INTEGER NOT NULL,
  niveau TEXT NOT NULL CHECK (niveau IN ('info','avertissement','erreur')),
  message TEXT NOT NULL,
  chemin TEXT
);
CREATE INDEX IF NOT EXISTS idx_run_log_run ON run_log(run_id);

CREATE TABLE IF NOT EXISTS settings (
  cle TEXT PRIMARY KEY,
  valeur TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS network_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  chemin TEXT NOT NULL UNIQUE,
  ajoute_le INTEGER NOT NULL
);
`
