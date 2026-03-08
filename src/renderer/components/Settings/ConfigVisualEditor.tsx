import React from 'react'
import styled from 'styled-components'
import {
	TextField,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Checkbox,
	FormControlLabel,
	Typography,
	Divider,
} from '@material-ui/core'
import { ChevronRight, ExpandMore } from '@material-ui/icons'

// ---------------------------------------------------------------------------
// Utility: immutably set a deeply-nested value by path
// ---------------------------------------------------------------------------

function setPath(obj: any, path: (string | number)[], value: any): any {
	if (path.length === 0) return value
	const [head, ...rest] = path
	if (Array.isArray(obj)) {
		const arr = [...obj]
		arr[head as number] = setPath(arr[head as number], rest, value)
		return arr
	}
	return { ...obj, [head]: setPath(obj[head], rest, value) }
}

function getPath(obj: any, path: (string | number)[]): any {
	return path.reduce((cur, key) => (cur != null ? cur[key] : undefined), obj)
}

// ---------------------------------------------------------------------------
// Tree node model
// ---------------------------------------------------------------------------

type NodeType =
	| 'root-settings'
	| 'connections-group'
	| 'connection'
	| 'tiles-group'
	| 'tile-group'
	| 'tile-scene'
	| 'tile-sceneItem'
	| 'tile-button'
	| 'tile-text'
	| 'tile-audioInput'

interface TreeNode {
	id: string
	label: string
	type: NodeType
	/** Path into the config object that this node represents */
	path: (string | number)[]
	children?: TreeNode[]
}

// ---------------------------------------------------------------------------
// Tree building
// ---------------------------------------------------------------------------

function buildTileNode(tile: any, path: (string | number)[], id: string): TreeNode {
	if (tile && tile.tiles) {
		const dir = tile.direction || 'row'
		const label = tile.group
			? `group (${dir}): ${tile.group}`
			: `group (${dir})`
		const children: TreeNode[] = (tile.tiles as any[]).map((child, i) =>
			buildTileNode(child, [...path, 'tiles', i], `${id}/tiles/${i}`)
		)
		return { id, label, type: 'tile-group', path, children }
	}
	if (tile && 'sceneItem' in tile) {
		const display = tile.title || tile.sceneItem?.item || 'sceneItem'
		return { id, label: `sceneItem: ${display}`, type: 'tile-sceneItem', path }
	}
	if (tile && 'scene' in tile) {
		return { id, label: `scene: ${tile.scene}`, type: 'tile-scene', path }
	}
	if (tile && 'button' in tile) {
		return { id, label: `button: ${tile.button}`, type: 'tile-button', path }
	}
	if (tile && 'text' in tile) {
		return { id, label: `text: ${tile.text}`, type: 'tile-text', path }
	}
	if (tile && 'audioInput' in tile) {
		const display = tile.title || tile.audioInput?.inputName || 'audioInput'
		return { id, label: `audioInput: ${display}`, type: 'tile-audioInput', path }
	}
	return { id, label: 'unknown tile', type: 'tile-button', path }
}

function buildTree(config: any): TreeNode[] {
	const nodes: TreeNode[] = []

	nodes.push({
		id: 'settings',
		label: 'Settings',
		type: 'root-settings',
		path: [],
	})

	// Connections
	const connectionChildren: TreeNode[] = Object.keys(config.connections || {}).map((key) => ({
		id: `connections/${key}`,
		label: key,
		type: 'connection' as NodeType,
		path: ['connections', key],
	}))
	nodes.push({
		id: 'connections',
		label: 'Connections',
		type: 'connections-group',
		path: ['connections'],
		children: connectionChildren,
	})

	// Tiles
	const tileChildren: TreeNode[] = (config.tiles || []).map((tile: any, i: number) =>
		buildTileNode(tile, ['tiles', i], `tiles/${i}`)
	)
	nodes.push({
		id: 'tiles',
		label: 'Tiles',
		type: 'tiles-group',
		path: ['tiles'],
		children: tileChildren,
	})

	return nodes
}

// ---------------------------------------------------------------------------
// Styled components (tree)
// ---------------------------------------------------------------------------

const EditorLayout = styled.div`
	display: flex;
	flex-direction: row;
	height: 100%;
    width: 100%;
	overflow: hidden;
	border: 1px solid ${(p: any) => p.theme.border || '#444'};
	border-radius: 4px;
`

interface TreePanelProps {
	$width: number
}

const TreePanel = styled.div<TreePanelProps>`
	width: ${(p) => p.$width}px;
	min-width: 150px;
	flex-shrink: 0;
	overflow-y: auto;
	background: white;
`

const ResizeDivider = styled.div`
	width: 5px;
	flex-shrink: 0;
	cursor: col-resize;
	background: ${(p: any) => p.theme.border || '#444'};
	&:hover, &:active {
		background: ${(p: any) => p.theme.primary || '#5a82dc'};
	}
`

const DetailPanel = styled.div`
	flex: 1;
	min-width: 0;
	overflow-y: auto;
	padding: 16px;
`

interface TreeItemRowProps {
	$depth: number
	$selected: boolean
}

const TreeItemRow = styled.div<TreeItemRowProps>`
	display: flex;
	align-items: center;
	padding: 4px 8px 4px ${(p) => 8 + p.$depth * 16}px;
	cursor: pointer;
	user-select: none;
	background: ${(p) => p.$selected ? 'rgba(90,130,220,0.3)' : 'transparent'};
	&:hover {
		background: ${(p) => p.$selected ? 'rgba(90,130,220,0.35)' : 'rgba(255,255,255,0.06)'};
	}
`

const ChevronPlaceholder = styled.span`
	display: inline-block;
	width: 20px;
	height: 20px;
	flex-shrink: 0;
`

const TreeItemLabel = styled.span`
	font-size: 13px;
	font-family: monospace;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
`

const DetailSection = styled.div`
	display: flex;
	flex-direction: column;
	gap: 12px;
`

const DetailTitle = styled(Typography)`
	font-family: monospace !important;
`

// ---------------------------------------------------------------------------
// TreeNode component
// ---------------------------------------------------------------------------

interface TreeNodeItemProps {
	node: TreeNode
	depth: number
	selectedId: string | null
	expandedIds: Set<string>
	onSelect: (id: string) => void
	onToggleExpand: (id: string) => void
}

function TreeNodeItem({
	node,
	depth,
	selectedId,
	expandedIds,
	onSelect,
	onToggleExpand,
}: TreeNodeItemProps) {
	const hasChildren = node.children && node.children.length > 0
	const isExpanded = expandedIds.has(node.id)
	const isSelected = selectedId === node.id

	const handleClick = () => {
		onSelect(node.id)
		if (hasChildren) {
			onToggleExpand(node.id)
		}
	}

	return (
		<>
			<TreeItemRow
				$depth={depth}
				$selected={isSelected}
				onClick={handleClick}
				title={node.label}
			>
				{hasChildren ? (
					isExpanded ? (
						<ExpandMore style={{ width: 18, height: 18, flexShrink: 0, opacity: 0.7 }} />
					) : (
						<ChevronRight style={{ width: 18, height: 18, flexShrink: 0, opacity: 0.7 }} />
					)
				) : (
					<ChevronPlaceholder />
				)}
				<TreeItemLabel>{node.label}</TreeItemLabel>
			</TreeItemRow>
			{hasChildren && isExpanded &&
				node.children!.map((child) => (
					<TreeNodeItem
						key={child.id}
						node={child}
						depth={depth + 1}
						selectedId={selectedId}
						expandedIds={expandedIds}
						onSelect={onSelect}
						onToggleExpand={onToggleExpand}
					/>
				))
			}
		</>
	)
}

// ---------------------------------------------------------------------------
// Detail panel forms
// ---------------------------------------------------------------------------

interface DetailFormProps {
	config: any
	node: TreeNode
	onChange: (newConfig: any) => void
}

const CLICK_ACTIONS = ['toggleVisible', 'moveToTop']
const DIRECTIONS = ['row', 'column']
const API_VERSIONS = ['auto', 'v4', 'v5']

function makeField(
	label: string,
	value: string | number | undefined,
	onChange: (v: string) => void,
	type: 'text' | 'number' = 'text',
) {
	return (
		<TextField
			key={label}
			label={label}
			value={value ?? ''}
			onChange={(e) => onChange(e.target.value)}
			variant="outlined"
			size="small"
			fullWidth
			type={type}
		/>
	)
}

function makeSelectField(
	label: string,
	value: string | undefined,
	options: string[],
	onChange: (v: string) => void,
) {
	return (
		<FormControl variant="outlined" size="small" fullWidth key={label}>
			<InputLabel>{label}</InputLabel>
			<Select
				label={label}
				value={value ?? ''}
				onChange={(e) => onChange(e.target.value as string)}
			>
				{options.map((o) => (
					<MenuItem key={o} value={o}>{o === '' ? <em>— inherit —</em> : o}</MenuItem>
				))}
			</Select>
		</FormControl>
	)
}

function CommonTileFields({
	tile,
	onChangeTile,
	connectionNames,
}: {
	tile: any
	onChangeTile: (patch: any) => void
	connectionNames: string[]
}) {
	return (
		<>
			{makeField('Title', tile.title, (v) => onChangeTile({ title: v || undefined }))}
			{makeSelectField(
				'Connection',
				tile.connection ?? '',
				['', ...connectionNames],
				(v) => onChangeTile({ connection: v || undefined }),
			)}
			{makeField('Tile Size', tile.tileSize, (v) => onChangeTile({ tileSize: v || undefined }))}
		</>
	)
}

function RootSettingsForm({ config, onChange }: DetailFormProps) {
	const patch = (partial: any) => onChange({ ...config, ...partial })
	const connectionNames = Object.keys(config.connections || {})
	return (
		<DetailSection>
			<DetailTitle variant="subtitle2">Config Settings</DetailTitle>
			<Divider />
			{makeField('Name', config.name, (v) => patch({ name: v }))}
			{makeField('Tile Size', config.tileSize, (v) => patch({ tileSize: Number(v) || undefined }), 'number')}
			{makeSelectField('Direction', config.direction, DIRECTIONS, (v) => patch({ direction: v }))}
			{makeSelectField(
				'Default Connection',
				config.connection ?? '',
				['', ...connectionNames],
				(v) => patch({ connection: v || undefined }),
			)}
		</DetailSection>
	)
}

function ConnectionForm({ config, node, onChange }: DetailFormProps) {
	const conn = getPath(config, node.path) || {}
	const patch = (partial: any) => onChange(setPath(config, node.path, { ...conn, ...partial }))
	return (
		<DetailSection>
			<DetailTitle variant="subtitle2">Connection: {node.label}</DetailTitle>
			<Divider />
			{makeField('Address', conn.address, (v) => patch({ address: v }))}
			{makeSelectField('API Version', conn.apiVersion ?? 'auto', API_VERSIONS, (v) => patch({ apiVersion: v }))}
		</DetailSection>
	)
}

function GroupTileForm({ config, node, onChange }: DetailFormProps) {
	const tile = getPath(config, node.path) || {}
	const patchTile = (partial: any) => onChange(setPath(config, node.path, { ...tile, ...partial }))
	const connectionNames = Object.keys(config.connections || {})
	return (
		<DetailSection>
			<DetailTitle variant="subtitle2">Group Tile</DetailTitle>
			<Divider />
			{makeField('Group Name', tile.group, (v) => patchTile({ group: v || undefined }))}
			{makeSelectField('Direction', tile.direction ?? 'row', DIRECTIONS, (v) => patchTile({ direction: v }))}
			<FormControlLabel
				control={
					<Checkbox
						checked={tile.wrap !== false}
						onChange={(e) => patchTile({ wrap: e.target.checked ? undefined : false })}
					/>
				}
				label="Wrap tiles"
			/>
			<CommonTileFields tile={tile} onChangeTile={patchTile} connectionNames={connectionNames} />
		</DetailSection>
	)
}

function SceneButtonForm({ config, node, onChange }: DetailFormProps) {
	const tile = getPath(config, node.path) || {}
	const patchTile = (partial: any) => onChange(setPath(config, node.path, { ...tile, ...partial }))
	const connectionNames = Object.keys(config.connections || {})
	return (
		<DetailSection>
			<DetailTitle variant="subtitle2">Scene Button</DetailTitle>
			<Divider />
			{makeField('Scene Name', tile.scene, (v) => patchTile({ scene: v }))}
			<CommonTileFields tile={tile} onChangeTile={patchTile} connectionNames={connectionNames} />
		</DetailSection>
	)
}

function SceneItemButtonForm({ config, node, onChange }: DetailFormProps) {
	const tile = getPath(config, node.path) || {}
	const si = tile.sceneItem || {}
	const patchSI = (partial: any) =>
		onChange(setPath(config, node.path, { ...tile, sceneItem: { ...si, ...partial } }))
	const patchTile = (partial: any) => onChange(setPath(config, node.path, { ...tile, ...partial }))
	const connectionNames = Object.keys(config.connections || {})
	return (
		<DetailSection>
			<DetailTitle variant="subtitle2">Scene Item Button</DetailTitle>
			<Divider />
			{makeField('Scene', si.scene, (v) => patchSI({ scene: v }))}
			{makeField('Item', si.item, (v) => patchSI({ item: v }))}
			{makeSelectField(
				'Click Action',
				si.click ?? 'toggleVisible',
				CLICK_ACTIONS,
				(v) => patchSI({ click: v }),
			)}
			{makeSelectField(
				'Long Press Action',
				si.longPress ?? 'toggleVisible',
				CLICK_ACTIONS,
				(v) => patchSI({ longPress: v }),
			)}
			<CommonTileFields tile={tile} onChangeTile={patchTile} connectionNames={connectionNames} />
		</DetailSection>
	)
}

function ButtonTileForm({ config, node, onChange }: DetailFormProps) {
	const tile = getPath(config, node.path) || {}
	const patchTile = (partial: any) => onChange(setPath(config, node.path, { ...tile, ...partial }))
	const connectionNames = Object.keys(config.connections || {})
	return (
		<DetailSection>
			<DetailTitle variant="subtitle2">Button Tile</DetailTitle>
			<Divider />
			{makeField('Button Type', tile.button, (v) => patchTile({ button: v }))}
			<CommonTileFields tile={tile} onChangeTile={patchTile} connectionNames={connectionNames} />
		</DetailSection>
	)
}

function TextTileForm({ config, node, onChange }: DetailFormProps) {
	const tile = getPath(config, node.path) || {}
	const patchTile = (partial: any) => onChange(setPath(config, node.path, { ...tile, ...partial }))
	const connectionNames = Object.keys(config.connections || {})
	return (
		<DetailSection>
			<DetailTitle variant="subtitle2">Text Tile</DetailTitle>
			<Divider />
			{makeField('Text Type', tile.text, (v) => patchTile({ text: v }))}
			<CommonTileFields tile={tile} onChangeTile={patchTile} connectionNames={connectionNames} />
		</DetailSection>
	)
}

function AudioInputTileForm({ config, node, onChange }: DetailFormProps) {
	const tile = getPath(config, node.path) || {}
	const ai = tile.audioInput || {}
	const patchAI = (partial: any) =>
		onChange(setPath(config, node.path, { ...tile, audioInput: { ...ai, ...partial } }))
	const patchTile = (partial: any) => onChange(setPath(config, node.path, { ...tile, ...partial }))
	const connectionNames = Object.keys(config.connections || {})
	return (
		<DetailSection>
			<DetailTitle variant="subtitle2">Audio Input Tile</DetailTitle>
			<Divider />
			{makeField('Input Name', ai.inputName, (v) => patchAI({ inputName: v }))}
			{makeField('Max Volume', ai.maxVolume, (v) => patchAI({ maxVolume: v !== '' ? Number(v) : undefined }), 'number')}
			<CommonTileFields tile={tile} onChangeTile={patchTile} connectionNames={connectionNames} />
		</DetailSection>
	)
}

function EmptyDetail() {
	return (
		<DetailSection>
			<Typography variant="body2" color="textSecondary">
				Select an item in the tree to edit its properties.
			</Typography>
		</DetailSection>
	)
}

function renderDetailForm(config: any, node: TreeNode | null, onChange: (c: any) => void): React.ReactNode {
	if (!node) return <EmptyDetail />
	const props: DetailFormProps = { config, node, onChange }
	switch (node.type) {
		case 'root-settings': return <RootSettingsForm {...props} />
		case 'connection': return <ConnectionForm {...props} />
		case 'tile-group': return <GroupTileForm {...props} />
		case 'tile-scene': return <SceneButtonForm {...props} />
		case 'tile-sceneItem': return <SceneItemButtonForm {...props} />
		case 'tile-button': return <ButtonTileForm {...props} />
		case 'tile-text': return <TextTileForm {...props} />
		case 'tile-audioInput': return <AudioInputTileForm {...props} />
		case 'connections-group':
			return (
				<DetailSection>
					<DetailTitle variant="subtitle2">Connections</DetailTitle>
					<Divider />
					<Typography variant="body2" color="textSecondary">
						Expand to select and edit individual connections.
					</Typography>
				</DetailSection>
			)
		case 'tiles-group':
			return (
				<DetailSection>
					<DetailTitle variant="subtitle2">Tiles</DetailTitle>
					<Divider />
					<Typography variant="body2" color="textSecondary">
						Expand to select and edit individual tiles.
					</Typography>
				</DetailSection>
			)
		default:
			return <EmptyDetail />
	}
}

// ---------------------------------------------------------------------------
// Flat node lookup (for finding a node by id)
// ---------------------------------------------------------------------------

function flattenTree(nodes: TreeNode[]): TreeNode[] {
	const result: TreeNode[] = []
	function walk(n: TreeNode) {
		result.push(n)
		n.children?.forEach(walk)
	}
	nodes.forEach(walk)
	return result
}

// ---------------------------------------------------------------------------
// Main ConfigVisualEditor component
// ---------------------------------------------------------------------------

export interface ConfigVisualEditorProps {
	config: any
	onChange: (config: any) => void
}

export const ConfigVisualEditor = ({ config, onChange }: ConfigVisualEditorProps) => {
	const tree = React.useMemo(() => buildTree(config || {}), [config])

	const [selectedId, setSelectedId] = React.useState<string | null>('settings')
	const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
		() => new Set(
			flattenTree(buildTree(config || {}))
				.filter(n => n.children && n.children.length > 0)
				.map(n => n.id)
		)
	)

	// Resizable tree panel
	const [treeWidth, setTreeWidth] = React.useState(280)
	const isDragging = React.useRef(false)
	const dragStartX = React.useRef(0)
	const dragStartWidth = React.useRef(280)

	const handleDividerMouseDown = React.useCallback((e: React.MouseEvent) => {
		isDragging.current = true
		dragStartX.current = e.clientX
		dragStartWidth.current = treeWidth
		e.preventDefault()
	}, [treeWidth])

	React.useEffect(() => {
		const onMouseMove = (e: MouseEvent) => {
			if (!isDragging.current) return
			const delta = e.clientX - dragStartX.current
			setTreeWidth(Math.max(150, Math.min(600, dragStartWidth.current + delta)))
		}
		const onMouseUp = () => { isDragging.current = false }
		document.addEventListener('mousemove', onMouseMove)
		document.addEventListener('mouseup', onMouseUp)
		return () => {
			document.removeEventListener('mousemove', onMouseMove)
			document.removeEventListener('mouseup', onMouseUp)
		}
	}, [])

	const allNodes = React.useMemo(() => flattenTree(tree), [tree])
	const selectedNode = React.useMemo(
		() => allNodes.find((n) => n.id === selectedId) ?? null,
		[allNodes, selectedId],
	)

	const handleToggleExpand = React.useCallback((id: string) => {
		setExpandedIds((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}, [])

	const handleSelect = React.useCallback((id: string) => {
		setSelectedId(id)
	}, [])

	return (
		<EditorLayout>
			<TreePanel $width={treeWidth}>
				{tree.map((node) => (
					<TreeNodeItem
						key={node.id}
						node={node}
						depth={0}
						selectedId={selectedId}
						expandedIds={expandedIds}
						onSelect={handleSelect}
						onToggleExpand={handleToggleExpand}
					/>
				))}
			</TreePanel>
			<ResizeDivider onMouseDown={handleDividerMouseDown} />
			<DetailPanel>
			<>{renderDetailForm(config || {}, selectedNode, onChange)}</>
			</DetailPanel>
		</EditorLayout>
	)
}
