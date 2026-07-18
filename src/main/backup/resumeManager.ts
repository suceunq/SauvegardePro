import { unlink } from 'node:fs/promises'
import type { Run } from '@shared/types'
import type { RunsRepo } from '../db/runsRepo'
import { cheminTemporaire } from './copyEngine'
import { tMain } from '../i18n'

/** A appeler au demarrage de l'application : tout run reste "en_cours" signale un arret brutal. */
export function detecterRunsInterrompus(runsRepo: RunsRepo): Run[] {
  const interrompus = runsRepo.runsInterrompus()
  for (const run of interrompus) {
    runsRepo.marquerInterrompu(run.id)
    runsRepo.journaliser(run.id, 'avertissement', tMain('main.unexpectedStop'))
  }
  return interrompus
}

/**
 * Remet un run interrompu dans un etat surement reprenable :
 * - "copying" : le fichier temporaire est orphelin (ecriture jamais terminee) -> supprime, refait a zero.
 * - "verifying" : le fichier final existe deja sur disque -> on relance seulement la verification.
 * - "pending"/"copied"/"done"/"failed" : deja dans un etat coherent, inchange.
 */
export async function preparerReprise(runsRepo: RunsRepo, runId: number): Promise<void> {
  const fichiers = runsRepo.fichiersDuRun(runId)

  for (const fichier of fichiers) {
    if (fichier.etat === 'copying') {
      const cheminTemp = cheminTemporaire(fichier.cheminDestination, runId)
      await unlink(cheminTemp).catch(() => {})
      runsRepo.marquerEtatFichier(runId, fichier.cheminSource, 'pending')
    } else if (fichier.etat === 'verifying') {
      runsRepo.marquerEtatFichier(runId, fichier.cheminSource, 'copied')
    }
  }

  runsRepo.journaliser(runId, 'info', tMain('main.resumePrepared', { count: fichiers.length }))
}
