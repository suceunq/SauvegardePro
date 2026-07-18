import { isAbsolute, relative, resolve } from 'node:path'
import type { NouveauJob, Parametres } from '@shared/types'
import { LANGUES } from '../../shared/i18n'
import { tMain } from '../i18n'

function exiger(condition: unknown, _message: string): asserts condition {
  if (!condition) throw new Error(tMain('main.invalidPrefix', { detail: tMain('main.invalidData') }))
}

export function validerId(valeur: unknown, nom = 'identifiant'): asserts valeur is number {
  exiger(typeof valeur === 'number' && Number.isSafeInteger(valeur) && valeur > 0, `${nom} incorrect`)
}

export function validerChemin(valeur: unknown, nom: string): asserts valeur is string {
  exiger(typeof valeur === 'string' && valeur.trim().length > 0, `${nom} vide`)
  exiger(valeur.length <= 32_767 && isAbsolute(valeur), `${nom} doit etre un chemin absolu`)
  exiger(!valeur.includes('\0'), `${nom} contient un caractere interdit`)
}

function cheminsSeChevauchent(a: string, b: string): boolean {
  const aNormalise = resolve(a)
  const bNormalise = resolve(b)
  const relAB = relative(aNormalise, bNormalise)
  const relBA = relative(bNormalise, aNormalise)
  const estInclus = (rel: string): boolean => rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
  return estInclus(relAB) || estInclus(relBA)
}

export function validerNouveauJob(job: unknown): asserts job is NouveauJob {
  exiger(!!job && typeof job === 'object', 'configuration de sauvegarde absente')
  const j = job as Partial<NouveauJob>
  exiger(typeof j.nom === 'string' && j.nom.trim().length > 0 && j.nom.length <= 200, 'nom incorrect')
  exiger(Array.isArray(j.sources) && j.sources.length > 0, 'au moins une source est requise')
  exiger(j.sources.length <= 100, 'trop de sources')
  for (const source of j.sources) validerChemin(source, 'source')
  validerChemin(j.destination, 'destination')
  exiger(new Set(j.sources.map((s) => resolve(s).toLowerCase())).size === j.sources.length, 'sources en double')
  exiger(!j.sources.some((source) => cheminsSeChevauchent(source, j.destination!)), 'une source et la destination ne doivent pas se chevaucher')
  exiger(j.mode === 'complete' || j.mode === 'incrementielle' || j.mode === 'miroir', 'mode inconnu')

  const p = j.planification
  exiger(!!p && (p.type === 'manuel' || p.type === 'planifie' || p.type === 'demarrage'), 'planification incorrecte')
  if (p.type === 'planifie') {
    exiger(p.frequence === 'quotidienne' || p.frequence === 'hebdomadaire' || p.frequence === 'intervalle', 'frequence incorrecte')
    if (p.frequence === 'intervalle') exiger(Number.isInteger(p.intervalleMinutes) && p.intervalleMinutes! >= 1, 'intervalle incorrect')
    else exiger(typeof p.heure === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(p.heure), 'heure incorrecte')
    if (p.frequence === 'hebdomadaire') exiger(Array.isArray(p.joursSemaine) && p.joursSemaine.length > 0 && p.joursSemaine.every((v) => Number.isInteger(v) && v >= 0 && v <= 6), 'jours incorrects')
  }

  const exclusions = j.exclusions
  exiger(!!exclusions && ['extensions', 'dossiers', 'fichiers'].every((cle) => Array.isArray(exclusions[cle as keyof typeof exclusions]) && exclusions[cle as keyof typeof exclusions].every((v) => typeof v === 'string')), 'exclusions incorrectes')

  const a = j.parametres
  exiger(!!a, 'parametres avances absents')
  exiger(a.limiteDebitKoS === null || (Number.isFinite(a.limiteDebitKoS) && a.limiteDebitKoS > 0), 'limite de debit incorrecte')
  exiger(Number.isInteger(a.nombreVersionsAConserver) && a.nombreVersionsAConserver >= 1 && a.nombreVersionsAConserver <= 10_000, 'nombre de versions incorrect')
  exiger(typeof a.verifierIntegrite === 'boolean', 'verification d\'integrite incorrecte')
  exiger(Number.isFinite(a.seuilSuppressionPourcent) && a.seuilSuppressionPourcent >= 0 && a.seuilSuppressionPourcent <= 100, 'seuil miroir en pourcentage incorrect')
  exiger(Number.isInteger(a.seuilSuppressionAbsolu) && a.seuilSuppressionAbsolu >= 0, 'seuil miroir absolu incorrect')
  exiger(Number.isInteger(a.nombreTentatives) && a.nombreTentatives >= 0 && a.nombreTentatives <= 100, 'nombre de tentatives incorrect')
  exiger(typeof a.chiffrementActif === 'boolean', 'option de chiffrement incorrecte')
  exiger(typeof j.actif === 'boolean', 'etat actif incorrect')
}

export function validerParametres(parametres: unknown): asserts parametres is Parametres {
  exiger(!!parametres && typeof parametres === 'object', 'parametres absents')
  const p = parametres as Parametres
  exiger(p.langue === 'auto' || LANGUES.includes(p.langue), 'langue incorrecte')
  exiger(p.limiteDebitKoS === null || (Number.isFinite(p.limiteDebitKoS) && p.limiteDebitKoS > 0), 'limite de debit incorrecte')
  exiger(Number.isInteger(p.nombreVersionsParDefaut) && p.nombreVersionsParDefaut >= 1 && p.nombreVersionsParDefaut <= 10_000, 'nombre de versions incorrect')
  exiger(
    typeof p.verifierIntegriteParDefaut === 'boolean' &&
      typeof p.demarrerAvecWindows === 'boolean' &&
      typeof p.afficherBienvenueAuDemarrage === 'boolean' &&
      typeof p.themeSombre === 'boolean',
    'option booleenne incorrecte'
  )
  exiger(Number.isInteger(p.conserverJournauxJours) && p.conserverJournauxJours >= 1 && p.conserverJournauxJours <= 36_500, 'retention des journaux incorrecte')
  exiger(p.algorithmeHash === 'sha256', 'algorithme de hash incorrect')
  exiger(!!p.notifications && Object.values(p.notifications).every((v) => typeof v === 'boolean'), 'notifications incorrectes')
}
