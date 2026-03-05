import { app, BrowserWindow, protocol } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
}

// Must be called before app.whenReady()
if (!isDev) {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
  ])
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://127.0.0.1:5173')
    win.webContents.openDevTools()
  } else {
    // Use app://localhost/ so pathname is parsed correctly (not treated as hostname)
    win.loadURL('app://localhost/')
  }
}

app.whenReady().then(() => {
  if (!isDev) {
    protocol.handle('app', (request) => {
      const url = new URL(request.url)
      const pathname = url.pathname === '/' ? '/index.html' : url.pathname
      // app.getAppPath() points inside the ASAR; readFileSync is ASAR-aware
      const filePath = path.join(app.getAppPath(), 'dist', pathname)
      const ext = path.extname(filePath)
      const mimeType = MIME[ext] ?? 'application/octet-stream'
      try {
        const data = readFileSync(filePath)
        return new Response(data, { headers: { 'content-type': mimeType } })
      } catch {
        return new Response('Not found', { status: 404 })
      }
    })
  }
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
