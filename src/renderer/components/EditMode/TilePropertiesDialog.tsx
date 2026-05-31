import React from 'react'
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	TextField,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	FormControlLabel,
	Checkbox,
	Typography,
	CircularProgress,
	List,
	ListItem,
	Divider,
} from '@material-ui/core'
import styled from 'styled-components'
import { useObs, useSceneList, useSceneItemList } from '~/api/obs'
import { SCENE_PLACEHOLDER_PROGRAM, SCENE_PLACEHOLDER_PREVIEW } from '../tiles/scenePlaceholders.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TileType = 'group' | 'scene' | 'sceneItem' | 'button' | 'text' | 'audioInput' | 'rtspStream' | 'youtubeLive'

export interface TilePropertiesDialogProps {
	open: boolean
	tile: any
	/** The effective connection name to query OBS with */
	connection?: string
	/** Called when the user saves changes */
	onSave: (updated: any) => void
	onClose: () => void
}

// ---------------------------------------------------------------------------
// Styled
// ---------------------------------------------------------------------------

const FormSection = styled.div`
	display: flex;
	flex-direction: column;
	gap: 14px;
	padding-top: 8px;
`

const DIRECTIONS = ['row', 'column']
const CLICK_ACTIONS = ['toggleVisible', 'moveToTop']
const BUTTON_TYPES = ['toggleStreaming', 'toggleRecording']
const VIEW_TYPES: { value: string; label: string }[] = [
	{ value: 'preview', label: 'Preview (tile)' },
	{ value: 'checkbox', label: 'Checkbox' },
]

// ---------------------------------------------------------------------------
// Helper: detect tile type
// ---------------------------------------------------------------------------

function detectTileType(tile: any): TileType {
	if (!tile) return 'button'
	if ('tiles' in tile) return 'group'
	if ('sceneItem' in tile) return 'sceneItem'
	if ('scene' in tile) return 'scene'
	if ('button' in tile) return 'button'
	if ('text' in tile) return 'text'
	if ('audioInput' in tile) return 'audioInput'
	if ('rtspStream' in tile) return 'rtspStream'
	if ('youtubeLive' in tile) return 'youtubeLive'
	return 'button'
}

// ---------------------------------------------------------------------------
// OBS scene/item pickers
// ---------------------------------------------------------------------------

interface ScenePickerProps {
	connection?: string
	value: string
	onChange: (v: string) => void
}

const ScenePicker = ({ connection, value, onChange }: ScenePickerProps) => {
	const obs = useObs({ connection })
	const sceneListData = useSceneList(obs)
	const scenes = sceneListData ? Object.keys(sceneListData.scenes) : null

	if (!obs.connected) {
		return (
			<TextField
				label="Scene"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				variant="outlined"
				size="small"
				fullWidth
				helperText="OBS not connected - enter scene name manually"
			/>
		)
	}

	if (!scenes) {
		return (
			<FormControl variant="outlined" size="small" fullWidth>
				<InputLabel>Scene</InputLabel>
				<Select label="Scene" value="" disabled>
					<MenuItem value=""><CircularProgress size={16} style={{ margin: '0 8px' }} /> Loading…</MenuItem>
				</Select>
			</FormControl>
		)
	}

	const programScene = sceneListData?.currentScene
	const previewScene = sceneListData?.currentPreviewSceneName

	return (
		<FormControl variant="outlined" size="small" fullWidth>
			<InputLabel>Scene</InputLabel>
			<Select
				label="Scene"
				value={value}
				onChange={(e) => onChange(e.target.value as string)}
			>
				{scenes.map((s) => (
					<MenuItem key={s} value={s}>{s}</MenuItem>
				))}
				{(programScene || previewScene) && <Divider />}
				{programScene && (
					<MenuItem value={SCENE_PLACEHOLDER_PROGRAM} style={{ fontStyle: 'italic' }}>
						▶ Program - {programScene}
					</MenuItem>
				)}
				{previewScene && (
					<MenuItem value={SCENE_PLACEHOLDER_PREVIEW} style={{ fontStyle: 'italic' }}>
						○ Preview - {previewScene}
					</MenuItem>
				)}
			</Select>
		</FormControl>
	)
}

interface SceneItemPickerProps {
	connection?: string
	scene: string
	value: string
	onChange: (v: string) => void
}

const SceneItemPicker = ({ connection, scene, value, onChange }: SceneItemPickerProps) => {
	const obs = useObs({ connection })
	const items = useSceneItemList(obs, { scene })

	if (!obs.connected || !scene) {
		return (
			<TextField
				label="Item"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				variant="outlined"
				size="small"
				fullWidth
				helperText={!scene ? 'Enter a scene name first' : 'OBS not connected - enter item name manually'}
			/>
		)
	}

	if (!items) {
		return (
			<FormControl variant="outlined" size="small" fullWidth>
				<InputLabel>Item</InputLabel>
				<Select label="Item" value="" disabled>
					<MenuItem value=""><CircularProgress size={16} style={{ margin: '0 8px' }} /> Loading…</MenuItem>
				</Select>
			</FormControl>
		)
	}

	return (
		<FormControl variant="outlined" size="small" fullWidth>
			<InputLabel>Item</InputLabel>
			<Select
				label="Item"
				value={value}
				onChange={(e) => onChange(e.target.value as string)}
			>
				{items.map((item: any) => (
					<MenuItem key={item.sourceName} value={item.sourceName}>{item.sourceName}</MenuItem>
				))}
			</Select>
		</FormControl>
	)
}

// ---------------------------------------------------------------------------
// Per-type forms
// ---------------------------------------------------------------------------

interface FormProps {
	draft: any
	setDraft: (d: any) => void
	connection?: string
}

const FieldRow = styled.div`
	display: flex;
	gap: 8px;
`

function SizeFields({ draft, setDraft }: { draft: any; setDraft: (d: any) => void }) {
	return (
		<FieldRow>
			<TextField
				label="Tile Size"
				type="number"
				value={draft.tileSize ?? ''}
				onChange={(e) => setDraft({ ...draft, tileSize: e.target.value || undefined })}
				variant="outlined" size="small" fullWidth
			/>
			<TextField
				label="Font Size"
				type="number"
				value={draft.fontSize ?? ''}
				onChange={(e) => setDraft({ ...draft, fontSize: e.target.value || undefined })}
				variant="outlined" size="small" fullWidth
			/>
		</FieldRow>
	)
}

function RefreshTimeFields({ draft, setDraft }: { draft: any; setDraft: (d: any) => void }) {
	return (
		<FieldRow>
			<TextField
				label="Active Refresh (ms)"
				type="number"
				value={draft.activeRefreshTime ?? ''}
				onChange={(e) => setDraft({ ...draft, activeRefreshTime: e.target.value ? Number(e.target.value) : undefined })}
				variant="outlined" size="small" fullWidth
				helperText="ms - when tile is active"
			/>
			<TextField
				label="Inactive Refresh (ms)"
				type="number"
				value={draft.inactiveRefreshTime ?? ''}
				onChange={(e) => setDraft({ ...draft, inactiveRefreshTime: e.target.value ? Number(e.target.value) : undefined })}
				variant="outlined" size="small" fullWidth
				helperText="ms - when tile is inactive"
			/>
		</FieldRow>
	)
}

function GroupForm({ draft, setDraft }: FormProps) {
	return (
		<FormSection>
			<TextField
				label="Group Name"
				value={draft.group ?? ''}
				onChange={(e) => setDraft({ ...draft, group: e.target.value || undefined })}
				variant="outlined" size="small" fullWidth
			/>
			<FormControl variant="outlined" size="small" fullWidth>
				<InputLabel>Direction</InputLabel>
				<Select label="Direction" value={draft.direction ?? 'row'}
					onChange={(e) => setDraft({ ...draft, direction: e.target.value as string })}>
					{DIRECTIONS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
				</Select>
			</FormControl>
			<FormControlLabel
				control={
					<Checkbox
						checked={draft.wrap !== false}
						onChange={(e) => setDraft({ ...draft, wrap: e.target.checked ? undefined : false })}
					/>
				}
				label="Wrap tiles"
			/>
			<FormControlLabel
				control={
					<Checkbox
						checked={draft.showBorder !== false}
						onChange={(e) => setDraft({ ...draft, showBorder: e.target.checked ? undefined : false })}
					/>
				}
				label="Show border"
			/>
			<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
				<input
					type="color"
					value={draft.backgroundColor ?? '#1e2a38'}
					onChange={(e) => setDraft({ ...draft, backgroundColor: e.target.value })}
					style={{ width: 36, height: 36, padding: 2, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.23)', borderRadius: 4, background: 'none', flexShrink: 0 }}
				/>
				<TextField
					label="Background Color"
					value={draft.backgroundColor ?? ''}
					placeholder="Default (theme color)"
					onChange={(e) => setDraft({ ...draft, backgroundColor: e.target.value || undefined })}
					variant="outlined" size="small"
					style={{ flex: 1 }}
					helperText="Hex color, e.g. #1e2a38. Clear to use theme default."
				/>
			</div>
			<TextField
				label="Connection"
				value={draft.connection ?? ''}
				onChange={(e) => setDraft({ ...draft, connection: e.target.value || undefined })}
				variant="outlined" size="small" fullWidth
			/>
			<SizeFields draft={draft} setDraft={setDraft} />
			<RefreshTimeFields draft={draft} setDraft={setDraft} />
		</FormSection>
	)
}

function SceneForm({ draft, setDraft, connection }: FormProps) {
	return (
		<FormSection>
			<ScenePicker connection={connection} value={draft.scene ?? ''} onChange={(v) => setDraft({ ...draft, scene: v })} />
			<FormControl variant="outlined" size="small" fullWidth>
				<InputLabel>View Type</InputLabel>
				<Select label="View Type" value={draft.viewType ?? 'preview'}
					onChange={(e) => setDraft({ ...draft, viewType: e.target.value === 'preview' ? undefined : e.target.value })}>
					{VIEW_TYPES.map((vt) => <MenuItem key={vt.value} value={vt.value}>{vt.label}</MenuItem>)}
				</Select>
			</FormControl>
			<TextField
				label="Title (optional)"
				value={draft.title ?? ''}
				onChange={(e) => setDraft({ ...draft, title: e.target.value || undefined })}
				variant="outlined" size="small" fullWidth
			/>
			<SizeFields draft={draft} setDraft={setDraft} />
			<RefreshTimeFields draft={draft} setDraft={setDraft} />
		</FormSection>
	)
}

function SceneItemForm({ draft, setDraft, connection }: FormProps) {
	const si = draft.sceneItem ?? {}
	const patchSI = (partial: any) => setDraft({ ...draft, sceneItem: { ...si, ...partial } })
	return (
		<FormSection>
			<ScenePicker
				connection={connection}
				value={si.scene ?? ''}
				onChange={(v) => patchSI({ scene: v })}
			/>
			<SceneItemPicker
				connection={connection}
				scene={si.scene ?? ''}
				value={si.item ?? ''}
				onChange={(v) => patchSI({ item: v })}
			/>
			<FormControl variant="outlined" size="small" fullWidth>
				<InputLabel>Click Action</InputLabel>
				<Select label="Click Action" value={si.click ?? 'toggleVisible'}
					onChange={(e) => patchSI({ click: e.target.value as string })}>
					{CLICK_ACTIONS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
				</Select>
			</FormControl>
			<FormControl variant="outlined" size="small" fullWidth>
				<InputLabel>Long Press Action</InputLabel>
				<Select label="Long Press Action" value={si.longPress ?? 'toggleVisible'}
					onChange={(e) => patchSI({ longPress: e.target.value as string })}>
					{CLICK_ACTIONS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
				</Select>
			</FormControl>
			<FormControl variant="outlined" size="small" fullWidth>
				<InputLabel>View Type</InputLabel>
				<Select label="View Type" value={draft.viewType ?? 'preview'}
					onChange={(e) => setDraft({ ...draft, viewType: e.target.value === 'preview' ? undefined : e.target.value })}>
					{VIEW_TYPES.map((vt) => <MenuItem key={vt.value} value={vt.value}>{vt.label}</MenuItem>)}
				</Select>
			</FormControl>
			<TextField
				label="Title (optional)"
				value={draft.title ?? ''}
				onChange={(e) => setDraft({ ...draft, title: e.target.value || undefined })}
				variant="outlined" size="small" fullWidth
			/>
			<SizeFields draft={draft} setDraft={setDraft} />
			<RefreshTimeFields draft={draft} setDraft={setDraft} />
		</FormSection>
	)
}

function ButtonForm({ draft, setDraft }: FormProps) {
	return (
		<FormSection>
			<FormControl variant="outlined" size="small" fullWidth>
				<InputLabel>Button</InputLabel>
				<Select label="Button" value={draft.button ?? ''}
					onChange={(e) => setDraft({ ...draft, button: e.target.value as string })}>
					{BUTTON_TYPES.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
				</Select>
			</FormControl>
			<TextField
				label="Title (optional)"
				value={draft.title ?? ''}
				onChange={(e) => setDraft({ ...draft, title: e.target.value || undefined })}
				variant="outlined" size="small" fullWidth
			/>
			<SizeFields draft={draft} setDraft={setDraft} />
		</FormSection>
	)
}

function TextForm({ draft, setDraft }: FormProps) {
	const sl = draft.statsLines ?? {}
	const patchSL = (partial: any) => setDraft({ ...draft, statsLines: { ...sl, ...partial } })
	// Helper: true unless explicitly false
	const shown = (key: string) => sl[key] !== false

	return (
		<FormSection>
			<TextField
				label="Text type"
				value={draft.text ?? ''}
				onChange={(e) => setDraft({ ...draft, text: e.target.value || undefined })}
				variant="outlined" size="small" fullWidth
				helperText={`e.g. "stats"`}
			/>
			{draft.text === 'stats' && (
				<>
					<Typography variant="caption" color="textSecondary">Visible lines</Typography>
					{([
						['fps',           'FPS'],
						['cpu',           'CPU'],
						['memory',        'Memory'],
						['freeDisk',      'Free Disk'],
						['skippedFrames', 'Skipped Frames'],
					] as [string, string][]).map(([key, label]) => (
						<FormControlLabel
							key={key}
							control={
								<Checkbox
									checked={shown(key)}
									onChange={(e) => patchSL({ [key]: e.target.checked ? undefined : false })}
									size="small"
								/>
							}
							label={label}
						/>
					))}
				</>
			)}
			<TextField
				label="Custom Text (optional)"
				value={draft.customText ?? ''}
				onChange={(e) => setDraft({ ...draft, customText: e.target.value || undefined })}
				variant="outlined" size="small" fullWidth
				multiline
				minRows={2}
			/>
			<SizeFields draft={draft} setDraft={setDraft} />
		</FormSection>
	)
}

function AudioInputForm({ draft, setDraft }: FormProps) {
	const ai = draft.audioInput ?? {}
	const patchAI = (partial: any) => setDraft({ ...draft, audioInput: { ...ai, ...partial } })
	return (
		<FormSection>
			<TextField
				label="Input Name"
				value={ai.inputName ?? ''}
				onChange={(e) => patchAI({ inputName: e.target.value })}
				variant="outlined" size="small" fullWidth
			/>
			<TextField
				label="Max Volume"
				type="number"
				value={ai.maxVolume ?? ''}
				onChange={(e) => patchAI({ maxVolume: e.target.value !== '' ? Number(e.target.value) : undefined })}
				variant="outlined" size="small" fullWidth
			/>
			<FormControl variant="outlined" size="small" fullWidth>
				<InputLabel>View Type</InputLabel>
				<Select label="View Type" value={draft.viewType ?? 'preview'}
					onChange={(e) => setDraft({ ...draft, viewType: e.target.value === 'preview' ? undefined : e.target.value })}>
					{VIEW_TYPES.map((vt) => <MenuItem key={vt.value} value={vt.value}>{vt.label}</MenuItem>)}
				</Select>
			</FormControl>
			<TextField
				label="Title (optional)"
				value={draft.title ?? ''}
				onChange={(e) => setDraft({ ...draft, title: e.target.value || undefined })}
				variant="outlined" size="small" fullWidth
			/>
			<SizeFields draft={draft} setDraft={setDraft} />
		</FormSection>
	)
}

function YouTubeLiveForm({ draft, setDraft }: FormProps) {
	const sl = draft.statsLines ?? {}
	const patchSL = (partial: any) => setDraft({ ...draft, statsLines: { ...sl, ...partial } })

	return (
		<FormSection>
			<Typography variant="caption" color="textSecondary">Stat lines (always visible, blank when not live)</Typography>
			{([
				['elapsed', 'Elapsed time'],
				['viewers', 'Concurrent viewers'],
			] as [string, string][]).map(([key, label]) => (
				<FormControlLabel
					key={key}
					control={
						<Checkbox
							checked={sl[key] === true}
							onChange={(e) => patchSL({ [key]: e.target.checked ? true : undefined })}
							size="small"
						/>
					}
					label={label}
				/>
			))}
			<FormControlLabel
				control={
					<Checkbox
						checked={draft.autoCreateBroadcast === true}
						onChange={(e) => setDraft({ ...draft, autoCreateBroadcast: e.target.checked ? true : undefined })}
					/>
				}
				label="Auto-create broadcast (skip dialog, use default settings)"
			/>
			<TextField
				label="Default Title (optional)"
				value={draft.defaultTitle ?? ''}
				onChange={(e) => setDraft({ ...draft, defaultTitle: e.target.value || undefined })}
				variant="outlined" size="small" fullWidth
				helperText="Supports {date} token. Overrides the global YouTube default title."
			/>
			<TextField
				label="Default Description (optional)"
				value={draft.defaultDescription ?? ''}
				onChange={(e) => setDraft({ ...draft, defaultDescription: e.target.value || undefined })}
				variant="outlined" size="small" fullWidth
				multiline
				minRows={2}
				helperText="Overrides the global YouTube default description."
			/>
			<TextField
				label="Title (optional)"
				value={draft.title ?? ''}
				onChange={(e) => setDraft({ ...draft, title: e.target.value || undefined })}
				variant="outlined" size="small" fullWidth
			/>
			<SizeFields draft={draft} setDraft={setDraft} />
		</FormSection>
	)
}

function RtspStreamForm({ draft, setDraft }: FormProps) {
	return (
		<FormSection>
			<TextField
				label="Stream ID"
				value={draft.rtspStream ?? ''}
				onChange={(e) => setDraft({ ...draft, rtspStream: e.target.value })}
				variant="outlined" size="small" fullWidth
				helperText="Unique identifier for this stream tile"
			/>
			<TextField
				label="Stream URL (optional)"
				value={draft.streamUrl ?? ''}
				onChange={(e) => setDraft({ ...draft, streamUrl: e.target.value || undefined })}
				variant="outlined" size="small" fullWidth
				helperText="RTSP URL, e.g. rtsp://192.168.1.100/live - defaults to rtsp://<connection-host>/live"
			/>
			<FieldRow>
				<TextField
					label="FPS (optional)"
					type="number"
					value={draft.fps ?? ''}
					onChange={(e) => setDraft({ ...draft, fps: e.target.value !== '' ? Number(e.target.value) : undefined })}
					variant="outlined" size="small" fullWidth
					helperText="Leave blank for native rate"
				/>
				<TextField
					label="Audio Offset (ms)"
					type="number"
					value={draft.audioSyncOffsetMs ?? ''}
					onChange={(e) => setDraft({ ...draft, audioSyncOffsetMs: e.target.value !== '' ? Number(e.target.value) : undefined })}
					variant="outlined" size="small" fullWidth
					helperText="Positive = delay audio"
				/>
			</FieldRow>
			<FormControlLabel
				control={
					<Checkbox
						checked={draft.startMuted !== false}
						onChange={(e) => setDraft({ ...draft, startMuted: e.target.checked ? undefined : false })}
					/>
				}
				label="Start muted"
			/>
			<TextField
				label="Title (optional)"
				value={draft.title ?? ''}
				onChange={(e) => setDraft({ ...draft, title: e.target.value || undefined })}
				variant="outlined" size="small" fullWidth
			/>
			<SizeFields draft={draft} setDraft={setDraft} />
		</FormSection>
	)
}

const TYPE_LABELS: Record<TileType, string> = {
	group: 'Group',
	scene: 'Scene Button',
	sceneItem: 'Scene Item Button',
	button: 'Button',
	text: 'Text',
	audioInput: 'Audio Input',
	rtspStream: 'RTSP Stream',
	youtubeLive: 'YouTube Live',
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

export const TilePropertiesDialog = ({
	open,
	tile,
	connection,
	onSave,
	onClose,
}: TilePropertiesDialogProps) => {
	const tileType = detectTileType(tile)
	const [draft, setDraft] = React.useState<any>(tile ?? {})

	React.useEffect(() => {
		if (open) setDraft(tile ?? {})
	}, [open, tile])

	const handleSave = () => onSave(draft)

	const formProps: FormProps = { draft, setDraft, connection }

	return (
		<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
			<DialogTitle>
				{TYPE_LABELS[tileType]} Properties
			</DialogTitle>
			<DialogContent>
				{tileType === 'group' && <GroupForm {...formProps} />}
				{tileType === 'scene' && <SceneForm {...formProps} />}
				{tileType === 'sceneItem' && <SceneItemForm {...formProps} />}
				{tileType === 'button' && <ButtonForm {...formProps} />}
				{tileType === 'text' && <TextForm {...formProps} />}
				{tileType === 'audioInput' && <AudioInputForm {...formProps} />}
				{tileType === 'rtspStream' && <RtspStreamForm {...formProps} />}
				{tileType === 'youtubeLive' && <YouTubeLiveForm {...formProps} />}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button onClick={handleSave} color="primary" variant="contained">Save</Button>
			</DialogActions>
		</Dialog>
	)
}

// ---------------------------------------------------------------------------
// Add Tile dialog
// ---------------------------------------------------------------------------

const TILE_TYPES: { type: TileType; label: string; defaultTile: any }[] = [
	{ type: 'group',      label: 'Group',            defaultTile: { group: 'New Group', direction: 'row', tiles: [], showBorder: true } },
	{ type: 'scene',      label: 'Scene Button',      defaultTile: { scene: '' } },
	{ type: 'sceneItem',  label: 'Scene Item Button', defaultTile: { sceneItem: { scene: '', item: '', click: 'toggleVisible' } } },
	{ type: 'button',     label: 'Button',            defaultTile: { button: 'toggleStreaming' } },
	{ type: 'text',       label: 'Text',              defaultTile: { text: 'stats' } },
	{ type: 'audioInput', label: 'Audio Input',       defaultTile: { audioInput: { inputName: '' } } },
	{ type: 'rtspStream',    label: 'RTSP Stream',    defaultTile: { rtspStream: 'stream', startMuted: true } },
	{ type: 'youtubeLive',   label: 'YouTube Live',   defaultTile: { youtubeLive: true } },
]

export interface AddTileDialogProps {
	open: boolean
	connection?: string
	onAdd: (tile: any) => void
	onClose: () => void
}

export const AddTileDialog = ({
	open,
	connection,
	onAdd,
	onClose,
}: AddTileDialogProps) => {
	const [selectedType, setSelectedType] = React.useState<TileType | null>(null)
	const [draft, setDraft] = React.useState<any>({})

	const handleSelectType = (type: TileType) => {
		const template = TILE_TYPES.find((t) => t.type === type)!
		setSelectedType(type)
		setDraft({ ...template.defaultTile })
	}

	const handleAdd = () => {
		onAdd(draft)
		onClose()
	}

	React.useEffect(() => {
		if (open) { setSelectedType(null); setDraft({}) }
	}, [open])

	const formProps: FormProps = { draft, setDraft, connection }

	return (
		<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
			<DialogTitle>Add Tile</DialogTitle>
			<DialogContent>
				{!selectedType ? (
					<List dense>
						{TILE_TYPES.map(({ type, label }) => (
						<ListItem
							key={type}
							button
							onClick={() => handleSelectType(type)}
						>
							{label}
							</ListItem>
						))}
					</List>
				) : (
					<>
						<Typography variant="caption" color="textSecondary">
							{TILE_TYPES.find((t) => t.type === selectedType)?.label}
							{' · '}
							<span
								style={{ cursor: 'pointer', textDecoration: 'underline' }}
								onClick={() => setSelectedType(null)}
							>
								change type
							</span>
						</Typography>
						{selectedType === 'group' && <GroupForm {...formProps} />}
						{selectedType === 'scene' && <SceneForm {...formProps} />}
						{selectedType === 'sceneItem' && <SceneItemForm {...formProps} />}
						{selectedType === 'button' && <ButtonForm {...formProps} />}
						{selectedType === 'text' && <TextForm {...formProps} />}
						{selectedType === 'audioInput' && <AudioInputForm {...formProps} />}
						{selectedType === 'rtspStream' && <RtspStreamForm {...formProps} />}
						{selectedType === 'youtubeLive' && <YouTubeLiveForm {...formProps} />}
					</>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				{selectedType && (
					<Button onClick={handleAdd} color="primary" variant="contained">Add</Button>
				)}
			</DialogActions>
		</Dialog>
	)
}
