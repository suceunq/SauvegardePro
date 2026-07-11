import { existsSync, readFileSync } from 'node:fs'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import initSqlJs from 'sql.js'
import { SCHEMA_SQL } from './schema'

type SqlJsDatabase = initSqlJs.Database
type SqlValue = initSqlJs.SqlValue

const FLUSH_DELAY_MS = 200

export type ParametresSql = SqlValue[] | Record<string, SqlValue>

export class Database {
  private constructor(
    private readonly db: SqlJsDatabase,
    private readonly dbPath: string
  ) {}

  static async ouvrir(dbPath: string): Promise<Database> {
    await mkdir(dirname(dbPath), { recursive: true })

    const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')
    const wasmFile = readFileSync(wasmPath)
    const wasmBinary = wasmFile.buffer.slice(wasmFile.byteOffset, wasmFile.byteOffset + wasmFile.byteLength) as ArrayBuffer
    const SQL = await initSqlJs({ wasmBinary })

    const db = existsSync(dbPath) ? new SQL.Database(readFileSync(dbPath)) : new SQL.Database()
    db.run('PRAGMA foreign_keys = ON;')
    db.run(SCHEMA_SQL)

    return new Database(db, dbPath)
  }

  run(sql: string, params: ParametresSql = []): void {
    this.db.run(sql, params)
    this.planifierFlush()
  }

  all<T = Record<string, SqlValue>>(sql: string, params: ParametresSql = []): T[] {
    const stmt = this.db.prepare(sql)
    try {
      stmt.bind(params)
      const lignes: T[] = []
      while (stmt.step()) {
        lignes.push(stmt.getAsObject() as T)
      }
      return lignes
    } finally {
      stmt.free()
    }
  }

  get<T = Record<string, SqlValue>>(sql: string, params: ParametresSql = []): T | undefined {
    return this.all<T>(sql, params)[0]
  }

  transaction<T>(fn: () => T): T {
    this.db.run('BEGIN TRANSACTION;')
    try {
      const resultat = fn()
      this.db.run('COMMIT;')
      this.planifierFlush()
      return resultat
    } catch (erreur) {
      this.db.run('ROLLBACK;')
      throw erreur
    }
  }

  dernierIdInsere(): number {
    const ligne = this.get<{ id: number }>('SELECT last_insert_rowid() AS id;')
    return ligne?.id ?? 0
  }

  private flushEnCours: Promise<void> | null = null
  private flushMinuteur: ReturnType<typeof setTimeout> | null = null
  private flushDemandeeApres = false

  private planifierFlush(): void {
    if (this.flushMinuteur) return
    this.flushMinuteur = setTimeout(() => {
      this.flushMinuteur = null
      void this.flush()
    }, FLUSH_DELAY_MS)
  }

  async flush(): Promise<void> {
    if (this.flushEnCours) {
      this.flushDemandeeApres = true
      return this.flushEnCours
    }

    this.flushEnCours = this.ecrireSurDisque().finally(() => {
      this.flushEnCours = null
      if (this.flushDemandeeApres) {
        this.flushDemandeeApres = false
        void this.flush()
      }
    })

    return this.flushEnCours
  }

  private async ecrireSurDisque(): Promise<void> {
    const donnees = Buffer.from(this.db.export())
    const cheminTemp = `${this.dbPath}.tmp-${process.pid}`
    await writeFile(cheminTemp, donnees)
    await rename(cheminTemp, this.dbPath)
  }

  async fermer(): Promise<void> {
    if (this.flushMinuteur) {
      clearTimeout(this.flushMinuteur)
      this.flushMinuteur = null
    }
    await this.flush()
    this.db.close()
  }
}
