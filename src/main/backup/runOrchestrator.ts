import { rm, rmdir, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import type { Job, ProgressionRun, Run, RunFile } from '@shared/types'
import type { Database } from '../db/database'
import type { RunsRepo } from '../db/runsRepo'
import type { LigneManifest } from '../db/manifestRepo'
import { copierFichierAtomique } from './copyEngine'
import { verifierIntegriteFichier } from './integrity'
import { obtenirCleChiffrement } from './encryptionKey'
import { classifierErreur, decisionPourErreur, attendre, SurveillantDeconnexion } from './errorPolicy'
import { tMain } from '../i18n'

export class AnnulationError extends Error {
  constructor() {
    super(tMain('main.cancelled'))
    this.name = 'AnnulationError'
  }
}

export class AbandonRunError extends Error {
  constructor(
    message: string,
    public readonly interrompu = false
  ) {
    super(message)
    this.name = 'AbandonRunError'
  }
}

export interface ContexteExecution {
  db: Database
  runsRepo: RunsRepo
  job: Job
  run: Run
  emettre: (p: ProgressionRun) => void
  signal: AbortSignal
}

function estAbandon(erreur: unknown): erreur is DOMException {
  return erreur instanceof Error && erreur.name === 'AbortError'
}

/** Copie un fichier planifie en appliquant la politique de reessai/abandon et la verification d'integrite. */
async function traiterUnFichier(
  ctx: ContexteExecution,
  fichier: RunFile,
  surveillant: SurveillantDeconnexion,
  octetsCumules: { valeur: number }
): Promise<'copie' | 'mis_a_jour' | 'echoue'> {
  const { runsRepo, run, job } = ctx
  const parametres = job.parametres
  const estNouveau = fichier.etat === 'pending'
  let tentative = 0

  for (;;) {
    if (ctx.signal.aborted) throw new AnnulationError()

    try {
      runsRepo.marquerEtatFichier(run.id, fichier.cheminSource, 'copying')

      const cleChiffrement = parametres.chiffrementActif ? await obtenirCleChiffrement() : null

      const resultat = await copierFichierAtomique({
        cheminSource: fichier.cheminSource,
        cheminDestinationFinal: fichier.cheminDestination,
        runId: run.id,
        limiteOctetsParSeconde: parametres.limiteDebitKoS ? parametres.limiteDebitKoS * 1024 : null,
        calculerHash: parametres.verifierIntegrite,
        cleChiffrement,
        surProgression: (octets) => {
          octetsCumules.valeur += octets
        }
      })

      runsRepo.marquerEtatFichier(run.id, fichier.cheminSource, 'copied', { hashSource: resultat.hash })

      if (parametres.verifierIntegrite && resultat.hash) {
        runsRepo.marquerEtatFichier(run.id, fichier.cheminSource, 'verifying')
        const integre = await verifierIntegriteFichier(fichier.cheminDestination, resultat.hash, cleChiffrement)
        if (!integre) {
          throw Object.assign(new Error(tMain('main.integrityCopyFailed')), { code: 'EINTEGRITY' })
        }
      }

      runsRepo.marquerEtatFichier(run.id, fichier.cheminSource, 'done')
      runsRepo.incrementerCompteurs(run.id, {
        fichiersCopies: estNouveau ? 1 : 0,
        fichiersMisAJour: estNouveau ? 0 : 1,
        octetsTransferes: resultat.octets
      })
      return estNouveau ? 'copie' : 'mis_a_jour'
    } catch (erreur) {
      if (estAbandon(erreur)) throw new AnnulationError()

      const err = erreur as NodeJS.ErrnoException
      const classe = err.code === 'EINTEGRITY' ? 'inconnue' : classifierErreur(err)
      tentative = runsRepo.incrementerTentative(run.id, fichier.cheminSource)
      const decision = decisionPourErreur(classe, tentative, parametres.nombreTentatives)

      runsRepo.journaliser(run.id, 'avertissement', tMain('main.fileError', { path: fichier.cheminSource, error: err.message }), fichier.cheminSource)

      if (decision.abandonnerRun) {
        throw new AbandonRunError(tMain('main.diskFull', { error: err.message }))
      }

      const enRafale = surveillant.enregistrerEchec()
      if (enRafale) {
        throw new AbandonRunError(
          tMain('main.destinationDisconnected'),
          true
        )
      }

      if (decision.reessayer) {
        await attendre(decision.delaiMs)
        continue
      }

      runsRepo.marquerEtatFichier(run.id, fichier.cheminSource, 'failed', { derniereErreur: err.message })
      runsRepo.incrementerCompteurs(run.id, { fichiersEnErreur: 1 })
      runsRepo.journaliser(run.id, 'erreur', tMain('main.fileAbandoned', { count: tentative, path: fichier.cheminSource }), fichier.cheminSource)
      return 'echoue'
    }
  }
}

/** Boucle de copie commune aux trois modes : traite tous les fichiers planifies non termines. */
export async function executerCopies(ctx: ContexteExecution): Promise<void> {
  const tousLesFichiers = ctx.runsRepo.fichiersDuRun(ctx.run.id)
  const octetsTotal = tousLesFichiers.reduce((s, f) => s + (f.tailleSource ?? 0), 0)
  const aTraiter = tousLesFichiers.filter((f) => f.etat !== 'done' && f.etat !== 'failed')
  const octetsDejaFaits = tousLesFichiers
    .filter((f) => f.etat === 'done')
    .reduce((s, f) => s + (f.tailleSource ?? 0), 0)

  const octetsCumules = { valeur: octetsDejaFaits }
  const surveillant = new SurveillantDeconnexion()
  let traites = tousLesFichiers.length - aTraiter.length
  const debut = Date.now()

  for (const fichier of aTraiter) {
    if (ctx.signal.aborted) throw new AnnulationError()

    ctx.emettre({
      runId: ctx.run.id,
      jobId: ctx.job.id,
      fichierCourant: fichier.cheminSource,
      fichiersTraites: traites,
      fichiersTotal: tousLesFichiers.length,
      octetsTransferes: octetsCumules.valeur,
      octetsTotal,
      vitesseOctetsParSeconde: octetsCumules.valeur / Math.max(1, (Date.now() - debut) / 1000),
      phase: 'copie'
    })

    await traiterUnFichier(ctx, fichier, surveillant, octetsCumules)
    traites++
  }

  ctx.emettre({
    runId: ctx.run.id,
    jobId: ctx.job.id,
    fichierCourant: null,
    fichiersTraites: traites,
    fichiersTotal: tousLesFichiers.length,
    octetsTransferes: octetsCumules.valeur,
    octetsTotal,
    vitesseOctetsParSeconde: 0,
    phase: 'termine'
  })
}

/** Execute les suppressions planifiees (mode miroir) de maniere idempotente : deja-supprime = succes. */
export async function executerSuppressionsPlanifiees(ctx: ContexteExecution): Promise<void> {
  const suppressions = ctx.runsRepo.suppressionsEnAttente(ctx.run.id)

  for (const chemin of suppressions) {
    if (ctx.signal.aborted) throw new AnnulationError()
    try {
      await rm(chemin, { recursive: true, force: true })
    } catch (erreur) {
      const err = erreur as NodeJS.ErrnoException
      if (err.code !== 'ENOENT') {
        ctx.runsRepo.journaliser(ctx.run.id, 'erreur', tMain('main.deleteFailed', { path: chemin, error: err.message }), chemin)
        continue
      }
    }
    ctx.runsRepo.marquerSupprime(ctx.run.id, chemin)
    ctx.runsRepo.incrementerCompteurs(ctx.run.id, { fichiersSupprimes: 1 })
  }
}

export async function gererErreurRun(runsRepo: RunsRepo, runId: number, erreur: unknown): Promise<void> {
  if (erreur instanceof AnnulationError) {
    runsRepo.changerStatut(runId, 'annule', erreur.message)
    return
  }
  if (erreur instanceof AbandonRunError) {
    runsRepo.changerStatut(runId, erreur.interrompu ? 'interrompu' : 'echec', erreur.message)
    runsRepo.journaliser(runId, 'erreur', erreur.message)
    return
  }
  const message = erreur instanceof Error ? erreur.message : String(erreur)
  runsRepo.changerStatut(runId, 'echec', message)
  runsRepo.journaliser(runId, 'erreur', message)
}

/**
 * Construit les entrees de manifeste (pour le run suivant) directement a partir des lignes run_files :
 * aucune dependance au resultat du scan original, ce qui permet de finaliser un run repris sans le rescanner.
 */
export function construireEntreesManifeste(runFiles: RunFile[], dossierVersion: string): LigneManifest[] {
  return runFiles
    .filter((f) => f.etat === 'done')
    .map((f) => ({
      cheminRelatif: relative(dossierVersion, f.cheminDestination),
      taille: f.tailleSource ?? 0,
      mtime: f.mtimeSource ?? 0,
      hash: f.hashSource
    }))
}

/** Nettoyage cosmetique post-suppression : retire les dossiers devenus vides sous la racine donnee. */
export async function nettoyerDossiersVides(racine: string): Promise<void> {
  let entrees
  try {
    entrees = await readdir(racine, { withFileTypes: true })
  } catch {
    return
  }

  for (const entree of entrees) {
    if (!entree.isDirectory()) continue
    const chemin = join(racine, entree.name)
    await nettoyerDossiersVides(chemin)
    try {
      const contenu = await readdir(chemin)
      if (contenu.length === 0) await rmdir(chemin)
    } catch {
      // dossier non vide ou verrouille : on l'ignore simplement
    }
  }
}
