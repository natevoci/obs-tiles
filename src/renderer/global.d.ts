export {}

declare global {
	interface Window {
		ipcRenderer: {
			getSettings: () => Promise<any>
			saveSettings: (settings: any) => Promise<boolean>
			selectFolder: (defaultPath?: string) => Promise<string | null>
			// RTSP stream control (Electron-only)
			rtspStart: (options: {
				streamId: string
				streamUrl: string
				muted: boolean
				fps: number | null
				audioSyncOffsetMs: number
				ffmpegPath: string
			}) => Promise<void>
			rtspStop: (streamId: string) => Promise<void>
			rtspSetMuted: (streamId: string, muted: boolean) => Promise<void>
			onRtspFrame: (callback: (payload: { streamId: string; data: string }) => void) => void
			offRtspFrame: (callback: (payload: { streamId: string; data: string }) => void) => void
			onRtspError: (callback: (payload: { streamId: string; message: string }) => void) => void
			offRtspError: (callback: (payload: { streamId: string; message: string }) => void) => void
			onRtspConnecting: (callback: (payload: { streamId: string }) => void) => void
			offRtspConnecting: (callback: (payload: { streamId: string }) => void) => void
		}
	}
}
