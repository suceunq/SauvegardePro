// Verifie reellement le mecanisme de mise a jour GitHub (electron-updater) contre le vrai depot publie.
// A executer depuis la racine du projet (pour que app.getVersion() lise le bon package.json) :
//   ./node_modules/electron/dist/electron.exe scripts/tests/verify-updater.js
const { app } = require('electron')
const { autoUpdater } = require('electron-updater')
// Utilise le semver interne d'electron-updater : la comparaison faite par la lib attend une instance
// de SA propre classe SemVer (deux copies du paquet npm coexistent, incompatibles entre elles).
const semver = require('electron-updater/node_modules/semver')

app.whenReady().then(async () => {
  autoUpdater.autoDownload = false
  autoUpdater.forceDevUpdateConfig = true
  autoUpdater.setFeedURL({ provider: 'github', owner: 'suceunq', repo: 'SauvegardePro' })

  let echec = false

  try {
    console.log('--- Test 1 : verification contre la derniere release publiee ---')
    const r1 = await autoUpdater.checkForUpdates()
    if (!r1?.updateInfo?.version) throw new Error('Aucune information de version recue depuis GitHub')
    console.log(`OK : release distante detectee = ${r1.updateInfo.version}`)
  } catch (e) {
    echec = true
    console.error('ECHEC test 1 :', e.message)
  }

  try {
    console.log('\n--- Test 2 : version locale plus ancienne -> mise a jour doit etre proposee ---')
    autoUpdater.currentVersion = semver.parse('0.0.1')
    const r2 = await autoUpdater.checkForUpdates()
    const disponible = r2 && semver.gt(semver.parse(r2.updateInfo.version), autoUpdater.currentVersion)
    if (!disponible) throw new Error('La mise a jour aurait du etre detectee comme disponible')
    console.log(`OK : mise a jour ${r2.updateInfo.version} correctement detectee comme disponible`)
  } catch (e) {
    echec = true
    console.error('ECHEC test 2 :', e.message)
  }

  console.log(echec ? '\n=== VERIFICATION ECHOUEE ===' : '\n=== VERIFICATION REUSSIE ===')
  app.exit(echec ? 1 : 0)
})

autoUpdater.on('error', (e) => console.error('[autoUpdater error event]', e))
