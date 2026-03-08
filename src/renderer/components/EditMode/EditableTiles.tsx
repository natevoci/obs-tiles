/**
 * EditableTiles – renders the tile tree in inline edit mode.
 *
 * Tiles are non-functional (pointer-events disabled on content).
 * Each tile shows a hover menu for Properties / Add / Cut / Paste / Delete / Tile Size.
 * Tiles can be dragged to reorder within or across groups.
 */
import React from 'react'
import styled, { css } from 'styled-components'
import {
	Menu,
	MenuItem,
	IconButton,
	Slider,
	Typography,
	ListItemIcon,
	Divider as MuiDivider,
} from '@material-ui/core'
import {
	MoreVert,
	AddCircleOutline,
	Delete,
	DragIndicator,
	SettingsApplications as SettingsIcon,
	FileCopy,
	CallSplit,
} from '@material-ui/icons'

import { useSettings } from '../Settings/SettingsContext'
import { useEditMode } from './EditModeContext'
import { TilePropertiesDialog, AddTileDialog } from './TilePropertiesDialog'

type MenuPosition = { top: number; left: number }

// Renders actual tile components (non-functional)
import { SceneButton } from '../tiles/SceneButton'
import { SceneItemButton } from '../tiles/SceneItemButton'
import { Button as ButtonTile } from '../tiles/Button'
import { Text as TextTile } from '../tiles/Text'
import { AudioInputTile } from '../tiles/AudioInputTile'

// ============================================================================
// Tile tree mutation helpers
// ============================================================================

/** Get the tile at the given index path from rootTiles */
function getTileAt(rootTiles: any[], path: number[]): any {
	if (path.length === 0) throw new Error('empty path')
	if (path.length === 1) return rootTiles[path[0]]
	return getTileAt(rootTiles[path[0]].tiles, path.slice(1))
}

/** Return a new rootTiles with the tile at path removed */
function removeTileAt(rootTiles: any[], path: number[]): any[] {
	if (path.length === 1) return rootTiles.filter((_, i) => i !== path[0])
	return rootTiles.map((t, i) => {
		if (i !== path[0]) return t
		return { ...t, tiles: removeTileAt(t.tiles, path.slice(1)) }
	})
}

/**
 * Insert a tile into the tiles array at `containerPath` before `insertIndex`.
 * containerPath = [] means the root tiles array.
 * containerPath = [i] means rootTiles[i].tiles
 */
function insertTileAt(rootTiles: any[], containerPath: number[], insertIndex: number, tile: any): any[] {
	if (containerPath.length === 0) {
		const result = [...rootTiles]
		result.splice(insertIndex, 0, tile)
		return result
	}
	return rootTiles.map((t, i) => {
		if (i !== containerPath[0]) return t
		return { ...t, tiles: insertTileAt(t.tiles ?? [], containerPath.slice(1), insertIndex, tile) }
	})
}

/** Replace the tile at path */
function replaceTileAt(rootTiles: any[], path: number[], newTile: any): any[] {
	if (path.length === 1) {
		return rootTiles.map((t, i) => (i === path[0] ? newTile : t))
	}
	return rootTiles.map((t, i) => {
		if (i !== path[0]) return t
		return { ...t, tiles: replaceTileAt(t.tiles, path.slice(1), newTile) }
	})
}

// ============================================================================
// Internal DnD context
// ============================================================================

interface DropTarget {
	containerPath: number[]
	insertAt: number
}

interface DndContextValue {
	dragPath: number[] | null
	dropTarget: DropTarget | null
	startDrag: (path: number[]) => void
	endDrag: () => void
	setDropTarget: (t: DropTarget | null) => void
	commitDrop: (t: DropTarget) => void
}

const DndCtx = React.createContext<DndContextValue>({
	dragPath: null,
	dropTarget: null,
	startDrag: () => {},
	endDrag: () => {},
	setDropTarget: () => {},
	commitDrop: () => {},
})

// ============================================================================
// Styled components
// ============================================================================

const EditRoot = styled.div`
	padding: 8px;
`

interface DragWrapperProps {
	$isDragging?: boolean
}

const DragWrapper = styled.div<DragWrapperProps>`
	position: relative;
	display: inline-block;
	opacity: ${(p) => (p.$isDragging ? 0.4 : 1)};
	transition: opacity 0.15s;
`

const TileContent = styled.div`
	pointer-events: none;
	user-select: none;
`

interface HoverOverlayProps {
	$visible?: boolean
}

const HoverOverlay = styled.div<HoverOverlayProps>`
	position: absolute;
	inset: 0;
	z-index: 20;
	display: flex;
	align-items: flex-start;
	justify-content: flex-end;
	cursor: grab;
	opacity: ${(p) => (p.$visible ? 1 : 0)};
	background: ${(p) => (p.$visible ? 'rgba(0,0,0,0.18)' : 'transparent')};
	border-radius: 4px;
	transition: opacity 0.12s, background 0.12s;
	&:active { cursor: grabbing; }
`

const MenuButtonContainer = styled.div`
	pointer-events: all;
`

interface DropZoneProps {
	$active?: boolean
	$horizontal?: boolean
}

const DropZoneDiv = styled.div<DropZoneProps>`
	flex-shrink: 0;
	transition: background 0.1s, flex-basis 0.1s;
	border-radius: 3px;
	${(p) =>
		p.$horizontal
			? css`
					height: 100%;
					width: ${p.$active ? '16px' : '4px'};
					background: ${p.$active ? (p.theme as any).primary || '#538c61' : 'transparent'};
			  `
			: css`
					width: 100%;
					height: ${p.$active ? '16px' : '4px'};
					background: ${p.$active ? (p.theme as any).primary || '#538c61' : 'transparent'};
			  `}
`

const GroupEditWrapper = styled.div`
	display: flex;
	flex-direction: column;
	border: 2px dashed ${(p: any) => p.theme.border || '#888'};
	border-radius: 6px;
	padding: 4px;
	background: ${(p: any) => p.theme.groupBackground || '#303030'};
`

const GroupHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 4px;
	cursor: grab;
	user-select: none;
	&:active { cursor: grabbing; }
	& h3 {
		margin: 4px 0;
		font-size: 13px;
	}
`

const GroupHeaderActions = styled.div`
	display: flex;
	align-items: center;
	pointer-events: all;
`

interface TilesGroupRowProps {
	$direction?: string
	$wrap?: boolean
}

const TilesGroupRow = styled.div<TilesGroupRowProps>`
	display: flex;
	flex-direction: ${(p) => (p.$direction === 'column' ? 'column' : 'row')};
	flex-wrap: ${(p) => (p.$wrap === false ? 'nowrap' : 'wrap')};
	align-items: flex-start;
	gap: 4px;
	padding: 4px;
`

const SliderMenuItem = styled.div`
	padding: 4px 16px 4px 16px;
	min-width: 180px;
`

// ============================================================================
// DropZone
// ============================================================================

interface DropZoneComponentProps {
	containerPath: number[]
	insertAt: number
	horizontal?: boolean
}

const DropZone = ({ containerPath, insertAt, horizontal }: DropZoneComponentProps) => {
	const { dragPath, dropTarget, setDropTarget, commitDrop } = React.useContext(DndCtx)
	if (!dragPath) return null

	const isActive =
		dropTarget !== null &&
		dropTarget.containerPath.join(',') === containerPath.join(',') &&
		dropTarget.insertAt === insertAt

	return (
		<DropZoneDiv
			$active={isActive}
			$horizontal={horizontal}
			onDragOver={(e) => {
				e.preventDefault()
				e.stopPropagation()
				e.dataTransfer.dropEffect = 'move'
				setDropTarget({ containerPath, insertAt })
			}}
			onDragLeave={() => {
				if (isActive) setDropTarget(null)
			}}
			onDrop={(e) => {
				e.preventDefault()
				e.stopPropagation()
				commitDrop({ containerPath, insertAt })
			}}
		/>
	)
}

// ============================================================================
// Tile menu (shared between leaf and group tiles)
// ============================================================================

interface TileMenuProps {
	anchorPosition: MenuPosition | null
	tilePath: number[]
	tile: any
	isGroup?: boolean
	onClose: () => void
	onOpenProperties: () => void
	onOpenAdd: () => void
}

const TileMenu = ({
	anchorPosition,
	tilePath,
	tile,
	isGroup,
	onClose,
	onOpenProperties,
	onOpenAdd,
}: TileMenuProps) => {
	const { settings, updateCurrentConfig } = useSettings()
	const { clipboard, setClipboard } = useEditMode()

	const handleCut = () => {
		setClipboard(tile)
		updateCurrentConfig((config) => ({
			...config,
			tiles: removeTileAt(config.tiles, tilePath),
		}))
		onClose()
	}

	const handlePaste = () => {
		if (!clipboard) return
		const insertPath = tilePath.slice(0, -1)
		const insertAt = tilePath[tilePath.length - 1] + 1
		updateCurrentConfig((config) => ({
			...config,
			tiles: insertTileAt(config.tiles, insertPath, insertAt, clipboard),
		}))
		setClipboard(null)
		onClose()
	}

	const handlePasteInto = () => {
		if (!clipboard) return
		updateCurrentConfig((config) => {
			const group = getTileAt(config.tiles, tilePath)
			const updatedGroup = { ...group, tiles: [...(group.tiles || []), clipboard] }
			return { ...config, tiles: replaceTileAt(config.tiles, tilePath, updatedGroup) }
		})
		setClipboard(null)
		onClose()
	}

	const handleDelete = () => {
		updateCurrentConfig((config) => ({
			...config,
			tiles: removeTileAt(config.tiles, tilePath),
		}))
		onClose()
	}

	const currentSize = Number(tile.tileSize || settings.tileSize || 10)

	const handleSizeChange = (_: any, value: number | number[]) => {
		const size = Array.isArray(value) ? value[0] : value
		updateCurrentConfig((config) => ({
			...config,
			tiles: replaceTileAt(config.tiles, tilePath, {
				...tile,
				tileSize: String(size),
			}),
		}))
	}

	return (
		<Menu
			anchorReference="anchorPosition"
			anchorPosition={anchorPosition ?? undefined}
			open={Boolean(anchorPosition)}
			onClose={onClose}
			keepMounted
		>
			<MenuItem onClick={() => { onOpenProperties(); onClose() }}>
				<ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
				Properties
			</MenuItem>
			{isGroup && (
				<MenuItem onClick={() => { onOpenAdd(); onClose() }}>
					<ListItemIcon><AddCircleOutline fontSize="small" /></ListItemIcon>
					Add…
				</MenuItem>
			)}
			{isGroup && clipboard && (
				<MenuItem onClick={handlePasteInto}>
					<ListItemIcon><FileCopy fontSize="small" /></ListItemIcon>
					Paste into group
				</MenuItem>
			)}
			<MuiDivider />
			<MenuItem onClick={handleCut}>
				<ListItemIcon><CallSplit fontSize="small" /></ListItemIcon>
				Cut
			</MenuItem>
			<MenuItem onClick={handlePaste} disabled={!clipboard}>
				<ListItemIcon><FileCopy fontSize="small" /></ListItemIcon>
				Paste after
			</MenuItem>
			<MenuItem onClick={handleDelete}>
				<ListItemIcon><Delete fontSize="small" /></ListItemIcon>
				Delete
			</MenuItem>
			<MuiDivider />
			<SliderMenuItem onClick={(e) => e.stopPropagation()}>
				<Typography variant="caption" display="block" gutterBottom>
					Tile Size: {currentSize}
				</Typography>
				<Slider
					value={currentSize}
					min={4}
					max={30}
					step={1}
					onChange={handleSizeChange}
					style={{ width: '100%' }}
				/>
			</SliderMenuItem>
		</Menu>
	)
}

// ============================================================================
// Individual leaf tile renderer (non-functional visual)
// ============================================================================

interface EditableLeafProps {
	tile: any
	tilePath: number[]
	inheritedConnection?: string
	inheritedTileSize?: string | number
}

const EditableLeafTile = ({
	tile,
	tilePath,
	inheritedConnection,
	inheritedTileSize,
}: EditableLeafProps) => {
	const { dragPath, startDrag, endDrag } = React.useContext(DndCtx)
	const [hovered, setHovered] = React.useState(false)
	const [menuAnchor, setMenuAnchor] = React.useState<MenuPosition | null>(null)
	const [propsOpen, setPropsOpen] = React.useState(false)
	const { updateCurrentConfig } = useSettings()

	const isDragging = dragPath?.join(',') === tilePath.join(',')
	const effectiveConnection = tile.connection ?? inheritedConnection
	const effectiveTileSize = tile.tileSize ?? inheritedTileSize

	const renderContent = () => {
		const common = {
			connection: effectiveConnection,
			tileSize: String(effectiveTileSize ?? 10),
		}
		if ('scene' in tile) return <SceneButton {...common} scene={tile.scene} title={tile.title} />
		if ('sceneItem' in tile) return <SceneItemButton {...common} sceneItem={tile.sceneItem} title={tile.title} />
		if ('button' in tile) return <ButtonTile {...common} button={tile.button} title={tile.title} />
		if ('text' in tile) return <TextTile {...common} text={tile.text} />
		if ('audioInput' in tile) return <AudioInputTile {...common} audioInput={tile.audioInput} title={tile.title} />
		return null
	}

	return (
		<>
			<DragWrapper
				$isDragging={isDragging}
				draggable
				onDragStart={(e) => {
					e.stopPropagation()
					e.dataTransfer.effectAllowed = 'move'
					startDrag(tilePath)
				}}
				onDragEnd={endDrag}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
			>
				<TileContent>{renderContent()}</TileContent>
				<HoverOverlay $visible={hovered} onDragStart={(e) => e.stopPropagation()}>
					<MenuButtonContainer>
						<IconButton
							size="small"
							style={{ color: 'white', background: 'rgba(0,0,0,0.5)', margin: 2 }}
							draggable={false}
							onDragStart={(e) => e.preventDefault()}
						onClick={(e) => {
							e.stopPropagation()
							const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
							setMenuAnchor({ top: rect.bottom, left: rect.left })
						}}
						>
							<MoreVert fontSize="small" />
						</IconButton>
					</MenuButtonContainer>
				</HoverOverlay>
			</DragWrapper>

			<TileMenu
				anchorPosition={menuAnchor}
				tile={tile}
				tilePath={tilePath}
				onClose={() => setMenuAnchor(null)}
				onOpenProperties={() => setPropsOpen(true)}
				onOpenAdd={() => {}}
			/>

			<TilePropertiesDialog
				open={propsOpen}
				tile={tile}
				connection={effectiveConnection}
				onSave={(updated) => {
					updateCurrentConfig((config) => ({
						...config,
						tiles: replaceTileAt(config.tiles, tilePath, updated),
					}))
					setPropsOpen(false)
				}}
				onClose={() => setPropsOpen(false)}
			/>
		</>
	)
}

// ============================================================================
// Group tile
// ============================================================================

interface EditableGroupTileProps {
	tile: any
	tilePath: number[]
	inheritedConnection?: string
	inheritedTileSize?: string | number
}

const EditableGroupTile = ({
	tile,
	tilePath,
	inheritedConnection,
	inheritedTileSize,
}: EditableGroupTileProps) => {
	const { dragPath, startDrag, endDrag } = React.useContext(DndCtx)
	const [menuAnchor, setMenuAnchor] = React.useState<MenuPosition | null>(null)
	const [propsOpen, setPropsOpen] = React.useState(false)
	const [addOpen, setAddOpen] = React.useState(false)
	const { updateCurrentConfig } = useSettings()

	const isDragging = dragPath?.join(',') === tilePath.join(',')
	const effectiveConnection = tile.connection ?? inheritedConnection
	const effectiveTileSize = tile.tileSize ?? inheritedTileSize

	return (
		<>
			<GroupEditWrapper
			onMouseEnter={() => {}}
			onMouseLeave={() => {}}
				style={{ opacity: isDragging ? 0.4 : 1 }}
			>
				<GroupHeader
					draggable
					onDragStart={(e) => {
						e.stopPropagation()
						e.dataTransfer.effectAllowed = 'move'
						startDrag(tilePath)
					}}
					onDragEnd={endDrag}
				>
					<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
						<DragIndicator style={{ opacity: 0.5, fontSize: 18 }} />
						<h3>{tile.group || '(group)'}</h3>
					</div>
					<GroupHeaderActions>
						<IconButton
							size="small"
							draggable={false}
							onDragStart={(e) => e.preventDefault()}
							onClick={(e) => {
								e.stopPropagation()
								const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
								setMenuAnchor({ top: rect.bottom, left: rect.left })
							}}
						>
							<MoreVert fontSize="small" />
						</IconButton>
					</GroupHeaderActions>
				</GroupHeader>

				<EditableGroup
					tiles={tile.tiles ?? []}
					containerPath={tilePath}
					inheritedConnection={effectiveConnection}
					inheritedTileSize={effectiveTileSize}
					direction={tile.direction}
					wrap={tile.wrap}
				/>
			</GroupEditWrapper>

			<TileMenu
				anchorPosition={menuAnchor}
				tile={tile}
				tilePath={tilePath}
				isGroup
				onClose={() => setMenuAnchor(null)}
				onOpenProperties={() => setPropsOpen(true)}
				onOpenAdd={() => setAddOpen(true)}
			/>

			<TilePropertiesDialog
				open={propsOpen}
				tile={tile}
				connection={effectiveConnection}
				onSave={(updated) => {
					updateCurrentConfig((config) => ({
						...config,
						tiles: replaceTileAt(config.tiles, tilePath, { ...updated, tiles: tile.tiles }),
					}))
					setPropsOpen(false)
				}}
				onClose={() => setPropsOpen(false)}
			/>

			<AddTileDialog
				open={addOpen}
				connection={effectiveConnection}
				onAdd={(newTile) => {
					updateCurrentConfig((config) => {
						const group = getTileAt(config.tiles, tilePath)
						const updated = { ...group, tiles: [...(group.tiles || []), newTile] }
						return { ...config, tiles: replaceTileAt(config.tiles, tilePath, updated) }
					})
				}}
				onClose={() => setAddOpen(false)}
			/>
		</>
	)
}

// ============================================================================
// Group renderer (renders the tiles[] of a container with drop zones)
// ============================================================================

interface EditableGroupProps {
	tiles: any[]
	/** Path to the parent tile that owns this tiles array.
	 *  [] means the root-level tiles array. */
	containerPath: number[]
	inheritedConnection?: string
	inheritedTileSize?: string | number
	direction?: string
	wrap?: boolean
}

const EditableGroup = ({
	tiles,
	containerPath,
	inheritedConnection,
	inheritedTileSize,
	direction,
	wrap,
}: EditableGroupProps) => {
	const { dragPath } = React.useContext(DndCtx)
	const isHorizontal = direction !== 'column'

	return (
		<TilesGroupRow $direction={direction} $wrap={wrap}>
			{dragPath && (
				<DropZone containerPath={containerPath} insertAt={0} horizontal={isHorizontal} />
			)}
			{tiles.map((tile, i) => (
				<React.Fragment key={i}>
					{tile && 'tiles' in tile ? (
						<EditableGroupTile
							tile={tile}
							tilePath={[...containerPath, i]}
							inheritedConnection={inheritedConnection}
							inheritedTileSize={inheritedTileSize}
						/>
					) : (
						<EditableLeafTile
							tile={tile}
							tilePath={[...containerPath, i]}
							inheritedConnection={inheritedConnection}
							inheritedTileSize={inheritedTileSize}
						/>
					)}
					{dragPath && (
						<DropZone containerPath={containerPath} insertAt={i + 1} horizontal={isHorizontal} />
					)}
				</React.Fragment>
			))}
		</TilesGroupRow>
	)
}

// ============================================================================
// Top-level exported component
// ============================================================================

export const EditableTiles = () => {
	const { settings, updateCurrentConfig } = useSettings()
	const [dragPath, setDragPath] = React.useState<number[] | null>(null)
	const [dropTarget, setDropTarget] = React.useState<DropTarget | null>(null)

	const startDrag = React.useCallback((path: number[]) => {
		setDragPath(path)
	}, [])

	const endDrag = React.useCallback(() => {
		setDragPath(null)
		setDropTarget(null)
	}, [])

	const commitDrop = React.useCallback(
		(target: DropTarget) => {
			if (!dragPath) return
			const src = dragPath
			const { containerPath, insertAt } = target

			updateCurrentConfig((config) => {
				const tile = getTileAt(config.tiles, src)
				let newTiles = removeTileAt(config.tiles, src)

				// Adjust insertAt when moving within same container and src comes before target
				let adjustedInsert = insertAt
				const srcContainer = src.slice(0, -1)
				const srcIndex = src[src.length - 1]
				if (
					srcContainer.join(',') === containerPath.join(',') &&
					srcIndex < adjustedInsert
				) {
					adjustedInsert--
				}

				newTiles = insertTileAt(newTiles, containerPath, adjustedInsert, tile)
				return { ...config, tiles: newTiles }
			})

			setDragPath(null)
			setDropTarget(null)
		},
		[dragPath, updateCurrentConfig],
	)

	// Global dragend fallback — clear drag state if mouse released outside a drop zone
	React.useEffect(() => {
		const onDragEnd = () => {
			setDragPath(null)
			setDropTarget(null)
		}
		window.addEventListener('dragend', onDragEnd)
		return () => window.removeEventListener('dragend', onDragEnd)
	}, [])

	const dndValue = React.useMemo(
		() => ({ dragPath, dropTarget, startDrag, endDrag, setDropTarget, commitDrop }),
		[dragPath, dropTarget, startDrag, endDrag, commitDrop],
	)

	return (
		<DndCtx.Provider value={dndValue}>
			<EditRoot>
				<EditableGroup
					tiles={settings.tiles ?? []}
					containerPath={[]}
					inheritedConnection={settings.connection}
					inheritedTileSize={settings.tileSize}
					direction={settings.direction}
					wrap={(settings as any).wrap}
				/>
			</EditRoot>
		</DndCtx.Provider>
	)
}
