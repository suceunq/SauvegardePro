import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { LANGUES, TRADUCTIONS, detecterLangue, resoudreLangue, traduire, type CleTraduction } from '../../src/shared/i18n'
import { initialiserI18nMain, tMain } from '../../src/main/i18n'

const RACINE = join(import.meta.dirname, '..', '..')
const VARIABLES = {
  version: '1.2.3', id: 1, count: 2, name: 'Test', detail: 'Test', message: 'Test', path: 'C:\\Test',
  code: 'EACCES', error: 'Test', linked: 2, copy: 3, restored: 2, errors: 0, available: '1.2.3',
  current: '1.2.2', percent: 50, speed: 1.2, seconds: 10, done: 1, total: 2, copied: 1,
  updated: 1, deleted: 0, size: '1 MiB'
}

const cles = Object.keys(TRADUCTIONS.fr) as CleTraduction[]
for (const langue of LANGUES) {
  assert.deepEqual(Object.keys(TRADUCTIONS[langue]).sort(), [...cles].sort(), `catalogue ${langue} incomplet`)
  for (const cle of cles) {
    const texte = traduire(langue, cle, VARIABLES)
    assert.ok(texte.trim(), `${langue}.${cle} est vide`)
    assert.doesNotMatch(texte, /\{\w+\}/, `${langue}.${cle} contient une variable non resolue`)
  }
}

assert.equal(detecterLangue('en-US'), 'en')
assert.equal(detecterLangue('es_ES'), 'es')
assert.equal(detecterLangue('de-DE'), 'de')
assert.equal(detecterLangue('it-IT'), 'fr')
assert.equal(resoudreLangue('auto', 'de-DE'), 'de')
assert.equal(resoudreLangue('es', 'fr-FR'), 'es')
initialiserI18nMain('de-DE', () => 'auto')
assert.equal(tMain('main.notificationSuccessTitle'), 'Sicherung abgeschlossen')
initialiserI18nMain('fr-FR', () => 'auto')

const fichiersRenderer = [
  'App.tsx',
  'components/AboutDialog.tsx', 'components/ConfirmationMiroirModal.tsx', 'components/ExclusionEditor.tsx',
  'components/FeedbackDialog.tsx', 'components/ProgressBar.tsx', 'components/ScheduleEditor.tsx',
  'components/Sidebar.tsx', 'components/StatutBadge.tsx', 'components/UpdateNotesDialog.tsx',
  'pages/Dashboard.tsx', 'pages/HistoryPage.tsx', 'pages/JobsPage.tsx', 'pages/NewJobPage.tsx', 'pages/SettingsPage.tsx'
]

const textesAutorises = new Set(['SP', 'SauvegardePro', '✕', '/s', 'Français', 'English', 'Español', 'Deutsch'])
const placeholdersTechniques = new Set(['.tmp, .log, .bak', 'node_modules, $RECYCLE.BIN', 'desktop.ini, Thumbs.db'])

for (const relatif of fichiersRenderer) {
  const chemin = join(RACINE, 'src', 'renderer', relatif)
  const source = ts.createSourceFile(chemin, readFileSync(chemin, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const visiter = (noeud: ts.Node): void => {
    if (ts.isJsxText(noeud)) {
      const texte = noeud.text.replace(/\s+/g, ' ').trim()
      if (/[A-Za-zÀ-ÿ]/.test(texte) && !textesAutorises.has(texte)) {
        assert.fail(`${relatif}:${source.getLineAndCharacterOfPosition(noeud.pos).line + 1} contient du texte JSX code en dur : ${texte}`)
      }
    }
    if (ts.isJsxAttribute(noeud) && ['placeholder', 'title', 'aria-label', 'alt'].includes(noeud.name.getText(source))) {
      const valeur = noeud.initializer && ts.isStringLiteral(noeud.initializer) ? noeud.initializer.text : null
      if (valeur && !placeholdersTechniques.has(valeur)) {
        assert.fail(`${relatif} contient un attribut visible code en dur : ${valeur}`)
      }
    }
    ts.forEachChild(noeud, visiter)
  }
  visiter(source)
}

function fichiersTypeScript(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = join(dossier, entree.name)
    return entree.isDirectory() ? fichiersTypeScript(chemin) : entree.name.endsWith('.ts') ? [chemin] : []
  })
}

for (const chemin of fichiersTypeScript(join(RACINE, 'src', 'main'))) {
  const source = ts.createSourceFile(chemin, readFileSync(chemin, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const visiter = (noeud: ts.Node): void => {
    if (ts.isNewExpression(noeud) && noeud.expression.getText(source) === 'Error' && noeud.arguments?.[0] && ts.isStringLiteral(noeud.arguments[0])) {
      assert.fail(`${chemin} contient une erreur utilisateur codee en dur : ${noeud.arguments[0].text}`)
    }
    if (ts.isCallExpression(noeud) && ts.isPropertyAccessExpression(noeud.expression)) {
      const nom = noeud.expression.name.text
      const argumentMessage = nom === 'journaliser' ? noeud.arguments[2] : nom === 'changerStatut' ? noeud.arguments[2] : undefined
      if (argumentMessage && ts.isStringLiteral(argumentMessage)) {
        assert.fail(`${chemin} contient un message de journal code en dur : ${argumentMessage.text}`)
      }
    }
    ts.forEachChild(noeud, visiter)
  }
  visiter(source)
}

console.log(`${LANGUES.length} langues et ${cles.length} cles verifiees ; aucun texte visible ou message principal non localise.`)
