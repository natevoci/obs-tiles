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
import { Close, Add, Delete, Edit, ExpandMore, ChevronRight, Settings as SettingsIcon } from '@material-ui/icons'
import { ConfigVisualEditor } from './ConfigVisualEditor'
import { useSettings } from './SettingsContext'
import { ConfirmDialog } from '../ConfirmDialog'
import type { ConfigItem } from '../../../shared/types'
import { DEFAULT_SETTINGS } from '../../../shared/defaults'

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

type SelectedNode = 'settings' | 'configs-group' | number

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
	const [localConfirmBeforeStartStreaming, setLocalConfirmBeforeStartStreaming] = React.useState(savedSettings.confirmBeforeStartStreaming ?? false)
	const [localConfirmBeforeStopStreaming, setLocalConfirmBeforeStopStreaming] = React.useState(savedSettings.confirmBeforeStopStreaming ?? false)
	const [localConfirmBeforeStartRecording, setLocalConfirmBeforeStartRecording] = React.useState(savedSettings.confirmBeforeStartRecording ?? false)
	const [localConfirmBeforeStopRecording, setLocalConfirmBeforeStopRecording] = React.useState(savedSettings.confirmBeforeStopRecording ?? false)
	const [localConfigs, setLocalConfigs] = React.useState<ConfigItem[]>(() =>
		savedSettings.configs.map((c) => ({ ...c })),
	)
	const [localConfigIndex, setLocalConfigIndex] = React.useState(savedSettings.currentConfigIndex)

	// Tree selection
	const [selected, setSelected] = React.useState<SelectedNode>('settings')
	const [configsExpanded, setConfigsExpanded] = React.useState(true)

	// Per-config right panel
	const [activeTab, setActiveTab] = React.useState<'connections' | 'json'>('connections')
	const [jsonValue, setJsonValue] = React.useState(() =>
		JSON.stringify(savedSettings.configs[savedSettings.currentConfigIndex], null, 2),
	)

	// Prompt / confirm dialog state
	const [namePrompt, setNamePrompt] = React.useState<{
		title: string
		initialValue: string
		onConfirm: (name: string) => void
	} | null>(null)
	const [deleteConfirm, setDeleteConfirm] = React.useState<{ configIndex: number; configName: string } | null>(null)
	const [jsonError, setJsonError] = React.useState<string | null>(null)

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
				const newConfig: ConfigItem = { ...DEFAULT_SETTINGS.configs[0], name }
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
		saveFullSettings({
			title: localTitle,
			configs: finalConfigs,
			currentConfigIndex: localConfigIndex,
			selectConfigAtLaunch: localSelectConfigAtLaunch,
			confirmBeforeStartStreaming: localConfirmBeforeStartStreaming,
			confirmBeforeStopStreaming: localConfirmBeforeStopStreaming,
			confirmBeforeStartRecording: localConfirmBeforeStartRecording,
			confirmBeforeStopRecording: localConfirmBeforeStopRecording,
		})
		onClose()
	}

	// ---------------------------------------------------------------------------
	// Render helpers
	// ---------------------------------------------------------------------------

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
		if (selected === 'settings') {
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

