/**
 * Verification de bout en bout du moteur de sauvegarde, hors interface graphique.
 * Execution : npx tsx scripts/tests/test-engine.ts
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile, readFile, rm, stat, appendFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { Database } from '../../src/main/db/database'
import { JobsRepo } from '../../src/main/db/jobsRepo'
import { RunsRepo } from '../../src/main/db/runsRepo'
import { ManifestRepo } from '../../src/main/db/manifestRepo'
import { executerSauvegardeComplete } from '../../src/main/backup/modes/complete'
import { executerSauvegardeIncrementielle } from '../../src/main/backup/modes/incremental'
import { executerSynchronisationMiroir, confirmerSuppressionsMiroir } from '../../src/main/backup/modes/mirror'
import { preparerReprise } from '../../src/main/backup/resumeManager'
import { copierFichierAtomique, cheminTemporaire } from '../../src/main/backup/copyEngine'
import { verifierIntegriteFichier } from '../../src/main/backup/integrity'
import { PARAMETRES_AVANCES_DEFAUT } from '../../src/shared/types'
import type { NouveauJob, ProgressionRun } from '../../src/shared/types'

const RACINE = 'C:/Users/calib/AppData/Local/Temp/claude/E--developpement/1ec482b5-af66-4a87-9482-49b801674d07/scratchpad/sauvegardepro-test'

let reussites = 0
let echecs = 0

async function scenario(nom: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
    reussites++
    console.log(`OK   ${nom}`)
  } catch (erreur) {
    echecs++
    console.error(`FAIL ${nom}`)
    console.error(erreur instanceof Error ? erreur.stack : erreur)
  }
}

function progressionSilencieuse(_p: ProgressionRun): void {}

function jobParDefaut(overrides: Partial<NouveauJob>): NouveauJob {
  return {
    nom: 'job-test',
    sources: [],
    destination: '',
    mode: 'complete',
    planification: { type: 'manuel' },
    exclusions: { extensions: [], dossiers: [], fichiers: [] },
    parametres: { ...PARAMETRES_AVANCES_DEFAUT },
    actif: true,
    ...overrides
  }
}

async function main(): Promise<void> {
  await rm(RACINE, { recursive: true, force: true })
  await mkdir(RACINE, { recursive: true })

  const db = await Database.ouvrir(join(RACINE, 'test.db'))
  const jobsRepo = new JobsRepo(db)
  const runsRepo = new RunsRepo(db)
  const manifestRepo = new ManifestRepo(db)

  // --- Scenario 1 : sauvegarde complete + filtres d'exclusion ---
  await scenario('Sauvegarde complete copie les fichiers et respecte les exclusions', async () => {
    const source = join(RACINE, 'source1')
    const dest = join(RACINE, 'dest1')
    await mkdir(join(source, 'sous_dossier'), { recursive: true })
    await mkdir(join(source, 'dossier_exclu'), { recursive: true })
    await writeFile(join(source, 'a.txt'), 'contenu A')
    await writeFile(join(source, 'sous_dossier', 'b.txt'), 'contenu B')
    await writeFile(join(source, 'exclu.tmp'), 'ne doit pas etre copie')
    await writeFile(join(source, 'dossier_exclu', 'c.txt'), 'ne doit pas etre copie non plus')

    const job = jobsRepo.creer(
      jobParDefaut({
        nom: 'complete-1',
        sources: [source],
        destination: dest,
        mode: 'complete',
        exclusions: { extensions: ['.tmp'], dossiers: ['dossier_exclu'], fichiers: [] }
      })
    )

    const runId = await executerSauvegardeComplete(db, runsRepo, manifestRepo, job, progressionSilencieuse, new AbortController().signal)
    const run = runsRepo.obtenirRun(runId)
    assert.equal(run?.statut, 'termine')
    assert.equal(run?.fichiersCopies, 2)

    const dossierVersion = runsRepo.versionDossierRun(runId)
    assert.ok(dossierVersion)
    const base = join(dest, 'versions', dossierVersion!, 'source1')
    assert.equal(await readFile(join(base, 'a.txt'), 'utf8'), 'contenu A')
    assert.equal(await readFile(join(base, 'sous_dossier', 'b.txt'), 'utf8'), 'contenu B')
    assert.ok(!existsSync(join(base, 'exclu.tmp')), 'le fichier .tmp exclu ne doit pas exister')
    assert.ok(!existsSync(join(base, 'dossier_exclu')), 'le dossier exclu ne doit pas exister')
  })

  // --- Scenario 2 : sauvegarde incrementielle (hardlinks + purge de versions) ---
  await scenario('Sauvegarde incrementielle relie les fichiers inchanges et purge les anciennes versions', async () => {
    const source = join(RACINE, 'source2')
    const dest = join(RACINE, 'dest2')
    await mkdir(source, { recursive: true })
    await writeFile(join(source, 'stable.txt'), 'je ne change jamais')
    await writeFile(join(source, 'variable.txt'), 'version 1')

    const job = jobsRepo.creer(
      jobParDefaut({
        nom: 'incrementielle-1',
        sources: [source],
        destination: dest,
        mode: 'incrementielle',
        // 2 versions conservees le temps de verifier le hardlink, avant de tester la purge separement.
        parametres: { ...PARAMETRES_AVANCES_DEFAUT, nombreVersionsAConserver: 2 }
      })
    )

    const runId1 = await executerSauvegardeIncrementielle(db, runsRepo, manifestRepo, job, progressionSilencieuse, new AbortController().signal)
    const version1 = runsRepo.versionDossierRun(runId1)!

    // Modifie variable.txt (mtime different garanti par un contenu + attente courte) et laisse stable.txt intact.
    await new Promise((r) => setTimeout(r, 20))
    await writeFile(join(source, 'variable.txt'), 'version 2 modifiee')
    await writeFile(join(source, 'nouveau.txt'), 'fichier ajoute')

    const runId2 = await executerSauvegardeIncrementielle(db, runsRepo, manifestRepo, job, progressionSilencieuse, new AbortController().signal)
    const run2 = runsRepo.obtenirRun(runId2)
    assert.equal(run2?.statut, 'termine')
    const version2 = runsRepo.versionDossierRun(runId2)!

    assert.ok(existsSync(join(dest, 'versions', version1)), 'avec 2 versions a conserver, la version 1 doit encore exister')
    const stableV1 = join(dest, 'versions', version1, 'source2', 'stable.txt')
    const stableV2 = join(dest, 'versions', version2, 'source2', 'stable.txt')
    const [statV1, statV2] = await Promise.all([stat(stableV1), stat(stableV2)])
    assert.equal(statV1.ino, statV2.ino, 'le fichier inchange doit etre un hardlink vers la version precedente')

    const variableV2 = await readFile(join(dest, 'versions', version2, 'source2', 'variable.txt'), 'utf8')
    assert.equal(variableV2, 'version 2 modifiee')
    assert.ok(existsSync(join(dest, 'versions', version2, 'source2', 'nouveau.txt')))

    // Reduit la retention a 1 version et relance : les deux anciennes versions doivent etre purgees.
    const jobRetentionReduite = jobsRepo.mettreAJour(job.id, {
      ...job,
      parametres: { ...job.parametres, nombreVersionsAConserver: 1 }
    })
    const runId3 = await executerSauvegardeIncrementielle(
      db,
      runsRepo,
      manifestRepo,
      jobRetentionReduite,
      progressionSilencieuse,
      new AbortController().signal
    )
    const version3 = runsRepo.versionDossierRun(runId3)!

    assert.ok(!existsSync(join(dest, 'versions', version1)), 'la version 1 doit avoir ete purgee')
    assert.ok(!existsSync(join(dest, 'versions', version2)), 'la version 2 doit avoir ete purgee')
    assert.ok(existsSync(join(dest, 'versions', version3)), 'la version la plus recente doit rester')
  })

  // --- Scenario 3 : synchronisation miroir (ajout/suppression/mise a jour + disjoncteur de securite) ---
  await scenario('Synchronisation miroir met a jour, supprime et declenche le disjoncteur de securite', async () => {
    const source = join(RACINE, 'source3')
    const dest = join(RACINE, 'dest3')
    await mkdir(source, { recursive: true })
    for (let i = 0; i < 6; i++) {
      await writeFile(join(source, `fichier${i}.txt`), `contenu ${i}`)
    }

    const job = jobsRepo.creer(
      jobParDefaut({
        nom: 'miroir-1',
        sources: [source],
        destination: dest,
        mode: 'miroir'
      })
    )

    const r1 = await executerSynchronisationMiroir(db, runsRepo, jobsRepo, job, progressionSilencieuse, new AbortController().signal)
    assert.equal(runsRepo.obtenirRun(r1.runId)?.statut, 'termine')
    for (let i = 0; i < 6; i++) {
      assert.ok(existsSync(join(dest, 'source3', `fichier${i}.txt`)))
    }

    await rm(join(source, 'fichier0.txt'))
    await new Promise((r) => setTimeout(r, 20))
    await writeFile(join(source, 'fichier1.txt'), 'contenu modifie')

    const r2 = await executerSynchronisationMiroir(db, runsRepo, jobsRepo, job, progressionSilencieuse, new AbortController().signal)
    assert.equal(runsRepo.obtenirRun(r2.runId)?.statut, 'termine')
    assert.ok(!existsSync(join(dest, 'source3', 'fichier0.txt')), 'le fichier supprime de la source doit disparaitre de la destination')
    assert.equal(await readFile(join(dest, 'source3', 'fichier1.txt'), 'utf8'), 'contenu modifie')

    // Disjoncteur de securite : suppression massive simulee (seuils volontairement bas).
    const jobStrict = jobsRepo.creer(
      jobParDefaut({
        nom: 'miroir-strict',
        sources: [source],
        destination: dest,
        mode: 'miroir',
        parametres: { ...PARAMETRES_AVANCES_DEFAUT, seuilSuppressionPourcent: 10, seuilSuppressionAbsolu: 1 }
      })
    )
    // Premier run pour ce nouveau job : baseline (aucune suppression prevue, tout est nouveau/deja present).
    await executerSynchronisationMiroir(db, runsRepo, jobsRepo, jobStrict, progressionSilencieuse, new AbortController().signal)

    for (let i = 2; i < 6; i++) await rm(join(source, `fichier${i}.txt`))
    const r3 = await executerSynchronisationMiroir(db, runsRepo, jobsRepo, jobStrict, progressionSilencieuse, new AbortController().signal)
    assert.equal(r3.demandeConfirmation !== null, true, 'le disjoncteur doit demander une confirmation')
    assert.equal(runsRepo.obtenirRun(r3.runId)?.statut, 'confirmation_requise')
    assert.ok(existsSync(join(dest, 'source3', 'fichier2.txt')), 'aucune suppression ne doit avoir eu lieu avant confirmation')

    await confirmerSuppressionsMiroir(db, runsRepo, jobStrict, r3.runId, progressionSilencieuse, new AbortController().signal)
    assert.equal(runsRepo.obtenirRun(r3.runId)?.statut, 'termine')
    assert.ok(!existsSync(join(dest, 'source3', 'fichier2.txt')), 'les suppressions confirmees doivent etre appliquees')
  })

  // --- Scenario 4 : reprise apres interruption ---
  await scenario('La reprise nettoie les fichiers orphelins et remet les fichiers en attente', async () => {
    const source = join(RACINE, 'source4')
    const dest = join(RACINE, 'dest4')
    await mkdir(source, { recursive: true })
    await writeFile(join(source, 'x.txt'), 'donnee x')

    const job = jobsRepo.creer(jobParDefaut({ nom: 'reprise-1', sources: [source], destination: dest, mode: 'complete' }))
    const run = runsRepo.creerRun(job.id, '2020-01-01T00-00-00')
    const cheminDestination = join(dest, 'versions', '2020-01-01T00-00-00', 'source4', 'x.txt')

    runsRepo.planifierFichiers(run.id, [
      { cheminSource: join(source, 'x.txt'), cheminDestination, taille: 8, mtime: Date.now() }
    ])
    runsRepo.marquerEtatFichier(run.id, join(source, 'x.txt'), 'copying')

    const cheminOrphelin = cheminTemporaire(cheminDestination, run.id)
    await mkdir(join(dest, 'versions', '2020-01-01T00-00-00', 'source4'), { recursive: true })
    await writeFile(cheminOrphelin, 'ecriture partielle interrompue')

    await preparerReprise(runsRepo, run.id)

    const fichierApres = runsRepo.fichiersDuRun(run.id)[0]
    assert.equal(fichierApres.etat, 'pending', 'le fichier interrompu doit repasser a pending')
    assert.ok(!existsSync(cheminOrphelin), 'le fichier .part orphelin doit etre supprime')

    const runIdRepris = await executerSauvegardeComplete(
      db,
      runsRepo,
      manifestRepo,
      job,
      progressionSilencieuse,
      new AbortController().signal,
      run.id
    )
    assert.equal(runsRepo.obtenirRun(runIdRepris)?.statut, 'termine')
    assert.equal(await readFile(cheminDestination, 'utf8'), 'donnee x')
  })

  // --- Scenario 5 : verification d'integrite detecte une corruption ---
  await scenario("La verification d'integrite detecte un fichier corrompu apres coup", async () => {
    const source = join(RACINE, 'source5')
    const dest = join(RACINE, 'dest5')
    await mkdir(source, { recursive: true })
    await mkdir(dest, { recursive: true })
    await writeFile(join(source, 'y.bin'), 'a'.repeat(10_000))

    const destinationFinale = join(dest, 'y.bin')
    const resultat = await copierFichierAtomique({
      cheminSource: join(source, 'y.bin'),
      cheminDestinationFinal: destinationFinale,
      runId: 999,
      limiteOctetsParSeconde: null,
      calculerHash: true
    })
    assert.ok(resultat.hash)

    const intactAvant = await verifierIntegriteFichier(destinationFinale, resultat.hash!)
    assert.equal(intactAvant, true)

    await appendFile(destinationFinale, 'corruption')
    const intactApres = await verifierIntegriteFichier(destinationFinale, resultat.hash!)
    assert.equal(intactApres, false, 'la corruption doit etre detectee')
  })

  // --- Scenario 6 : limiteur de debit ---
  await scenario('Le limiteur de debit ralentit reellement la copie', async () => {
    const source = join(RACINE, 'source6')
    const dest = join(RACINE, 'dest6')
    await mkdir(source, { recursive: true })
    await mkdir(dest, { recursive: true })
    const taille = 512 * 1024 // 512 Ko
    await writeFile(join(source, 'z.bin'), Buffer.alloc(taille, 1))

    const limiteOctetsParSeconde = 128 * 1024 // 128 Ko/s -> ~4s attendues
    const debut = Date.now()
    await copierFichierAtomique({
      cheminSource: join(source, 'z.bin'),
      cheminDestinationFinal: join(dest, 'z.bin'),
      runId: 998,
      limiteOctetsParSeconde,
      calculerHash: false
    })
    const dureeMs = Date.now() - debut
    assert.ok(dureeMs >= 1500, `la copie limitee a ${limiteOctetsParSeconde} o/s aurait du prendre du temps (mesure: ${dureeMs}ms)`)
  })

  await db.fermer()

  console.log(`\n${reussites} reussite(s), ${echecs} echec(s)`)
  if (echecs > 0) process.exit(1)
}

main().catch((erreur) => {
  console.error('Erreur fatale du script de test :', erreur)
  process.exit(1)
})
