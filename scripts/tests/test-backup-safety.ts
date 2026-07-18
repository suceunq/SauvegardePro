import assert from 'node:assert/strict'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { evaluerSuppressionsMiroir } from '../../src/main/backup/mirrorSafetyGate'
import { cheminRelatifRestauration, restaurerFichiers } from '../../src/main/backup/restoreService'
import { PARAMETRES_AVANCES_DEFAUT } from '../../src/shared/types'
import type { RunFile } from '../../src/shared/types'

// --- Disjoncteur de suppressions en mode miroir -----------------------------------------------
// Une source injoignable ne doit jamais se traduire par "dossier vide -> tout supprimer" : ce test
// documente que le calcul lui-meme (evaluerSuppressionsMiroir) ne recoit deja plus de candidats
// dans ce cas (le garde-fou est en amont, dans sourcesAccessibles) et qu'ici, un lot de suppressions
// depassant le seuil est toujours bloque tant qu'il n'est pas confirme explicitement.
{
  const parametres = { ...PARAMETRES_AVANCES_DEFAUT, seuilSuppressionPourcent: 20, seuilSuppressionAbsolu: 1000 }
  const resultat = evaluerSuppressionsMiroir(1, 1, ['a', 'b', 'c'], new Set(), 10, parametres)
  assert.equal(resultat.autorise, false, 'suppression de 30% des fichiers connus doit exiger confirmation')
  assert.ok(resultat.demandeConfirmation, 'une demande de confirmation doit etre generee')
  assert.equal(resultat.demandeConfirmation?.pourcentage, 30)
}

{
  const parametres = { ...PARAMETRES_AVANCES_DEFAUT, seuilSuppressionPourcent: 80, seuilSuppressionAbsolu: 1000 }
  const resultat = evaluerSuppressionsMiroir(1, 1, ['a'], new Set(), 10, parametres)
  assert.equal(resultat.autorise, true, 'sous le seuil, la suppression doit etre autorisee sans confirmation')
  assert.equal(resultat.demandeConfirmation, null)
}

{
  // Seuil absolu : un petit dossier ou 2 suppressions representent 100% des fichiers connus ne doit
  // pas forcer la confirmation si le nombre absolu reste sous le seuil configure.
  const parametres = { ...PARAMETRES_AVANCES_DEFAUT, seuilSuppressionPourcent: 200, seuilSuppressionAbsolu: 5 }
  const resultat = evaluerSuppressionsMiroir(1, 1, ['a', 'b'], new Set(), 2, parametres)
  assert.equal(resultat.autorise, true)
}

{
  // Les suppressions situees sous un sous-arbre dont l'enumeration a echoue sont exclues du calcul :
  // on ne doit jamais supprimer sur la base d'une liste potentiellement incomplete.
  const parametres = { ...PARAMETRES_AVANCES_DEFAUT, seuilSuppressionPourcent: 0, seuilSuppressionAbsolu: 0 }
  const resultat = evaluerSuppressionsMiroir(
    1,
    1,
    ['C:\\Source\\dossier-incomplet\\a.txt', 'C:\\Source\\dossier-ok\\b.txt'],
    new Set(['C:\\Source\\dossier-incomplet']),
    10,
    parametres
  )
  assert.deepEqual(resultat.suppressionsFiltrees, ['C:\\Source\\dossier-ok\\b.txt'])
}

// --- Anti-traversee de chemin a la restauration -----------------------------------------------
{
  const sources = ['C:\\Documents']
  const rel = cheminRelatifRestauration('C:\\Documents\\sous-dossier\\fichier.txt', sources)
  assert.equal(rel, join('Documents', 'sous-dossier', 'fichier.txt'))
}

{
  // Un chemin en dehors de toutes les racines source enregistrees doit etre rejete plutot que
  // resolu approximativement (protection contre une entree de manifeste corrompue ou detournee).
  const sources = ['C:\\Documents']
  assert.throws(() => cheminRelatifRestauration('C:\\Windows\\System32\\evil.dll', sources))
}

{
  // La racine la plus specifique (la plus longue) doit gagner quand plusieurs sources s'emboitent.
  const sources = ['C:\\Documents', 'C:\\Documents\\Projet']
  const rel = cheminRelatifRestauration('C:\\Documents\\Projet\\notes.txt', sources)
  assert.ok(rel.startsWith('Projet'), `attendu un chemin relatif a la source la plus specifique, obtenu : ${rel}`)
}

// --- restaurerFichiers : integration avec de vrais fichiers -------------------------------------
async function testerRestaurationIntegrale(): Promise<void> {
  const racine = await mkdtemp(join(tmpdir(), 'sauvegardepro-test-'))
  try {
    const source = join(racine, 'source')
    const stockage = join(racine, 'stockage')
    const destination = join(racine, 'destination')
    await mkdir(source, { recursive: true })
    await mkdir(stockage, { recursive: true })
    await mkdir(destination, { recursive: true })

    const cheminSource = join(source, 'notes.txt')
    const cheminStocke = join(stockage, 'notes.txt')
    await writeFile(cheminStocke, 'contenu de test', 'utf8')

    const fichiers: RunFile[] = [
      {
        id: 1,
        runId: 1,
        cheminSource,
        cheminDestination: cheminStocke,
        etat: 'done',
        taille: 16,
        hashSource: null
      } as RunFile
    ]

    const resultat = await restaurerFichiers(fichiers, destination, [source])
    assert.equal(resultat.fichiersRestaures, 1)
    assert.equal(resultat.erreurs.length, 0)

    // Une seconde restauration ne doit pas ecraser silencieusement le fichier deja restaure.
    const resultat2 = await restaurerFichiers(fichiers, destination, [source])
    assert.equal(resultat2.fichiersIgnores, 1)
    assert.equal(resultat2.fichiersRestaures, 0)
  } finally {
    await rm(racine, { recursive: true, force: true })
  }
}

testerRestaurationIntegrale()
  .then(() => {
    console.log('Garde-fous de sauvegarde/restauration verifies : disjoncteur miroir et anti-traversee de chemin.')
  })
  .catch((erreur) => {
    console.error(erreur)
    process.exitCode = 1
  })
