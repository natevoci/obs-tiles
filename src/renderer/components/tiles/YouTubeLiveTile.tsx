import * as React from 'react'
import styled from 'styled-components'
import Button from '@material-ui/core/Button'
import Typography from '@material-ui/core/Typography'
import {
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	TextField,
} from '@material-ui/core'

import { useObs } from '~/api/obs'
import { useSettings } from '~/components/Settings/SettingsContext'
import { StyledCircularProgress } from './TileWrapper'
import { useYouTubeLiveContext, YouTubeAuthService } from '~/api/youtube'
import { setStreamServiceSettings, startStreaming } from '~/api/obs/actions/streaming'
import { CreateBroadcastDialog } from '../youtube/CreateBroadcastDialog'
import { ResumeBroadcastDialog } from '../youtube/ResumeBroadcastDialog'
import { ConfirmDialog } from '~/components/ConfirmDialog'
import type { YouTubeLiveTileConfig } from './Tiles'
import type { CreateBroadcastOptions } from '~/api/youtube'

// ============================================================================
// Helpers
// ============================================================================

function todayIso(): string {
	return new Date().toISOString().slice(0, 10)
}

function applyDateTemplate(template: string): string {
	return template.replace(/\{date\}/g, todayIso())
}

function formatElapsed(totalSeconds: number): string {
	const h = Math.floor(totalSeconds / 3600)
	const m = Math.floor((totalSeconds % 3600) / 60)
	const s = totalSeconds % 60
	if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const IS_ELECTRON = Boolean((window as any).ipcRenderer)

function getPhaseVisual(
	phase: string,
	isAuthenticated: boolean,
	isElectron: boolean,
): { label: string; tintColor?: string; isError?: boolean } {
	switch (phase) {
		case 'live':           return { label: 'Live', tintColor: '#f44336' }
		case 'stopping':       return { label: 'Stopping…', tintColor: '#f44336' }
		case 'starting-stream': return { label: 'Starting…', tintColor: '#ff9800' }
		case 'creating-broadcast': return { label: 'Preparing…' }
		case 'configuring-obs':    return { label: 'Configuring OBS…' }
		case 'checking-existing':  return { label: 'Checking…' }
		case 'error':          return { label: 'Error', tintColor: '#f44336', isError: true }
	}
	// idle
	if (!isAuthenticated) {
		return {
			label: isElectron ? 'Sign in to YouTube' : 'Manual Key',
			tintColor: '#b71c1c',
		}
	}
	return { label: 'Go Live', tintColor: '#1b5e20' }
}

// ============================================================================
// Styled components
// ============================================================================

interface StyledButtonModeProps {
	$size: number
}

const StyledButtonMode = styled(Button)<StyledButtonModeProps>`
	width: ${p => p.$size * 16}px;

	&.MuiButton-contained.Mui-disabled {
		background-color: ${p => p.theme.disabledBackground};
		color: ${p => p.theme.disabledText};
	}
`

const StatsRow = styled.div`
	display: flex;
	justify-content: space-between;
	font-size: 11px;
	color: rgba(255, 255, 255, 0.6);
	padding-top: 2px;
`

const StatsLabel = styled.span`
	opacity: 0.75;
	margin-right: 6px;
`

const StatsValue = styled.span``

const ErrorDetails = styled.div<{ $size: number }>`
	width: ${p => p.$size * 16}px;
	margin-top: 4px;
	padding: 4px 6px;
	border-radius: 3px;
	background: rgba(244, 67, 54, 0.15);
	border: 1px solid rgba(244, 67, 54, 0.4);
	font-size: 10px;
	color: #ef9a9a;
	word-break: break-word;
`

const ErrorHint = styled.div`
	margin-top: 3px;
	color: rgba(255, 255, 255, 0.4);
	font-size: 10px;
`

// ============================================================================
// ManualKeyDialog — web mode only
// ============================================================================

interface ManualKeyDialogProps {
	open: boolean
	obs: ReturnType<typeof useObs>
	onClose: () => void
}

const ManualKeyDialog = ({ open, obs, onClose }: ManualKeyDialogProps) => {
	const [streamKey, setStreamKey] = React.useState('')
	const [busy, setBusy] = React.useState(false)
	const [error, setError] = React.useState<string | null>(null)

	React.useEffect(() => {
		if (open) {
			setStreamKey('')
			setError(null)
		}
	}, [open])

	const handleGoLive = async () => {
		if (!streamKey.trim()) return
		setBusy(true)
		setError(null)
		try {
			await setStreamServiceSettings(obs, 'rtmp_custom', {
				server: 'rtmp://a.rtmp.youtube.com/live2',
				key: streamKey.trim(),
				bwtest: false,
				use_auth: false,
			})
			startStreaming(obs)()
			onClose()
		} catch (e: any) {
			setError(e.message ?? String(e))
		} finally {
			setBusy(false)
		}
	}

	return (
		<Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
			<DialogTitle>Set YouTube Stream Key</DialogTitle>
			<DialogContent>
				<TextField
					label="Stream Key"
					value={streamKey}
					onChange={e => setStreamKey(e.target.value)}
					variant="outlined"
					size="small"
					fullWidth
					style={{ marginTop: 8 }}
					autoFocus
					onKeyPress={e => { if (e.key === 'Enter') handleGoLive() }}
				/>
				{error && (
					<Typography variant="body2" color="error" style={{ marginTop: 8 }}>
						{error}
					</Typography>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={busy}>Cancel</Button>
				<Button
					onClick={handleGoLive}
					color="primary"
					disabled={!streamKey.trim() || busy}
				>
					{busy ? 'Starting…' : 'Set in OBS + Go Live'}
				</Button>
			</DialogActions>
		</Dialog>
	)
}

// ============================================================================
// YouTubeLiveTile
// ============================================================================

// Default YouTube config placeholder for CreateBroadcastDialog when settings.youtube is unset
const DEFAULT_YT_CONFIG = {
	defaultTitle: '{date} Stream',
	defaultDescription: '',
	defaultPrivacyStatus: 'unlisted' as const,
	defaultLatency: 'ultraLow' as const,
	allowPrivacyOverride: true,
	allowLatencyOverride: true,
}

export const YouTubeLiveTile = ({
	autoCreateBroadcast = false,
	defaultTitle,
	defaultDescription,
	tileSize = '10',
	statsLines,
}: YouTubeLiveTileConfig) => {
	const tileSizeInt = parseInt(String(tileSize))

	const { settings, saveFullSettings } = useSettings()
	const { yt, obs } = useYouTubeLiveContext()

	const { phase, isAuthenticated, concurrentViewers, error, existingBroadcasts } = yt

	// ── Elapsed time while live ──────────────────────────────────────────────
	const liveStartRef = React.useRef<number | null>(null)
	const [elapsedSeconds, setElapsedSeconds] = React.useState(0)

	React.useEffect(() => {
		if (phase === 'live') {
			liveStartRef.current = Date.now()
			setElapsedSeconds(0)
			const id = setInterval(() => {
				setElapsedSeconds(Math.floor((Date.now() - liveStartRef.current!) / 1000))
			}, 1000)
			return () => clearInterval(id)
		} else {
			liveStartRef.current = null
			setElapsedSeconds(0)
		}
	}, [phase])

	// ── Dialog state ─────────────────────────────────────────────────────────
	const [showCreateDialog, setShowCreateDialog] = React.useState(false)
	const [showResumeDialog, setShowResumeDialog] = React.useState(false)
	const [showManualKey, setShowManualKey] = React.useState(false)
	const [showConfirm, setShowConfirm] = React.useState(false)
	const [signingIn, setSigningIn] = React.useState(false)

	// Show resume dialog when existing broadcasts are found
	React.useEffect(() => {
		if (existingBroadcasts.length > 0) {
			setShowResumeDialog(true)
		}
	}, [existingBroadcasts])

	// ── Sign-in (Electron only) ───────────────────────────────────────────────
	const handleSignIn = React.useCallback(async () => {
		if (!settings.youtube?.clientId || !settings.youtube?.clientSecret) return
		setSigningIn(true)
		try {
			const authService = new YouTubeAuthService(
				settings.youtube.clientId,
				settings.youtube.clientSecret,
			)
			const refreshToken = await authService.startOAuthFlow()
			saveFullSettings({ ...settings, youtube: { ...settings.youtube, refreshToken } })
		} catch (e: any) {
			console.error('[YouTubeLiveTile] sign-in failed:', e)
		} finally {
			setSigningIn(false)
		}
	}, [settings, saveFullSettings])

	// ── Go live ───────────────────────────────────────────────────────────────
	const doGoLive = React.useCallback(async () => {
		if (phase !== 'idle') return

		if (!isAuthenticated) {
			if (!IS_ELECTRON) {
				setShowManualKey(true)
			} else {
				await handleSignIn()
			}
			return
		}

		const existing = await yt.checkExistingBroadcasts()
		if (existing.length > 0) return // ResumeBroadcastDialog shown via effect

		if (autoCreateBroadcast) {
			const mergedTitle = applyDateTemplate(
				defaultTitle ?? settings.youtube?.defaultTitle ?? '{date} Stream',
			)
			await yt.goLive({
				title: mergedTitle,
				description: defaultDescription ?? settings.youtube?.defaultDescription ?? '',
				privacyStatus: settings.youtube?.defaultPrivacyStatus ?? 'unlisted',
				latencyPreference: settings.youtube?.defaultLatency ?? 'ultraLow',
			})
		} else {
			setShowCreateDialog(true)
		}
	}, [phase, isAuthenticated, autoCreateBroadcast, settings.youtube, defaultTitle, defaultDescription, yt, handleSignIn])

	const handleGoLive = React.useCallback(() => {
		if (settings.confirmBeforeGoLive) {
			setShowConfirm(true)
		} else {
			doGoLive()
		}
	}, [settings.confirmBeforeGoLive, doGoLive])

	// ── Click handler ─────────────────────────────────────────────────────────
	const handleClick = React.useCallback(() => {
		if (phase === 'error') { yt.clearError(); return }
		if (phase === 'live') { yt.stopLive(); return }
		if (phase === 'idle') { handleGoLive(); return }
		// busy states: no-op
	}, [phase, yt, handleGoLive])
	// ── Keyboard shortcut listener ───────────────────────────────────────────────────
	React.useEffect(() => {
		const handler = (e: Event) => {
			const { command } = (e as CustomEvent<{ command: string }>).detail
			if (command === 'start' && phase === 'idle') handleGoLive()
			else if (command === 'stop' && phase === 'live') yt.stopLive()
		}
		window.addEventListener('youtube-live-control', handler)
		return () => window.removeEventListener('youtube-live-control', handler)
	}, [phase, handleGoLive, yt])
	// ── Visual state ─────────────────────────────────────────────────────────
	const { label: phaseLabel, tintColor } = getPhaseVisual(phase, isAuthenticated, IS_ELECTRON)
	const isBusy = signingIn || ['checking-existing', 'creating-broadcast', 'configuring-obs', 'starting-stream', 'stopping'].includes(phase)

	const dialogs = (
		<>
			<CreateBroadcastDialog
				open={showCreateDialog}
				config={{
					...(settings.youtube ?? DEFAULT_YT_CONFIG),
					...(defaultTitle != null ? { defaultTitle } : {}),
					...(defaultDescription != null ? { defaultDescription } : {}),
				}}
				onConfirm={async (opts: CreateBroadcastOptions) => {
					setShowCreateDialog(false)
					await yt.goLive(opts)
				}}
				onCancel={() => setShowCreateDialog(false)}
			/>
			<ResumeBroadcastDialog
				open={showResumeDialog}
				broadcasts={existingBroadcasts}
				onResume={async (broadcast) => {
					setShowResumeDialog(false)
					await yt.resumeBroadcast(broadcast)
				}}
				onEnd={async (broadcastId) => {
					await yt.endExistingBroadcast(broadcastId)
				}}
				onCreateNew={() => {
					setShowResumeDialog(false)
					setShowCreateDialog(true)
				}}
				onCancel={() => setShowResumeDialog(false)}
			/>
			<ManualKeyDialog
				open={showManualKey}
				obs={obs}
				onClose={() => setShowManualKey(false)}
			/>
			<ConfirmDialog
				open={showConfirm}
				title="Go Live?"
				message="Start a YouTube Live broadcast?"
				onConfirm={() => { setShowConfirm(false); doGoLive() }}
				onCancel={() => setShowConfirm(false)}
			/>
		</>
	)

	// ── Render ──────────────────────────────────────────────────────────────
	const buttonLabel = phase === 'live' ? 'Stop' : phaseLabel
	const buttonColor: 'primary' | 'secondary' | 'default' =
		tintColor === '#f44336' || tintColor === '#b71c1c' ? 'secondary'
		: tintColor === '#1b5e20' ? 'primary'
		: 'default'

	const statsContent = statsLines
		? ([
			[statsLines.elapsed,  'Elapsed', phase === 'live' ? formatElapsed(elapsedSeconds) : ''],
			[statsLines.viewers,  'Viewers', phase === 'live' && concurrentViewers != null ? String(concurrentViewers) : ''],
		  ] as [boolean | undefined, string, string][]).filter(([enabled]) => enabled)
		: []

	return (
		<>
			<StyledButtonMode
				$size={tileSizeInt}
				variant="contained"
				color={buttonColor}
				disabled={isBusy}
				onClick={handleClick}
			>
				{isBusy
					? <StyledCircularProgress size={14} />
					: buttonLabel
				}
			</StyledButtonMode>
			{phase === 'error' && (
				<ErrorDetails $size={tileSizeInt}>
					{error ?? 'An unknown error occurred.'}
					<ErrorHint>Click to reset and try again.</ErrorHint>
				</ErrorDetails>
			)}
			{statsContent.map(([, label, value]) => (
				<StatsRow key={label}>
					<StatsLabel>{label}</StatsLabel>
					<StatsValue>{value}</StatsValue>
				</StatsRow>
			))}
			{dialogs}
		</>
	)
}
