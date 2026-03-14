import React from 'react'
import styled from 'styled-components'
import {
	TextField,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Typography,
	Divider,
	Button,
} from '@material-ui/core'
import { ChevronRight, ExpandMore, Add, Delete } from '@material-ui/icons'

// ---------------------------------------------------------------------------
// Utility: immutably set / get a deeply-nested value by path
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
// Tree node model (connections only)
// ---------------------------------------------------------------------------

type NodeType = 'connections-group' | 'connection'

interface TreeNode {
	id: string
	label: string
	type: NodeType
	path: (string | number)[]
	children?: TreeNode[]
}

// ---------------------------------------------------------------------------
// Tree building
// ---------------------------------------------------------------------------

function buildTree(config: any): TreeNode[] {
	const connectionNames = Object.keys(config.connections || {})
	return [
		{
			id: 'connections',
			label: 'Connections',
			type: 'connections-group',
			path: ['connections'],
			children: connectionNames.map((name) => ({
				id: `connections/${name}`,
				label: name,
				type: 'connection' as const,
				path: ['connections', name],
			})),
		},
	]
}

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------

const EditorLayout = styled.div`
	display: flex;
	flex-direction: row;
	height: 100%;
	overflow: hidden;
`

const TreePanel = styled.div<{ $width: number }>`
	width: ${(p) => p.$width}px;
	overflow-y: auto;
	flex-shrink: 0;
	border-right: 1px solid ${(p) => p.theme.palette?.divider ?? '#ddd'};
`

const ResizeDivider = styled.div`
	width: 5px;
	cursor: col-resize;
	background: transparent;
	flex-shrink: 0;
	&:hover { background: rgba(128,128,128,0.2); }
`

const DetailPanel = styled.div`
	flex: 1;
	overflow-y: auto;
	padding: 0;
`

const TreeItemRow = styled.div<{ $depth: number; $selected: boolean }>`
	display: flex;
	align-items: center;
	padding: 4px 8px 4px ${(p) => 8 + p.$depth * 16}px;
	cursor: pointer;
	background: ${(p) => p.$selected ? 'rgba(255,255,255,0.12)' : 'transparent'};
	&:hover { background: rgba(255,255,255,0.06); }
`

const TreeItemLabel = styled.span`
	font-size: 13px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`

const ChevronPlaceholder = styled.div`
	width: 18px;
	height: 18px;
	flex-shrink: 0;
`

const DetailSection = styled.div`
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 16px;
`

const DetailTitle = styled(Typography)`
	font-weight: 600 !important;
` as typeof Typography

const ActionRow = styled.div`
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
`

// ---------------------------------------------------------------------------
// TreeNodeItem
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
	node, depth, selectedId, expandedIds, onSelect, onToggleExpand,
}: TreeNodeItemProps) {
	const isSelected = node.id === selectedId
	const hasChildren = Boolean(node.children?.length)
	const isExpanded = expandedIds.has(node.id)

	const handleClick = () => {
		onSelect(node.id)
		if (hasChildren) onToggleExpand(node.id)
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
					isExpanded
						? <ExpandMore style={{ width: 18, height: 18, flexShrink: 0, opacity: 0.7 }} />
						: <ChevronRight style={{ width: 18, height: 18, flexShrink: 0, opacity: 0.7 }} />
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

const API_VERSIONS = ['auto', 'v4', 'v5']

function makeField(
	label: string,
	value: string | number | undefined,
	onChange: (v: string) => void,
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
					<MenuItem key={o} value={o}>{o}</MenuItem>
				))}
			</Select>
		</FormControl>
	)
}

interface DetailFormProps {
	config: any
	node: TreeNode
	onChange: (newConfig: any) => void
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

function ConnectionsGroupForm({ config, onChange }: { config: any; onChange: (c: any) => void }) {
	const [newName, setNewName] = React.useState('')

	const handleAdd = () => {
		const name = newName.trim()
		if (!name || config.connections?.[name]) return
		const updated = {
			...config,
			connections: {
				...config.connections,
				[name]: { address: 'localhost:4455', apiVersion: 'auto' },
			},
		}
		onChange(updated)
		setNewName('')
	}

	return (
		<DetailSection>
			<DetailTitle variant="subtitle2">Connections</DetailTitle>
			<Divider />
			<Typography variant="body2" color="textSecondary">
				Select a connection to edit its address and API version.
			</Typography>
			<ActionRow>
				<TextField
					label="New connection name"
					value={newName}
					onChange={(e) => setNewName(e.target.value)}
					onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
					variant="outlined"
					size="small"
				/>
				<Button variant="outlined" size="small" startIcon={<Add />} onClick={handleAdd} disabled={!newName.trim()}>
					Add
				</Button>
			</ActionRow>
		</DetailSection>
	)
}

function DeleteConnectionButton({ config, node, onChange }: DetailFormProps) {
	const connectionName = node.label
	const canDelete = Object.keys(config.connections || {}).length > 1

	const handleDelete = () => {
		if (!canDelete) return
		if (!window.confirm(`Delete connection "${connectionName}"?`)) return
		const connections = { ...config.connections }
		delete connections[connectionName]
		onChange({ ...config, connections })
	}

	return (
		<DetailSection style={{ paddingTop: 0 }}>
			<Button
				variant="outlined"
				size="small"
				startIcon={<Delete />}
				onClick={handleDelete}
				disabled={!canDelete}
				style={{ alignSelf: 'flex-start', color: canDelete ? '#f44336' : undefined, borderColor: canDelete ? '#f44336' : undefined }}
			>
				Delete connection
			</Button>
		</DetailSection>
	)
}

function renderDetailForm(config: any, node: TreeNode | null, onChange: (c: any) => void): React.ReactNode {
	if (!node) {
		return (
			<DetailSection>
				<Typography variant="body2" color="textSecondary">
					Select an item in the tree to edit its properties.
				</Typography>
			</DetailSection>
		)
	}
	if (node.type === 'connections-group') {
		return <ConnectionsGroupForm config={config} onChange={onChange} />
	}
	if (node.type === 'connection') {
		return (
			<>
				<ConnectionForm config={config} node={node} onChange={onChange} />
				<DeleteConnectionButton config={config} node={node} onChange={onChange} />
			</>
		)
	}
	return null
}

// ---------------------------------------------------------------------------
// Flat node lookup
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

	const [selectedId, setSelectedId] = React.useState<string | null>('connections')
	const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
		() => new Set(['connections']),
	)

	// Resizable tree panel
	const [treeWidth, setTreeWidth] = React.useState(220)
	const isDragging = React.useRef(false)
	const dragStartX = React.useRef(0)
	const dragStartWidth = React.useRef(220)

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
			setTreeWidth(Math.max(120, Math.min(400, dragStartWidth.current + delta)))
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

