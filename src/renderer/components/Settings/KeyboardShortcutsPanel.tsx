import styled from 'styled-components'
import {
	Button,
	IconButton,
	MenuItem,
	Select,
	TextField,
	Tooltip,
	Typography,
} from '@material-ui/core'
import { Add, Delete } from '@material-ui/icons'

import { KeyCaptureInput } from './KeyCaptureInput'
import { useSceneList } from '~/api/obs/providers'
import { useSceneItemList } from '~/api/obs/providers'
import type { ConnectionPublic } from '~/api/obs/types'
import type { KeyboardShortcut, ShortcutAction } from '../../../shared/types'

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------

const PanelRoot = styled.div`
	display: flex;
	flex-direction: column;
	flex: 1;
	overflow-y: auto;
	padding: 16px 20px;
	gap: 8px;
`

const ShortcutRow = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
	padding: 8px 10px;
	border-radius: 4px;
	border: 1px solid rgba(255,255,255,0.1);
	background: rgba(255,255,255,0.03);
`

const ParamField = styled.div`
	display: flex;
	align-items: center;
	gap: 6px;
	flex-wrap: wrap;
`

const EmptyHint = styled.div`
	padding: 20px;
	opacity: 0.5;
	font-size: 13px;
`

// ---------------------------------------------------------------------------
// Action type options
// ---------------------------------------------------------------------------

const ACTION_TYPES: { value: ShortcutAction['type']; label: string }[] = [
	{ value: 'toggleRecording', label: 'Toggle Recording' },
	{ value: 'toggleStreaming', label: 'Toggle Streaming' },
	{ value: 'switchScene', label: 'Switch to Scene' },
	{ value: 'toggleSceneItem', label: 'Toggle Scene Item' },
	{ value: 'toggleAudioMute', label: 'Toggle Audio Mute' },
]

function defaultActionForType(type: ShortcutAction['type']): ShortcutAction {
	switch (type) {
		case 'toggleRecording': return { type: 'toggleRecording' }
		case 'toggleStreaming': return { type: 'toggleStreaming' }
		case 'switchScene': return { type: 'switchScene', sceneName: '' }
		case 'toggleSceneItem': return { type: 'toggleSceneItem', sceneName: '', sceneItemName: '' }
		case 'toggleAudioMute': return { type: 'toggleAudioMute', inputName: '' }
	}
}

// ---------------------------------------------------------------------------
// Per-row scene item sub-component (needs its own hook call per scene)
// ---------------------------------------------------------------------------

interface SceneItemSelectProps {
	obs: ConnectionPublic
	scene: string
	value: string
	onChange: (name: string) => void
}

const SceneItemSelect = ({ obs, scene, value, onChange }: SceneItemSelectProps) => {
	const items = useSceneItemList(obs, { scene })

	return (
		<Select
			value={value}
			onChange={(e) => onChange(e.target.value as string)}
			variant="outlined"
			style={{ minWidth: 140, fontSize: 13, height: 32 }}
			displayEmpty
		>
			<MenuItem value="" disabled><em>Scene item…</em></MenuItem>
			{(items ?? []).map((item) => (
				<MenuItem key={item.sceneItemId} value={item.sourceName}>
					{item.sourceName}
				</MenuItem>
			))}
		</Select>
	)
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

interface KeyboardShortcutsPanelProps {
	obs: ConnectionPublic
	shortcuts: KeyboardShortcut[]
	onChange: (shortcuts: KeyboardShortcut[]) => void
}

export const KeyboardShortcutsPanel = ({ obs, shortcuts, onChange }: KeyboardShortcutsPanelProps) => {
	const sceneListData = useSceneList(obs)
	const sceneNames = sceneListData ? Object.keys(sceneListData.scenes) : []

	const handleAddShortcut = () => {
		onChange([...shortcuts, { keys: '', action: { type: 'toggleRecording' } }])
	}

	const handleDelete = (index: number) => {
		onChange(shortcuts.filter((_, i) => i !== index))
	}

	const handleKeysChange = (index: number, keys: string) => {
		const next = [...shortcuts]
		next[index] = { ...next[index], keys }
		onChange(next)
	}

	const handleActionTypeChange = (index: number, type: ShortcutAction['type']) => {
		const next = [...shortcuts]
		next[index] = { ...next[index], action: defaultActionForType(type) }
		onChange(next)
	}

	const handleActionParamChange = (index: number, patch: Partial<ShortcutAction>) => {
		const next = [...shortcuts]
		next[index] = { ...next[index], action: { ...next[index].action, ...patch } as ShortcutAction }
		onChange(next)
	}

	const renderParams = (shortcut: KeyboardShortcut, index: number) => {
		const { action } = shortcut
		if (action.type === 'switchScene') {
			return (
				<ParamField>
					<Select
						value={action.sceneName}
						onChange={(e) => handleActionParamChange(index, { sceneName: e.target.value as string })}
						variant="outlined"
						style={{ minWidth: 160, fontSize: 13, height: 32 }}
						displayEmpty
					>
						<MenuItem value="" disabled><em>Scene…</em></MenuItem>
						{sceneNames.map((name) => (
							<MenuItem key={name} value={name}>{name}</MenuItem>
						))}
					</Select>
				</ParamField>
			)
		}

		if (action.type === 'toggleSceneItem') {
			return (
				<ParamField>
					<Select
						value={action.sceneName}
						onChange={(e) => handleActionParamChange(index, { sceneName: e.target.value as string, sceneItemName: '' })}
						variant="outlined"
						style={{ minWidth: 140, fontSize: 13, height: 32 }}
						displayEmpty
					>
						<MenuItem value="" disabled><em>Scene…</em></MenuItem>
						{sceneNames.map((name) => (
							<MenuItem key={name} value={name}>{name}</MenuItem>
						))}
					</Select>
					{action.sceneName && (
						<SceneItemSelect
							obs={obs}
							scene={action.sceneName}
							value={action.sceneItemName}
							onChange={(name) => handleActionParamChange(index, { sceneItemName: name })}
						/>
					)}
				</ParamField>
			)
		}

		if (action.type === 'toggleAudioMute') {
			return (
				<ParamField>
					<TextField
						value={action.inputName}
						onChange={(e) => handleActionParamChange(index, { inputName: e.target.value })}
						variant="outlined"
						size="small"
						placeholder="Input name…"
						style={{ minWidth: 160 }}
					/>
				</ParamField>
			)
		}

		return null
	}

	return (
		<PanelRoot>
			<Typography variant="body2" style={{ opacity: 0.6, marginBottom: 4 }}>
				Shortcuts are scoped to this configuration. They fire regardless of which tiles are in the layout.
			</Typography>

			{shortcuts.length === 0 && (
				<EmptyHint>No shortcuts configured. Click "Add Shortcut" to create one.</EmptyHint>
			)}

			{shortcuts.map((shortcut, index) => (
				<ShortcutRow key={index}>
					<KeyCaptureInput
						value={shortcut.keys}
						onChange={(keys) => handleKeysChange(index, keys)}
					/>

					<Select
						value={shortcut.action.type}
						onChange={(e) => handleActionTypeChange(index, e.target.value as ShortcutAction['type'])}
						variant="outlined"
						style={{ minWidth: 180, fontSize: 13, height: 32 }}
					>
						{ACTION_TYPES.map((opt) => (
							<MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
						))}
					</Select>

					{renderParams(shortcut, index)}

					<Tooltip title="Delete shortcut">
						<IconButton size="small" onClick={() => handleDelete(index)}>
							<Delete fontSize="small" />
						</IconButton>
					</Tooltip>
				</ShortcutRow>
			))}

			<div>
				<Button
					startIcon={<Add />}
					variant="outlined"
					size="small"
					onClick={handleAddShortcut}
					style={{ marginTop: 8 }}
				>
					Add Shortcut
				</Button>
			</div>
		</PanelRoot>
	)
}
