import { ipcMain } from 'electron'
import { CANAUX_IPC } from '@shared/ipc'
import type { DependancesIpc } from './types'
import { restaurerFichiers } from '../backup/restoreService'
import { validerChemin, validerId } from './validation'

export function enregistrerRunsIpc(deps: DependancesIpc): void {
  ipcMain.handle(CANAUX_IPC.runsRecents, (_e, jobId?: number) => { if (jobId !== undefined) validerId(jobId, 'job'); return deps.runsRepo.runsRecents(jobId) })
  ipcMain.handle(CANAUX_IPC.runsJournal, (_e, runId: number) => { validerId(runId, 'run'); return deps.runsRepo.journalDuRun(runId) })
  ipcMain.handle(CANAUX_IPC.runsFichiers, (_e, runId: number) => { validerId(runId, 'run'); return deps.runsRepo.fichiersDuRun(runId) })
  ipcMain.handle(CANAUX_IPC.runsRestaurer, async (_e, runId: number, destination: string, cheminsSource?: string[]) => {
    validerId(runId, 'run')
    validerChemin(destination, 'destination de restauration')
    if (cheminsSource !== undefined && (!Array.isArray(cheminsSource) || cheminsSource.some((c) => typeof c !== 'string'))) throw new Error('Donnees invalides : selection de fichiers incorrecte')
    const run = deps.runsRepo.obtenirRun(runId)
    if (!run) throw new Error('Run introuvable')
    const job = deps.jobsRepo.obtenir(run.jobId)
    if (!job) throw new Error('Job introuvable')
    const tous = deps.runsRepo.fichiersDuRun(runId)
    const selection = cheminsSource?.length ? tous.filter((f) => cheminsSource.includes(f.cheminSource)) : tous
    const resultat = await restaurerFichiers(selection, destination, job.sources)
    deps.runsRepo.journaliser(runId, resultat.erreurs.length ? 'avertissement' : 'info', `Restauration : ${resultat.fichiersRestaures} fichier(s), ${resultat.erreurs.length} erreur(s)`)
    return resultat
  })

  ipcMain.handle(CANAUX_IPC.runsConfirmerMiroir, async (_e, jobId: number, runId: number) => {
    validerId(jobId, 'job')
    validerId(runId, 'run')
    await deps.backupService.confirmerMiroir(jobId, runId)
  })
}
