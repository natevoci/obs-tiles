import path from 'path'
import { spawn, ChildProcess } from 'child_process'
import net from 'net'
import { JpegFrameParser } from './JpegFrameParser'

export interface RtspStartOptions {
  streamId: string
  streamUrl: string
  muted: boolean
  fps: number | null
  audioSyncOffsetMs: number
  ffmpegPath: string
}

interface RtspStreamEntry {
  process: ChildProcess | null     // null while probing TCP reachability
  audioServer: net.Server
  audioSocket: net.Socket | null
  speaker: any | null
  muted: boolean
  webContents: Electron.WebContents
  stopped: boolean                 // set true when explicitly stopped; halts reconnect loop
  options: RtspStartOptions        // stored so reconnect can re-spawn with the same args
}

export class RtspManager {
  private streams = new Map<string, RtspStreamEntry>()
  // Track webContents that already have lifecycle listeners attached
  private subscribedWebContents = new Set<number>()

  private stopAllForWebContents(webContents: Electron.WebContents): void {
    for (const [streamId, entry] of Array.from(this.streams.entries())) {
      if (entry.webContents === webContents) {
        console.log(`[RtspManager] Stopping '${streamId}' - renderer navigated/destroyed`)
        this.cleanup(streamId)
      }
    }
    this.subscribedWebContents.delete(webContents.id)
  }

  private subscribeWebContents(webContents: Electron.WebContents): void {
    if (this.subscribedWebContents.has(webContents.id)) return
    this.subscribedWebContents.add(webContents.id)

    const onNavigate = () => this.stopAllForWebContents(webContents)
    const onDestroyed = () => {
      this.stopAllForWebContents(webContents)
      webContents.removeListener('did-navigate', onNavigate)
    }

    webContents.on('did-navigate', onNavigate)
    webContents.once('destroyed', onDestroyed)
  }

  private parseHostPort(rtspUrl: string): [string, number] {
    try {
      const url = new URL(rtspUrl)
      return [url.hostname, url.port ? parseInt(url.port, 10) : 554]
    } catch {
      return ['localhost', 554]
    }
  }

  /** Keeps retrying a TCP connection to host:port until success or entry.stopped is set. */
  private waitForTcpReachable(host: string, port: number, entry: RtspStreamEntry): Promise<boolean> {
    return new Promise((resolve) => {
      const attempt = () => {
        if (entry.stopped) { resolve(false); return }
        const socket = new net.Socket()
        let settled = false
        const done = (success: boolean) => {
          if (settled) return
          settled = true
          socket.destroy()
          if (success) {
            resolve(true)
          } else if (!entry.stopped) {
            setTimeout(attempt, 2000)
          } else {
            resolve(false)
          }
        }
        socket.setTimeout(2000)
        socket.once('connect', () => done(true))
        socket.once('timeout', () => done(false))
        socket.once('error', () => done(false))
        socket.connect(port, host)
      }
      attempt()
    })
  }

  private spawnFfmpeg(entry: RtspStreamEntry): void {
    if (entry.stopped) return
    const { options } = entry
    const sanitizedId = options.streamId.replace(/[^a-zA-Z0-9-]/g, '-')
    const pipeName = `\\\\.\\pipe\\rtsp-audio-${sanitizedId}`
    const ffmpegBin = this.resolveFfmpegPath(options.ffmpegPath)
    const args = this.buildFfmpegArgs(options, pipeName)

    console.log(`[RtspManager] Spawning ffmpeg for '${options.streamId}' -> ${options.streamUrl}`)
    console.log(`[RtspManager] ffmpeg binary: ${ffmpegBin}`)
    console.log(`[RtspManager] ffmpeg args: ${args.join(' ')}`)

    const ffmpegProcess = spawn(ffmpegBin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    entry.process = ffmpegProcess

    const parser = new JpegFrameParser()
    let frameCount = 0
    let reconnectScheduled = false

    ffmpegProcess.stdout?.on('data', (chunk: Buffer) => {
      if (entry.stopped || entry.webContents.isDestroyed()) return
      const frames = parser.push(chunk)
      for (const frame of frames) {
        frameCount++
        if (frameCount === 1) {
          console.log(`[RtspManager] First frame for '${options.streamId}' (${frame.length} bytes)`)
        }
        entry.webContents.send('rtsp-frame', {
          streamId: options.streamId,
          data: frame.toString('base64'),
        })
      }
    })

    ffmpegProcess.stderr?.on('data', (data: Buffer) => {
      console.log(`[ffmpeg:${options.streamId}] ${data.toString().trimEnd()}`)
    })

    // 'error' fires when spawn fails (e.g. binary not found); 'exit' may not follow in that case
    ffmpegProcess.on('error', (err: Error) => {
      console.error(`[RtspManager] Process error for '${options.streamId}':`, err.message)
      if (!entry.stopped && !entry.webContents.isDestroyed()) {
        entry.webContents.send('rtsp-error', {
          streamId: options.streamId,
          message: `Failed to start ffmpeg: ${err.message}`,
        })
      }
      if (!entry.stopped && !reconnectScheduled) {
        reconnectScheduled = true
        this.scheduleReconnect(entry)
      }
    })

    ffmpegProcess.on('exit', (code, signal) => {
      console.log(`[RtspManager] ffmpeg exited for '${options.streamId}' - code=${code} signal=${signal} frames_sent=${frameCount}`)
      if (entry.stopped) return
      if (!reconnectScheduled) {
        reconnectScheduled = true
        this.scheduleReconnect(entry)
      }
    })
  }

  private scheduleReconnect(entry: RtspStreamEntry): void {
    if (entry.stopped) return
    entry.process = null
    if (!entry.webContents.isDestroyed()) {
      entry.webContents.send('rtsp-connecting', { streamId: entry.options.streamId })
    }
    const [host, port] = this.parseHostPort(entry.options.streamUrl)
    console.log(`[RtspManager] Reconnecting '${entry.options.streamId}' — probing ${host}:${port}`)
    // Brief pause lets the OS release the previous connection before re-probing
    setTimeout(async () => {
      if (entry.stopped) return
      const reachable = await this.waitForTcpReachable(host, port, entry)
      if (reachable && !entry.stopped) {
        this.spawnFfmpeg(entry)
      }
    }, 1000)
  }

  async start(options: RtspStartOptions, webContents: Electron.WebContents): Promise<void> {
    if (this.streams.has(options.streamId)) {
      await this.stop(options.streamId)
    }

    this.subscribeWebContents(webContents)

    const sanitizedId = options.streamId.replace(/[^a-zA-Z0-9-]/g, '-')
    const pipeName = `\\\\.\\pipe\\rtsp-audio-${sanitizedId}`
    // Audio named pipe server — created once and persists across ffmpeg reconnects
    const audioServer = net.createServer((socket) => {
      const entry = this.streams.get(options.streamId)
      if (!entry) { socket.destroy(); return }
      entry.audioSocket = socket

      let speakerInstance: any = null
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Speaker = require('speaker')
        speakerInstance = new Speaker({
          channels: 2,
          bitDepth: 16,
          sampleRate: 48000,
          signed: true,
          samplesPerFrame: 512,
        })
        speakerInstance.on('error', (err: Error) => {
          console.error(`[RtspManager] Speaker error for '${options.streamId}':`, err)
        })
        console.log(`[RtspManager] Speaker created for '${options.streamId}' - audio output enabled.`)
      } catch (e) {
        console.warn(`[RtspManager] Speaker unavailable for '${options.streamId}' - audio output disabled. Run electron-rebuild to enable audio.`, e)
      }
      if (entry) entry.speaker = speakerInstance

      socket.on('data', (chunk: Buffer) => {
        const current = this.streams.get(options.streamId)
        if (!current?.muted && speakerInstance) {
          try { speakerInstance.write(chunk) } catch {}
        }
        // When muted the data is consumed (socket drained) but not played
      })

      socket.on('close', () => {
        const current = this.streams.get(options.streamId)
        if (current) current.audioSocket = null
        try { speakerInstance?.end() } catch {}
      })
    })

    await new Promise<void>((resolve, reject) => {
      audioServer.once('error', (err: Error) => {
        console.error(`[RtspManager] Named pipe listen error for '${options.streamId}':`, err)
        reject(err)
      })
      audioServer.listen(pipeName, () => {
        audioServer.removeListener('error', reject)
        console.log(`[RtspManager] Audio pipe ready: ${pipeName}`)
        resolve()
      })
    })

    const entry: RtspStreamEntry = {
      process: null,
      audioServer,
      audioSocket: null,
      speaker: null,
      muted: options.muted,
      webContents,
      stopped: false,
      options,
    }
    this.streams.set(options.streamId, entry)

    // Probe TCP reachability then spawn — runs async so rtspStart IPC resolves quickly
    const [host, port] = this.parseHostPort(options.streamUrl)
    console.log(`[RtspManager] Probing ${host}:${port} for '${options.streamId}'`)
    this.waitForTcpReachable(host, port, entry).then(reachable => {
      if (reachable && !entry.stopped) {
        this.spawnFfmpeg(entry)
      }
    })
  }

  async stop(streamId: string): Promise<void> {
    const entry = this.streams.get(streamId)
    if (!entry) return
    this.cleanup(streamId)
  }

  setMuted(streamId: string, muted: boolean): void {
    const entry = this.streams.get(streamId)
    console.log(`[RtspManager] setMuted '${streamId}' muted=${muted} entryFound=${!!entry}`)
    if (entry) entry.muted = muted
  }

  stopAll(): void {
    for (const streamId of Array.from(this.streams.keys())) {
      this.cleanup(streamId)
    }
  }

  private cleanup(streamId: string): void {
    const entry = this.streams.get(streamId)
    if (!entry) return
    entry.stopped = true  // halts any in-progress TCP probe or reconnect
    this.streams.delete(streamId)
    try { if (entry.process && !entry.process.killed) entry.process.kill('SIGTERM') } catch {}
    try { entry.audioSocket?.destroy() } catch {}
    try { entry.speaker?.end() } catch {}
    try { entry.audioServer.close() } catch {}
  }

  private resolveFfmpegPath(configuredPath: string): string {
    const trimmed = configuredPath?.trim()
    if (trimmed) {
      return path.join(trimmed, 'ffmpeg.exe')
    }
    return 'ffmpeg' // system PATH fallback
  }

  private buildFfmpegArgs(options: RtspStartOptions, pipeName: string): string[] {
    const args = [
      '-y',                    // overwrite output (named pipe) without prompting
      '-rtsp_transport', 'tcp',
      '-fflags', 'nobuffer',
      '-flags', 'low_delay',
      '-analyzeduration', '1000000', // 1 second max — needed for codec param detection when audio is present
      '-probesize', '500000',        // 500KB — 32 bytes was too small; missed H.264 SPS when audio packets arrive first
      '-max_delay', '0',
      '-reorder_queue_size', '0',
      '-hwaccel', 'd3d11va',
      '-i', options.streamUrl,
      // Video → stdout as MJPEG
      '-map', '0:v:0',
    ]

    if (options.fps !== null && options.fps !== undefined) {
      args.push('-vf', `fps=${options.fps}`)
    }

    args.push(
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-q:v', '5',
      'pipe:1',
    )

    // Audio → Windows named pipe as PCM s16le
    args.push(
      '-map', '0:a:0',
      '-f', 's16le',
      '-acodec', 'pcm_s16le',
      '-ar', '48000',
      '-ac', '2',
    )

    if (options.audioSyncOffsetMs) {
      args.push('-af', `aresample=async=1,adelay=${options.audioSyncOffsetMs}|${options.audioSyncOffsetMs}`)
    } else {
      args.push('-af', 'aresample=async=1')
    }

    args.push(pipeName)
    return args
  }
}
