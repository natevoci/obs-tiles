import React from 'react'
import styled from 'styled-components'
import {
	Button,
	TextField,
	Checkbox,
	FormControlLabel,
	MenuItem,
	Select,
	FormControl,
	InputLabel,
	Typography,
	CircularProgress,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
} from '@material-ui/core'

import { YouTubeAuthService } from '../../api/youtube'
import type { YouTubeConfig } from '../../../shared/types'

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------

const PanelRoot = styled.div`
	display: flex;
	flex-direction: column;
	gap: 24px;
	padding: 20px;
	overflow-y: auto;
	flex: 1;
`

const Section = styled.div`
	display: flex;
	flex-direction: column;
	gap: 12px;
`

const SectionLabel = styled.div`
	font-size: 11px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	opacity: 0.55;
`

const InstructionsBox = styled.div`
	background: rgba(255, 255, 255, 0.04);
	border: 1px solid rgba(255, 255, 255, 0.10);
	border-radius: 4px;
	padding: 12px 14px;
	font-size: 12px;
	line-height: 1.65;
	white-space: pre-wrap;
	font-family: monospace;
`

const WarnBox = styled.div`
	background: rgba(255, 193, 7, 0.12);
	border: 1px solid rgba(255, 193, 7, 0.35);
	border-radius: 4px;
	padding: 8px 12px;
	font-size: 12px;
	color: #ffc107;
	line-height: 1.5;
`

const OverrideRow = styled.div`
	display: flex;
	align-items: center;
	gap: 12px;
`

const FlexFormControl = styled(FormControl)`
	flex: 1;
`

const AuthRow = styled.div`
	display: flex;
	align-items: center;
	gap: 12px;
`

const AuthStatus = styled.div`
	flex: 1;
	font-size: 13px;
	opacity: 0.8;
`

const WaitingRow = styled.div`
	display: flex;
	align-items: center;
	gap: 10px;
`

// ---------------------------------------------------------------------------
// YouTubeAuthDialog — shown during the OAuth flow
// ---------------------------------------------------------------------------

interface AuthDialogProps {
	open: boolean
	waiting: boolean
	error: string | null
	onOpenBrowser: () => void
	onCancel: () => void
}

const YouTubeAuthDialog = ({ open, waiting, error, onOpenBrowser, onCancel }: AuthDialogProps) => (
	<Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
		<DialogTitle>Sign in to YouTube</DialogTitle>
		<DialogContent>
			<Typography variant="body2" gutterBottom>
				Your browser will open to sign in. After approving, return to obs-tiles.
			</Typography>
			{waiting && (
				<WaitingRow>
					<CircularProgress size={16} />
					<Typography variant="body2">Waiting for authorization…</Typography>
				</WaitingRow>
			)}
			{error && (
				<Typography variant="body2" color="error" style={{ marginTop: 8 }}>
					{error}
				</Typography>
			)}
		</DialogContent>
		<DialogActions>
			{!waiting && !error && (
				<Button onClick={onOpenBrowser} color="primary" variant="contained">
					Open browser
				</Button>
			)}
			{error && (
				<Button onClick={onOpenBrowser} color="primary" variant="outlined">
					Retry
				</Button>
			)}
			<Button onClick={onCancel}>Cancel</Button>
		</DialogActions>
	</Dialog>
)

// ---------------------------------------------------------------------------
// GCP instructions text
// ---------------------------------------------------------------------------

const GCP_INSTRUCTIONS = `To use YouTube Live integration you need a Google Cloud Project
with the YouTube Data API v3 enabled.

Steps:
 1. Go to console.cloud.google.com → New project
 2. APIs & Services → Enable APIs → "YouTube Data API v3"
 3. APIs & Services → Credentials → + Create Credentials
    → OAuth client ID → Application type: Desktop app
 4. Copy the Client ID and Client Secret below
 5. APIs & Services → OAuth consent screen
    → Publishing status: set to "In production"
    (required to avoid refresh tokens expiring after 7 days)`

// ---------------------------------------------------------------------------
// YouTubeSettingsPanel
// ---------------------------------------------------------------------------

export interface YouTubeSettingsPanelProps {
	value: YouTubeConfig
	connectionNames: string[]
	/**
	 * Called when form-field values change. Parent holds these in local state
	 * and merges them into the config on Save.
	 */
	onChange: (v: YouTubeConfig) => void
	/**
	 * Called when OAuth state changes (sign in / sign out).
	 * Parent must persist this immediately rather than waiting for the Save button.
	 */
	onSaveNow: (v: YouTubeConfig) => void
}

export const YouTubeSettingsPanel = ({
	value,
	connectionNames,
	onChange,
	onSaveNow,
}: YouTubeSettingsPanelProps) => {
	const isElectron = Boolean(window.ipcRenderer)

	const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
	const [authWaiting, setAuthWaiting] = React.useState(false)
	const [authError, setAuthError] = React.useState<string | null>(null)
	const cancelledRef = React.useRef(false)

	const handleSignIn = () => {
		cancelledRef.current = false
		setAuthError(null)
		setAuthWaiting(false)
		setAuthDialogOpen(true)
	}

	const handleOpenBrowser = async () => {
		setAuthWaiting(true)
		setAuthError(null)
		try {
			const authService = new YouTubeAuthService(value.clientId, value.clientSecret)
			const refreshToken = await authService.startOAuthFlow()
			if (!cancelledRef.current) {
				setAuthDialogOpen(false)
				onSaveNow({ ...value, refreshToken })
			}
		} catch (err: any) {
			if (!cancelledRef.current) {
				setAuthError(err?.message ?? 'Authentication failed')
				setAuthWaiting(false)
			}
		}
	}

	const handleCancelAuth = () => {
		cancelledRef.current = true
		setAuthDialogOpen(false)
		setAuthWaiting(false)
		setAuthError(null)
	}

	const handleSignOut = () => {
		onSaveNow({ ...value, refreshToken: undefined })
	}

	const isSignedIn = Boolean(value.refreshToken)

	return (
		<PanelRoot>
			{/* GCP Setup Instructions */}
			<Section>
				<SectionLabel>Google Cloud Project setup</SectionLabel>
				<InstructionsBox>{GCP_INSTRUCTIONS}</InstructionsBox>
				{!isSignedIn && (
					<WarnBox>
						⚠ Make sure to set the OAuth consent screen to "In production" before signing in.
						Refresh tokens for apps in testing mode expire after 7 days.
					</WarnBox>
				)}
			</Section>

			{/* OAuth Credentials */}
			<Section>
				<SectionLabel>OAuth Credentials</SectionLabel>
				<TextField
					label="Client ID"
					value={value.clientId}
					onChange={(e) => onChange({ ...value, clientId: e.target.value })}
					variant="outlined"
					size="small"
					fullWidth
					disabled={isSignedIn}
					helperText={isSignedIn ? 'Sign out to change credentials' : undefined}
				/>
				<TextField
					label="Client Secret"
					value={value.clientSecret}
					onChange={(e) => onChange({ ...value, clientSecret: e.target.value })}
					variant="outlined"
					size="small"
					fullWidth
					type="password"
					disabled={isSignedIn}
				/>
			</Section>

			{/* Authentication Status */}
			<Section>
				<SectionLabel>Authentication Status</SectionLabel>
				<AuthRow>
					<AuthStatus>
						{isSignedIn ? 'Signed in (auth token stored)' : 'Not signed in'}
					</AuthStatus>
					{!isSignedIn ? (
						<Button
							variant="contained"
							color="primary"
							size="small"
							onClick={handleSignIn}
							disabled={!isElectron || !value.clientId || !value.clientSecret}
						>
							Sign in to YouTube
						</Button>
					) : (
						<Button variant="outlined" size="small" onClick={handleSignOut}>
							Sign out
						</Button>
					)}
				</AuthRow>
				{!isElectron && (
					<Typography variant="caption" style={{ opacity: 0.6 }}>
						OAuth sign-in is only available in the Electron desktop app.
					</Typography>
				)}
			</Section>

			{/* Default Broadcast Settings */}
			<Section>
				<SectionLabel>Default broadcast settings</SectionLabel>

				<OverrideRow>
					<FlexFormControl variant="outlined" size="small">
						<InputLabel>Privacy</InputLabel>
						<Select
							label="Privacy"
							value={value.defaultPrivacyStatus}
							onChange={(e) =>
								onChange({ ...value, defaultPrivacyStatus: e.target.value as YouTubeConfig['defaultPrivacyStatus'] })
							}
						>
							<MenuItem value="public">Public</MenuItem>
							<MenuItem value="unlisted">Unlisted</MenuItem>
							<MenuItem value="private">Private</MenuItem>
						</Select>
					</FlexFormControl>
					<FormControlLabel
						control={
							<Checkbox
								checked={value.allowPrivacyOverride}
								onChange={(e) => onChange({ ...value, allowPrivacyOverride: e.target.checked })}
								color="primary"
								size="small"
							/>
						}
						label="Allow override"
					/>
				</OverrideRow>

				<OverrideRow>
					<FlexFormControl variant="outlined" size="small">
						<InputLabel>Latency</InputLabel>
						<Select
							label="Latency"
							value={value.defaultLatency}
							onChange={(e) =>
								onChange({ ...value, defaultLatency: e.target.value as YouTubeConfig['defaultLatency'] })
							}
						>
							<MenuItem value="ultraLow">Ultra Low</MenuItem>
							<MenuItem value="low">Low</MenuItem>
							<MenuItem value="normal">Normal</MenuItem>
						</Select>
					</FlexFormControl>
					<FormControlLabel
						control={
							<Checkbox
								checked={value.allowLatencyOverride}
								onChange={(e) => onChange({ ...value, allowLatencyOverride: e.target.checked })}
								color="primary"
								size="small"
							/>
						}
						label="Allow override"
					/>
				</OverrideRow>

				<TextField
					label="Title template"
					value={value.defaultTitle}
					onChange={(e) => onChange({ ...value, defaultTitle: e.target.value })}
					variant="outlined"
					size="small"
					fullWidth
					helperText="{date} is replaced with today's date (YYYY-MM-DD)"
				/>

				<TextField
					label="Description"
					value={value.defaultDescription}
					onChange={(e) => onChange({ ...value, defaultDescription: e.target.value })}
					variant="outlined"
					size="small"
					fullWidth
					multiline
					minRows={2}
				/>
			</Section>

			{/* OBS Connection */}
			<Section>
				<SectionLabel>OBS connection for stream key updates</SectionLabel>
				<FormControl variant="outlined" size="small" style={{ maxWidth: 260 }}>
					<InputLabel>Connection</InputLabel>
					<Select
						label="Connection"
						value={value.obsConnection}
						onChange={(e) => onChange({ ...value, obsConnection: e.target.value as string })}
					>
						{connectionNames.map((name) => (
							<MenuItem key={name} value={name}>{name}</MenuItem>
						))}
					</Select>
				</FormControl>
			</Section>

			{/* Auth flow dialog */}
			<YouTubeAuthDialog
				open={authDialogOpen}
				waiting={authWaiting}
				error={authError}
				onOpenBrowser={handleOpenBrowser}
				onCancel={handleCancelAuth}
			/>
		</PanelRoot>
	)
}
