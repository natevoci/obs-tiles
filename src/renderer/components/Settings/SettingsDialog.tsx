import React from 'react'
import styled from 'styled-components'
import {
	Dialog,
	DialogTitle,
	AppBar,
	Toolbar,
	DialogContent,
	DialogActions,
	Button,
	TextField,
	IconButton,
	Typography,
	Tabs,
	Tab,
	Tooltip,
	Checkbox,
	FormControlLabel,
} from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import { Close, Add, Delete, Edit, ExpandMore, ChevronRight, Settings as SettingsIcon, Keyboard as KeyboardIcon, Code as CodeIcon, Subscriptions as YouTubeIcon } from '@material-ui/icons'
import { ConfigVisualEditor } from './ConfigVisualEditor'
import { KeyboardShortcutsPanel } from './KeyboardShortcutsPanel'
import { YouTubeSettingsPanel } from './YouTubeSettingsPanel'
import { useSettings } from './SettingsContext'
import { ConfirmDialog } from '../ConfirmDialog'
import type { ConfigItem, KeyboardShortcut, YouTubeConfig } from '../../../shared/types'
import { DEFAULT_SETTINGS, DEFAULT_SHORTCUTS as DEFAULT_SHORTCUTS_RAW } from '../../../shared/defaults'

const DEFAULT_SHORTCUTS = DEFAULT_SHORTCUTS_RAW as KeyboardShortcut[]
import { useObs } from '~/api/obs'

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------

const DialogBody = styled.div`
	display: flex;
	flex-direction: row;
	flex: 1;
	overflow: hidden;
	height: 100%;
`

const LeftPanel = styled.div`
	width: 220px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	border-right: 1px solid ${(p) => p.theme.palette?.divider ?? '#ddd'};
	overflow-y: auto;
`

const RightPanel = styled.div`
	flex: 1;
	display: flex;
	flex-direction: column;
	overflow: hidden;
`

const RightPanelHeader = styled.div`
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 8px 16px;
	border-bottom: 1px solid ${(p) => p.theme.palette?.divider ?? '#ddd'};
	flex-shrink: 0;
`

const RightPanelContent = styled.div`
	flex: 1;
	overflow: hidden;
	display: flex;
	flex-direction: column;
`

const TreeRow = styled.div<{ $depth: number; $selected: boolean }>`
	display: flex;
	align-items: center;
	padding: 6px 8px 6px ${(p) => 8 + p.$depth * 16}px;
	cursor: pointer;
	user-select: none;
	background: ${(p) => p.$selected ? 'rgba(255,255,255,0.12)' : 'transparent'};
	&:hover { background: rgba(255,255,255,0.07); }
`

const TreeLabel = styled.span`
	font-size: 13px;
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`

const TreeIcon = styled.div`
	width: 18px;
	height: 18px;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
`

const SettingsFormSection = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 20px;
`

const TabContent = styled.div`
	flex: 1;
	overflow: hidden;
	display: flex;
	flex-direction: column;
`

const StyledTextField = styled(TextField)`
	flex: 1;
	> .MuiInputBase-root {
		height: 100%;
		align-items: initial;
		overflow-y: auto;
	}
	& textarea {
		font-family: monospace;
	}
`

const EmptyHint = styled.div`
	padding: 20px;
	color: ${(p) => p.theme.palette?.text?.secondary ?? '#888'};
	font-size: 13px;
`

const BackupFolderRow = styled.div`
	display: flex;
	gap: 8px;
	align-items: flex-start;
`

const BackupFolderBrowseButton = styled(Button)`
	flex-shrink: 0;
`

const RawSection = styled.div`
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 20px;
	overflow-y: auto;
	flex: 1;
`

const useStyles = makeStyles((theme) => ({
	appBar: { position: 'relative' },
	title: { marginLeft: theme.spacing(2), flex: 1 },
	content: {
		position: 'relative',
		padding: 0,
		display: 'flex',
		flexDirection: 'column',
		overflow: 'hidden',
		flex: 1,
	},
}))

// ---------------------------------------------------------------------------
// Name prompt dialog (replaces window.prompt)
// ---------------------------------------------------------------------------

interface NamePromptDialogProps {
	open: boolean
	title: string
	initialValue: string
	onConfirm: (value: string) => void
	onCancel: () => void
}

const NamePromptDialog = ({ open, title, initialValue, onConfirm, onCancel }: NamePromptDialogProps) => {
	const [value, setValue] = React.useState(initialValue)

	React.useEffect(() => {
		if (open) setValue(initialValue)
	}, [open, initialValue])

	const handleConfirm = () => {
		const trimmed = value.trim()
		if (!trimmed) return
		onConfirm(trimmed)
	}

	return (
		<Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
			<DialogTitle>{title}</DialogTitle>
			<DialogContent>
				<TextField
					autoFocus
					fullWidth
					variant="outlined"
					size="small"
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
					style={{ marginTop: 8 }}
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={onCancel}>Cancel</Button>
				<Button onClick={handleConfirm} color="primary" variant="contained" disabled={!value.trim()}>
					OK
				</Button>
			</DialogActions>
		</Dialog>
	)
}

// ---------------------------------------------------------------------------
// Types for selected tree node
// ---------------------------------------------------------------------------

type SelectedNode = 'settings' | 'keyboard-shortcuts' | 'configs-group' | 'obs-raw-request' | 'youtube' | number

// ---------------------------------------------------------------------------
// SettingsDialog
// ---------------------------------------------------------------------------

interface SettingsDialogProps {
	onClose: () => void
}

export const SettingsDialog = ({ onClose }: SettingsDialogProps) => {
	const classes = useStyles()
	const {
		settings: savedSettings,
		saveFullSettings,
	} = useSettings()

	// Local state â€” edits are held locally until Save
	const [localTitle, setLocalTitle] = React.useState(savedSettings.title ?? DEFAULT_SETTINGS.title)
	const [localSelectConfigAtLaunch, setLocalSelectConfigAtLaunch] = React.useState(savedSettings.selectConfigAtLaunch ?? false)
	const [localAutoBackupConfigOnClose, setLocalAutoBackupConfigOnClose] = React.useState(savedSettings.autoBackupConfigOnClose ?? false)
	const [localAutoBackupConfigFolder, setLocalAutoBackupConfigFolder] = React.useState(savedSettings.autoBackupConfigFolder ?? '')
	const [localFfmpegPath, setLocalFfmpegPath] = React.useState(savedSettings.ffmpegPath ?? '')
	const [localConfirmBeforeStartStreaming, setLocalConfirmBeforeStartStreaming] = React.useState(savedSettings.confirmBeforeStartStreaming ?? false)
	const [localConfirmBeforeStopStreaming, setLocalConfirmBeforeStopStreaming] = React.useState(savedSettings.confirmBeforeStopStreaming ?? false)
	const [localConfirmBeforeStartRecording, setLocalConfirmBeforeStartRecording] = React.useState(savedSettings.confirmBeforeStartRecording ?? false)
	const [localConfirmBeforeStopRecording, setLocalConfirmBeforeStopRecording] = React.useState(savedSettings.confirmBeforeStopRecording ?? false)
	const [localConfirmBeforeGoLive, setLocalConfirmBeforeGoLive] = React.useState(savedSettings.confirmBeforeGoLive ?? false)
	const [localConfigs, setLocalConfigs] = React.useState<ConfigItem[]>(() =>
		savedSettings.configs.map((c) => ({ ...c })),
	)
	const [localConfigIndex, setLocalConfigIndex] = React.useState(savedSettings.currentConfigIndex)
	const [localShortcuts, setLocalShortcuts] = React.useState<KeyboardShortcut[]>(
		() => savedSettings.configs[savedSettings.currentConfigIndex]?.shortcuts ?? []
	)

	// OBS connection for live dropdowns in the shortcuts panel
	const obs = useObs({ connection: localConfigs[localConfigIndex]?.connection })

	// Tree selection
	const [selected, setSelected] = React.useState<SelectedNode>('settings')
	const [configsExpanded, setConfigsExpanded] = React.useState(true)

	// Per-config right panel
	const [activeTab, setActiveTab] = React.useState<'connections' | 'json'>('connections')
	const [jsonValue, setJsonValue] = React.useState(() =>
		JSON.stringify(savedSettings.configs[savedSettings.currentConfigIndex], null, 2),
	)

	// YouTube settings state
	const [localYouTube, setLocalYouTube] = React.useState<YouTubeConfig>(
		() => savedSettings.youtube ?? (DEFAULT_SETTINGS.youtube as YouTubeConfig),
	)

	// OBS Raw Request panel state
	const [rawRequestName, setRawRequestName] = React.useState('GetStreamServiceSettings')
	const [rawRequestBody, setRawRequestBody] = React.useState('{}')
	const [rawResponse, setRawResponse] = React.useState('')
	const [rawSending, setRawSending] = React.useState(false)
	const handleSendRawRequest = React.useCallback(async () => {
		if (!obs?.adapter) return
		setRawSending(true)
		setRawResponse('')
		try {
			let bodyObj: any = {}
			try {
				bodyObj = JSON.parse(rawRequestBody)
			} catch {
				setRawResponse('Error: request body is not valid JSON')
				setRawSending(false)
				return
			}
			const result = await (obs.adapter as any).sendRaw(rawRequestName.trim(), bodyObj)
			setRawResponse(JSON.stringify(result, null, 2))
		} catch (e: any) {
			setRawResponse(`Error: ${e?.message ?? String(e)}`)
		}
		setRawSending(false)
	}, [obs, rawRequestName, rawRequestBody])

	// Prompt / confirm dialog state
	const [namePrompt, setNamePrompt] = React.useState<{
		title: string
		initialValue: string
		onConfirm: (name: string) => void
	} | null>(null)
	const [deleteConfirm, setDeleteConfirm] = React.useState<{ configIndex: number; configName: string } | null>(null)
	const [jsonError, setJsonError] = React.useState<string | null>(null)

	const handleBrowseBackupFolder = React.useCallback(async () => {
		if (!window.ipcRenderer) return
		try {
			const selectedPath = await window.ipcRenderer.selectFolder(localAutoBackupConfigFolder)
			if (selectedPath) {
				setLocalAutoBackupConfigFolder(selectedPath)
			}
		} catch (error) {
			console.error('Failed to select backup folder:', error)
		}
	}, [localAutoBackupConfigFolder])

	const handleBrowseFfmpegPath = React.useCallback(async () => {
		if (!window.ipcRenderer) return
		try {
			const selectedPath = await window.ipcRenderer.selectFolder(localFfmpegPath)
			if (selectedPath) {
				setLocalFfmpegPath(selectedPath)
			}
		} catch (error) {
			console.error('Failed to select ffmpeg folder:', error)
		}
	}, [localFfmpegPath])

	// After a new config is appended, select it on the next render (avoids side-effects in state updaters)
	const pendingSelectLastRef = React.useRef(false)
	React.useEffect(() => {
		if (pendingSelectLastRef.current && localConfigs.length > 0) {
			pendingSelectLastRef.current = false
			const idx = localConfigs.length - 1
			setSelected(idx)
			setJsonValue(JSON.stringify(localConfigs[idx], null, 2))
		}
	}, [localConfigs])

	// Flush JSON text area into localConfigs (used before switching config / saving)
	const flushJson = React.useCallback(
		(configIndex: number): boolean => {
			try {
				const parsed = JSON.parse(jsonValue)
				setLocalConfigs((prev) => {
					const next = [...prev]
					next[configIndex] = parsed
					return next
				})
				return true
			} catch {
				return false
			}
		},
		[jsonValue],
	)

	// When selected changes to a config node, sync JSON text area
	const handleSelectNode = React.useCallback(
		(node: SelectedNode) => {
			// If leaving a config node in json tab, try to flush edits
			if (typeof selected === 'number' && activeTab === 'json') {
				flushJson(selected)
			}
			setSelected(node)
			if (typeof node === 'number') {
				setJsonValue(JSON.stringify(localConfigs[node], null, 2))
			}
		},
		[selected, activeTab, flushJson, localConfigs],
	)

	const handleConnectionsChange = React.useCallback(
		(configIndex: number, newConfig: any) => {
			setLocalConfigs((prev) => {
				const next = [...prev]
				next[configIndex] = newConfig
				return next
			})
		},
		[],
	)

	const handleNewConfig = React.useCallback(() => {
		setNamePrompt({
			title: 'New config name',
			initialValue: '',
			onConfirm: (name) => {
				const newConfig: ConfigItem = { ...DEFAULT_SETTINGS.configs[0], name, shortcuts: DEFAULT_SHORTCUTS }
				pendingSelectLastRef.current = true
				setLocalConfigs((prev) => [...prev, newConfig])
				setNamePrompt(null)
			},
		})
	}, [])

	const handleRename = React.useCallback(
		(configIndex: number) => {
			setNamePrompt({
				title: 'Rename config',
				initialValue: localConfigs[configIndex]?.name ?? '',
				onConfirm: (newName) => {
					setLocalConfigs((prev) => {
						const next = [...prev]
						next[configIndex] = { ...next[configIndex], name: newName }
						return next
					})
					setNamePrompt(null)
				},
			})
		},
		[localConfigs],
	)

	const handleDelete = React.useCallback(
		(configIndex: number) => {
			if (localConfigs.length <= 1) return
			setDeleteConfirm({ configIndex, configName: localConfigs[configIndex]?.name ?? '' })
		},
		[localConfigs],
	)

	const confirmDelete = React.useCallback(() => {
		if (!deleteConfirm) return
		const { configIndex } = deleteConfirm
		setLocalConfigs((prev) => {
			const next = prev.filter((_, i) => i !== configIndex)
			const newActive = Math.min(localConfigIndex, next.length - 1)
			setLocalConfigIndex(newActive)
			setSelected(newActive)
			setJsonValue(JSON.stringify(next[newActive], null, 2))
			return next
		})
		setDeleteConfirm(null)
	}, [deleteConfirm, localConfigIndex])

	const handleSave = () => {
		let finalConfigs = localConfigs
		// Flush JSON edits if on the JSON tab
		if (typeof selected === 'number' && activeTab === 'json') {
			try {
				const parsed = JSON.parse(jsonValue)
				finalConfigs = [...localConfigs]
				finalConfigs[selected] = parsed
			} catch (e) {
				setJsonError(`Invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`)
				return
			}
		}
		// Merge localShortcuts back into the current config
		const configsWithShortcuts = finalConfigs.map((cfg, i) =>
			i === localConfigIndex ? { ...cfg, shortcuts: localShortcuts } : cfg
		)
		saveFullSettings({
			title: localTitle,
			configs: configsWithShortcuts,
			currentConfigIndex: localConfigIndex,
			selectConfigAtLaunch: localSelectConfigAtLaunch,
			autoBackupConfigOnClose: localAutoBackupConfigOnClose,
			autoBackupConfigFolder: localAutoBackupConfigFolder,
			ffmpegPath: localFfmpegPath,
			confirmBeforeStartStreaming: localConfirmBeforeStartStreaming,
			confirmBeforeStopStreaming: localConfirmBeforeStopStreaming,
			confirmBeforeStartRecording: localConfirmBeforeStartRecording,
			confirmBeforeStopRecording: localConfirmBeforeStopRecording,
			confirmBeforeGoLive: localConfirmBeforeGoLive,
			youtube: localYouTube,
		})
		onClose()
	}

	// ---------------------------------------------------------------------------
	// Render helpers
	// ---------------------------------------------------------------------------

	const handleYouTubeAuthSaveNow = React.useCallback(
		(newYouTube: YouTubeConfig) => {
			setLocalYouTube(newYouTube)
			// Persist immediately — don't wait for the Save button
			saveFullSettings({
				...savedSettings,
				youtube: newYouTube,
			})
		},
		[savedSettings, saveFullSettings],
	)

	const renderTree = () => (
		<>
			{/* Settings node */}
			<TreeRow
				$depth={0}
				$selected={selected === 'settings'}
				onClick={() => handleSelectNode('settings')}
			>
				<TreeIcon>
					<SettingsIcon style={{ width: 16, height: 16, opacity: 0.7 }} />
				</TreeIcon>
				<TreeLabel>Settings</TreeLabel>
			</TreeRow>

			{/* Keyboard Shortcuts node */}
			<TreeRow
				$depth={0}
				$selected={selected === 'keyboard-shortcuts'}
				onClick={() => handleSelectNode('keyboard-shortcuts')}
			>
				<TreeIcon>
					<KeyboardIcon style={{ width: 16, height: 16, opacity: 0.7 }} />
				</TreeIcon>
				<TreeLabel>Keyboard Shortcuts</TreeLabel>
			</TreeRow>

			{/* OBS Raw Request node */}
			<TreeRow
				$depth={0}
				$selected={selected === 'obs-raw-request'}
				onClick={() => handleSelectNode('obs-raw-request')}
			>
				<TreeIcon>
					<CodeIcon style={{ width: 16, height: 16, opacity: 0.7 }} />
				</TreeIcon>
				<TreeLabel>OBS Raw Request</TreeLabel>
			</TreeRow>

			{/* YouTube Live Integration node */}
			<TreeRow
				$depth={0}
				$selected={selected === 'youtube'}
				onClick={() => handleSelectNode('youtube')}
			>
				<TreeIcon>
					<YouTubeIcon style={{ width: 16, height: 16, opacity: 0.7 }} />
				</TreeIcon>
				<TreeLabel>YouTube Live</TreeLabel>
			</TreeRow>

			{/* Configs group */}
			<TreeRow
				$depth={0}
				$selected={selected === 'configs-group'}
				onClick={() => {
					handleSelectNode('configs-group')
					setConfigsExpanded((v) => !v)
				}}
			>
				<TreeIcon>
					{configsExpanded
						? <ExpandMore style={{ width: 18, height: 18, opacity: 0.7 }} />
						: <ChevronRight style={{ width: 18, height: 18, opacity: 0.7 }} />
					}
				</TreeIcon>
				<TreeLabel>Configs</TreeLabel>
				<Tooltip title="New config">
					<IconButton
						size="small"
						onClick={(e) => { e.stopPropagation(); handleNewConfig() }}
						style={{ padding: 2 }}
					>
						<Add style={{ width: 16, height: 16 }} />
					</IconButton>
				</Tooltip>
			</TreeRow>

			{/* Per-config items */}
			{configsExpanded && localConfigs.map((cfg, idx) => (
				<TreeRow
					key={idx}
					$depth={1}
					$selected={selected === idx}
					onClick={() => handleSelectNode(idx)}
				>
					<TreeIcon />
					<TreeLabel title={cfg.name}>{cfg.name}</TreeLabel>
				</TreeRow>
			))}
		</>
	)

	const renderRightPanel = () => {
		if (selected === 'keyboard-shortcuts') {
			return (
				<>
					<RightPanelHeader>
						<Typography variant="subtitle1" style={{ fontWeight: 600 }}>
							Keyboard Shortcuts
						</Typography>
					</RightPanelHeader>
					<RightPanelContent>
						<KeyboardShortcutsPanel
							obs={obs}
							shortcuts={localShortcuts}
							onChange={setLocalShortcuts}
						/>
					</RightPanelContent>
				</>
			)
		}

		if (selected === 'youtube') {
			const connectionNames = localConfigs[localConfigIndex]
				? Object.keys(localConfigs[localConfigIndex].connections ?? {})
				: ['main']
			return (
				<>
					<RightPanelHeader>
						<Typography variant="subtitle1" style={{ fontWeight: 600 }}>
							YouTube Live Integration
						</Typography>
					</RightPanelHeader>
					<RightPanelContent>
						<YouTubeSettingsPanel
							value={localYouTube}
							connectionNames={connectionNames.length > 0 ? connectionNames : ['main']}
							onChange={setLocalYouTube}
							onSaveNow={handleYouTubeAuthSaveNow}
						/>
					</RightPanelContent>
				</>
			)
		}

		if (selected === 'obs-raw-request') {
			const isConnected = Boolean(obs?.connected)
			const connectionName = localConfigs[localConfigIndex]?.connection || 'main'
			const versionLabel = obs?.apiVersion ? `v${obs.apiVersion}` : ''
			return (
				<>
					<RightPanelHeader>
						<Typography variant="subtitle1" style={{ fontWeight: 600, flex: 1 }}>OBS Raw Request</Typography>
						<Typography variant="caption" style={{ opacity: 0.6 }}>
							{isConnected ? `${connectionName} · ${versionLabel}` : `${connectionName} · not connected`}
						</Typography>
					</RightPanelHeader>
					<RawSection>
						<TextField
							label="Request name"
							value={rawRequestName}
							onChange={(e) => setRawRequestName(e.target.value)}
							variant="outlined"
							size="small"
							fullWidth
							placeholder="e.g. GetStreamServiceSettings"
							helperText="OBS WebSocket request type"
						/>
						<TextField
							label="Request body (JSON)"
							value={rawRequestBody}
							onChange={(e) => setRawRequestBody(e.target.value)}
							variant="outlined"
							multiline
							minRows={5}
							fullWidth
							inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }}
						/>
						<Button
							variant="contained"
							color="primary"
							onClick={handleSendRawRequest}
							disabled={!isConnected || rawSending || !rawRequestName.trim()}
						>
							{rawSending ? 'Sending…' : 'Send'}
						</Button>
						{rawResponse !== '' && (
							<>
								<TextField
									label="Response"
									value={rawResponse}
									variant="outlined"
									multiline
									minRows={12}
									fullWidth
									inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }}
									InputProps={{ readOnly: true }}
								/>
								<Button
									variant="outlined"
									size="small"
									onClick={() => { navigator.clipboard.writeText(rawResponse) }}
								>
									Copy Response
								</Button>
							</>
						)}
					</RawSection>
				</>
			)
		}

		if (selected === 'settings') {
			const isElectron = Boolean(window.ipcRenderer)
			const backupFolderDisabled = !localAutoBackupConfigOnClose
			return (
				<>
					<RightPanelHeader>
						<Typography variant="subtitle1" style={{ fontWeight: 600 }}>
							Settings
						</Typography>
					</RightPanelHeader>
					<RightPanelContent>
						<SettingsFormSection>
							<TextField
								label="Window title"
								value={localTitle}
								onChange={(e) => setLocalTitle(e.target.value)}
								variant="outlined"
								size="small"
								fullWidth
							/>
							<FormControlLabel
								control={
									<Checkbox
										checked={localSelectConfigAtLaunch}
										onChange={(e) => setLocalSelectConfigAtLaunch(e.target.checked)}
										color="primary"
										size="small"
									/>
								}
								label="Select config at launch"
							/>
							{isElectron && (
								<>
									<FormControlLabel
										control={
											<Checkbox
												checked={localAutoBackupConfigOnClose}
												onChange={(e) => setLocalAutoBackupConfigOnClose(e.target.checked)}
												color="primary"
												size="small"
											/>
										}
										label="Auto backup config on close"
									/>
									<BackupFolderRow>
										<TextField
											label="Backup folder"
											value={localAutoBackupConfigFolder}
											onChange={(e) => setLocalAutoBackupConfigFolder(e.target.value)}
											variant="outlined"
											size="small"
											fullWidth
											disabled={backupFolderDisabled}
											helperText="Folder path where config.json is copied when the app closes"
										/>
										<BackupFolderBrowseButton
											variant="outlined"
											onClick={handleBrowseBackupFolder}
											disabled={backupFolderDisabled}
										>
											Browse
										</BackupFolderBrowseButton>
									</BackupFolderRow>								<BackupFolderRow>
									<TextField
										label="FFmpeg binary folder (optional)"
										value={localFfmpegPath}
										onChange={(e) => setLocalFfmpegPath(e.target.value)}
										variant="outlined"
										size="small"
										fullWidth
										helperText="Folder containing ffmpeg.exe for RTSP tiles. Leave blank to use system PATH."
									/>
									<BackupFolderBrowseButton
										variant="outlined"
										onClick={handleBrowseFfmpegPath}
									>
										Browse
									</BackupFolderBrowseButton>
								</BackupFolderRow>								</>
							)}
							<FormControlLabel
								control={
									<Checkbox
										checked={localConfirmBeforeStartStreaming}
										onChange={(e) => setLocalConfirmBeforeStartStreaming(e.target.checked)}
										color="primary"
										size="small"
									/>
								}
								label="Confirm before starting stream"
							/>
							<FormControlLabel
								control={
									<Checkbox
										checked={localConfirmBeforeStopStreaming}
										onChange={(e) => setLocalConfirmBeforeStopStreaming(e.target.checked)}
										color="primary"
										size="small"
									/>
								}
								label="Confirm before stopping stream"
							/>
							<FormControlLabel
								control={
									<Checkbox
										checked={localConfirmBeforeStartRecording}
										onChange={(e) => setLocalConfirmBeforeStartRecording(e.target.checked)}
										color="primary"
										size="small"
									/>
								}
								label="Confirm before starting recording"
							/>
							<FormControlLabel
								control={
									<Checkbox
										checked={localConfirmBeforeStopRecording}
										onChange={(e) => setLocalConfirmBeforeStopRecording(e.target.checked)}
										color="primary"
										size="small"
									/>
								}
								label="Confirm before stopping recording"
							/>
							<FormControlLabel
								control={
									<Checkbox
										checked={localConfirmBeforeGoLive}
										onChange={(e) => setLocalConfirmBeforeGoLive(e.target.checked)}
										color="primary"
										size="small"
									/>
								}
								label="Confirm before going live (YouTube)"
							/>
						</SettingsFormSection>
					</RightPanelContent>
				</>
			)
		}

		if (selected === 'configs-group') {
			return (
				<>
					<RightPanelHeader>
						<Typography variant="subtitle1" style={{ fontWeight: 600 }}>Configs</Typography>
					</RightPanelHeader>
					<RightPanelContent>
						<EmptyHint>
							Select a config to edit its connections and settings, or create a new one with the + button.
						</EmptyHint>
					</RightPanelContent>
				</>
			)
		}

		// Config node
		const configIndex = selected as number
		const config = localConfigs[configIndex]
		if (!config) return null

		return (
			<>
				<RightPanelHeader>
					<Typography variant="subtitle1" style={{ fontWeight: 600, flex: 1 }}>
						{config.name}
					</Typography>
					<Tooltip title="Rename">
						<IconButton size="small" onClick={() => handleRename(configIndex)}>
							<Edit fontSize="small" />
						</IconButton>
					</Tooltip>
					<Tooltip title="Delete">
						<span>
							<IconButton
								size="small"
								onClick={() => handleDelete(configIndex)}
								disabled={localConfigs.length <= 1}
							>
								<Delete fontSize="small" />
							</IconButton>
						</span>
					</Tooltip>
				</RightPanelHeader>

				<Tabs
					value={activeTab}
					onChange={(_, v) => setActiveTab(v)}
					indicatorColor="primary"
					textColor="primary"
					style={{ flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.12)' }}
				>
					<Tab value="connections" label="Connections" />
					<Tab value="json" label="JSON" />
				</Tabs>

				<TabContent>
					{activeTab === 'connections' ? (
						<ConfigVisualEditor
							config={config}
							onChange={(newConfig) => handleConnectionsChange(configIndex, newConfig)}
						/>
					) : (
						<StyledTextField
							multiline
							fullWidth
							variant="filled"
							InputProps={{ disableUnderline: true }}
							value={jsonValue}
							onChange={(e) => setJsonValue(e.target.value)}
							style={{ flex: 1, height: '100%' }}
						/>
					)}
				</TabContent>
			</>
		)
	}

	return (
		<Dialog open fullScreen onClose={onClose}>
			<AppBar className={classes.appBar}>
				<Toolbar>
					<Typography variant="h6" className={classes.title}>
						Settings
					</Typography>
					<IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
						<Close />
					</IconButton>
				</Toolbar>
			</AppBar>
			<DialogContent className={classes.content}>
				<DialogBody>
					<LeftPanel>{renderTree()}</LeftPanel>
					<RightPanel>{renderRightPanel()}</RightPanel>
				</DialogBody>
			</DialogContent>
			<DialogActions>
				<Button color="primary" variant="contained" onClick={handleSave}>
					Save
				</Button>
				<Button variant="contained" onClick={onClose}>
					Cancel
				</Button>
			</DialogActions>

			{namePrompt && (
				<NamePromptDialog
					open={namePrompt !== null}
					title={namePrompt.title}
					initialValue={namePrompt.initialValue}
					onConfirm={namePrompt.onConfirm}
					onCancel={() => setNamePrompt(null)}
				/>
			)}
			<ConfirmDialog
				open={deleteConfirm !== null}
				title="Delete config"
				message={`Delete config "${deleteConfirm?.configName}"?`}
				onConfirm={confirmDelete}
				onCancel={() => setDeleteConfirm(null)}
			/>
			<Dialog open={jsonError !== null} onClose={() => setJsonError(null)} fullWidth maxWidth="xs">
				<DialogTitle>Invalid JSON</DialogTitle>
				<DialogContent>
					<Typography variant="body2" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
						{jsonError}
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setJsonError(null)} color="primary" variant="contained">OK</Button>
				</DialogActions>
			</Dialog>
		</Dialog>
	)
}

