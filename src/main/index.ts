import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { demarrerApplication, type ApplicationDemarree } from './app/bootstrap'

let applicationDemarree: ApplicationDemarree | null = null

function creerFenetre(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'SauvegardePro',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.once('ready-to-show', () => win.show())

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const verrouUniqueObtenu = app.requestSingleInstanceLock()
if (!verrouUniqueObtenu) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const fenetres = BrowserWindow.getAllWindows()
    if (fenetres[0]) {
      if (fenetres[0].isMinimized()) fenetres[0].restore()
      fenetres[0].focus()
    }
  })

  app.whenReady().then(async () => {
    app.setAppUserModelId('com.sauvegardepro.app')
    applicationDemarree = await demarrerApplication()
    creerFenetre()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) creerFenetre()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', (evenement) => {
    if (!applicationDemarree) return
    evenement.preventDefault()
    const aArreter = applicationDemarree
    applicationDemarree = null
    void aArreter.arreter().finally(() => app.exit())
  })
}
