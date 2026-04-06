import * as React from 'react'

export interface RtspStreamState {
	/** Current JPEG frame as a data URL (data:image/jpeg;base64,...) */
	frameDataUrl: string | null
	/** Whether the stream is connecting */
	connecting: boolean
	/** Current error message, if any */
	error: string | null
	/** Whether audio is muted */
	muted: boolean
	/** Toggle mute state */
	toggleMute: () => void
	/** Whether the stream is active (started) */
	active: boolean
	/** Toggle stream on/off */
	toggleActive: () => void
}

export interface UseRtspStreamOptions {
	/** Unique stream identifier (used as IPC stream ID) */
	streamId: string
	/** Full RTSP URL to play */
	streamUrl: string
	/** Whether to start muted */
	startMuted?: boolean
	/** Frames per second cap (null = native rate) */
	fps?: number | null
	/** Audio sync offset in ms */
	audioSyncOffsetMs?: number
	/** Connection host to derive a default URL from */
	connectionHost?: string
	/** ffmpeg path override */
	ffmpegPath?: string
}

const isElectron = typeof window !== 'undefined' && !!window.ipcRenderer

export function useRtspStream(options: UseRtspStreamOptions): RtspStreamState {
	const { streamId, streamUrl, startMuted = true, fps, audioSyncOffsetMs = 0, ffmpegPath } = options

	const [frameDataUrl, setFrameDataUrl] = React.useState<string | null>(null)
	const [connecting, setConnecting] = React.useState(false)
	const [error, setError] = React.useState<string | null>(null)
	const [muted, setMuted] = React.useState(startMuted)
	const [active, setActive] = React.useState(true)

	// Track whether the stream has been started
	const startedRef = React.useRef(false)

	// Start/stop stream lifecycle
	React.useEffect(() => {
		if (!isElectron) {
			setError('RTSP streaming requires Electron (not supported in browser)')
			return
		}

		if (!active) {
			setFrameDataUrl(null)
			setConnecting(false)
			setError(null)
			return
		}

		if (!streamUrl) {
			setError('No stream URL configured')
			return
		}

		console.log(`[useRtspStream] Starting stream id='${streamId}' url='${streamUrl}'`)
		setConnecting(true)
		setError(null)
		startedRef.current = true

		window.ipcRenderer
			.rtspStart({
				streamId,
				streamUrl,
				muted: startMuted,
				fps: fps ?? null,
				audioSyncOffsetMs,
				ffmpegPath: ffmpegPath ?? '',
			})
			.then(() => {
				console.log(`[useRtspStream] rtspStart resolved for '${streamId}' - waiting for frames`)
				// Keep connecting=true until the first frame arrives
			})
			.catch((err: Error) => {
				console.error(`[useRtspStream] rtspStart rejected for '${streamId}':`, err?.message)
				setConnecting(false)
				setError(err?.message ?? 'Failed to start stream')
			})

		let firstFrame = true
		const handleFrame = (payload: { streamId: string; data: string }) => {
			if (payload.streamId !== streamId) return
			if (firstFrame) {
				console.log(`[useRtspStream] First frame received for '${streamId}' (${payload.data.length} base64 chars)`)
				firstFrame = false
			}
			setConnecting(false)
			setFrameDataUrl(`data:image/jpeg;base64,${payload.data}`)
		}

		const handleError = (payload: { streamId: string; message: string }) => {
			if (payload.streamId !== streamId) return
			console.error(`[useRtspStream] Error for '${streamId}':`, payload.message)
			setConnecting(false)
			setError(payload.message)
		}

		const handleConnecting = (payload: { streamId: string }) => {
			if (payload.streamId !== streamId) return
			console.log(`[useRtspStream] Reconnecting '${streamId}' — resetting to connecting state`)
			setFrameDataUrl(null)
			setConnecting(true)
			setError(null)
			firstFrame = true
		}

		window.ipcRenderer.onRtspFrame(handleFrame)
		window.ipcRenderer.onRtspError(handleError)
		window.ipcRenderer.onRtspConnecting(handleConnecting)

		return () => {
			window.ipcRenderer.offRtspFrame(handleFrame)
			window.ipcRenderer.offRtspError(handleError)
			window.ipcRenderer.offRtspConnecting(handleConnecting)
			if (startedRef.current) {
				window.ipcRenderer.rtspStop(streamId).catch(() => {
					// ignore stop errors
				})
				startedRef.current = false
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [streamId, streamUrl, active])

	// Keep muted state synced to main process
	React.useEffect(() => {
		console.log(`[useRtspStream] mute effect - streamId='${streamId}' muted=${muted} isElectron=${isElectron} startedRef=${startedRef.current}`)
		if (!isElectron || !startedRef.current) return
		console.log(`[useRtspStream] Sending rtspSetMuted streamId='${streamId}' muted=${muted}`)
		window.ipcRenderer.rtspSetMuted(streamId, muted).catch((err: Error) => {
			console.error(`[useRtspStream] rtspSetMuted failed for '${streamId}':`, err?.message)
		})
	}, [streamId, muted])

	const toggleMute = React.useCallback(() => {
		setMuted(prev => {
			console.log(`[useRtspStream] toggleMute '${streamId}': ${prev} → ${!prev}`)
			return !prev
		})
	}, [streamId])

	const toggleActive = React.useCallback(() => {
		setActive(prev => !prev)
	}, [])

	return {
		frameDataUrl,
		connecting,
		error,
		muted,
		toggleMute,
		active,
		toggleActive,
	}
}
