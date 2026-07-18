import { ipcMain } from 'electron'
import { CANAUX_IPC } from '@shared/ipc'
import type { DependancesIpc } from './types'
import { restaurerFichiers } from '../backup/restoreService'
import { obtenirCleChiffrement } from '../backup/encryptionKey'
import { validerChemin, validerId } from './validation'
import { tMain } from '../i18n'

export function enregistrerRunsIpc(deps: DependancesIpc): void {
  ipcMain.handle(CANAUX_IPC.runsRecents, (_e, jobId?: number) => { if (jobId !== undefined) validerId(jobId, 'job'); return deps.runsRepo.runsRecents(jobId) })
  ipcMain.handle(CANAUX_IPC.runsJournal, (_e, runId: number) => { validerId(runId, 'run'); return deps.runsRepo.journalDuRun(runId) })
  ipcMain.handle(CANAUX_IPC.runsFichiers, (_e, runId: number) => { validerId(runId, 'run'); return deps.runsRepo.fichiersDuRun(runId) })
  ipcMain.handle(CANAUX_IPC.runsRestaurer, async (_e, runId: number, destination: string, cheminsSource?: string[]) => {
    validerId(runId, 'run')
    validerChemin(destination, 'destination de restauration')
    if (cheminsSource !== undefined && (!Array.isArray(cheminsSource) || cheminsSource.some((c) => typeof c !== 'string'))) throw new Error(tMain('main.invalidPrefix', { detail: tMain('main.invalidData') }))
    const run = deps.runsRepo.obtenirRun(runId)
    if (!run) throw new Error(tMain('main.runNotFound'))
    const job = deps.jobsRepo.obtenir(run.jobId)
    if (!job) throw new Error(tMain('main.jobNotFound'))
    const tous = deps.runsRepo.fichiersDuRun(runId)
    const selection = cheminsSource?.length ? tous.filter((f) => cheminsSource.includes(f.cheminSource)) : tous
    const cleChiffrement = job.parametres.chiffrementActif ? await obtenirCleChiffrement() : null
    const resultat = await restaurerFichiers(selection, destination, job.sources, cleChiffrement)
    deps.runsRepo.journaliser(runId, resultat.erreurs.length ? 'avertissement' : 'info', tMain('main.restoreSummary', { restored: resultat.fichiersRestaures, errors: resultat.erreurs.length }))
    return resultat
  })

  ipcMain.handle(CANAUX_IPC.runsConfirmerMiroir, async (_e, jobId: number, runId: number) => {
    validerId(jobId, 'job')
    validerId(runId, 'run')
    await deps.backupService.confirmerMiroir(jobId, runId)
  })
}
