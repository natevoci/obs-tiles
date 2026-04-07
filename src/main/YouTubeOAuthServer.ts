import { ipcMain, shell } from 'electron'
import http from 'http'
import net from 'net'

/** Find a free TCP port by binding to port 0. */
function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address() as net.AddressInfo
      srv.close(() => resolve(addr.port))
    })
    srv.on('error', reject)
  })
}

// Holds the pending OAuth redirect server across the two IPC calls (start → result)
let oauthServer: http.Server | null = null

export function registerYouTubeOAuthIpc(): void {
  ipcMain.handle('youtube-oauth-start', async (event) => {
    // Close any leftover server from a previous flow
    if (oauthServer) {
      oauthServer.close()
      oauthServer = null
    }

    const port = await findFreePort()

    oauthServer = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`)
      const code = url.searchParams.get('code')
      const error = url.searchParams.get('error')

      // Acknowledge the browser so the user sees a message
      const html = code
        ? '<html><body><h2>Signed in — you can close this tab and return to obs-tiles.</h2></body></html>'
        : '<html><body><h2>Authorization failed — you can close this tab.</h2></body></html>'
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(html)

      // Forward result to renderer
      event.sender.send('youtube-oauth-result', { code, error })

      oauthServer?.close()
      oauthServer = null
    })

    oauthServer.listen(port, '127.0.0.1')

    return { port }
  })

  ipcMain.on('youtube-open-browser', (_event, url: string) => {
    shell.openExternal(url)
  })
}
