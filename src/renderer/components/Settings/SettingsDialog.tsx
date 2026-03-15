import React from 'react'
import styled from 'styled-components'
import {
	Dialog,
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
		const name = window.prompt('New config name:')?.trim()
		if (!name) return
		const newConfig: ConfigItem = { ...DEFAULT_SETTINGS.configs[0], name }
		setLocalConfigs((prev) => {
			const next = [...prev, newConfig]
			const newIdx = next.length - 1
			setSelected(newIdx)
			setJsonValue(JSON.stringify(newConfig, null, 2))
			return next
		})
	}, [])

	const handleRename = React.useCallback(
		(configIndex: number) => {
			const newName = window.prompt('Rename config:', localConfigs[configIndex]?.name)?.trim()
			if (!newName) return
			setLocalConfigs((prev) => {
				const next = [...prev]
				next[configIndex] = { ...next[configIndex], name: newName }
				return next
			})
		},
		[localConfigs],
	)

	const handleDelete = React.useCallback(
		(configIndex: number) => {
			if (localConfigs.length <= 1) return
			if (!window.confirm(`Delete config "${localConfigs[configIndex]?.name}"?`)) return
			setLocalConfigs((prev) => {
				const next = prev.filter((_, i) => i !== configIndex)
				const newActive = Math.min(localConfigIndex, next.length - 1)
				setLocalConfigIndex(newActive)
				setSelected(newActive)
				setJsonValue(JSON.stringify(next[newActive], null, 2))
				return next
			})
		},
		[localConfigs, localConfigIndex],
	)

	const handleSave = () => {
		let finalConfigs = localConfigs
		// Flush JSON edits if on the JSON tab
		if (typeof selected === 'number' && activeTab === 'json') {
			try {
				const parsed = JSON.parse(jsonValue)
				finalConfigs = [...localConfigs]
				finalConfigs[selected] = parsed
			} catch (e) {
				alert(`Invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`)
				return
			}
		}
		saveFullSettings({
			title: localTitle,
			configs: finalConfigs,
			currentConfigIndex: localConfigIndex,
			selectConfigAtLaunch: localSelectConfigAtLaunch,
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
		</Dialog>
	)
}

