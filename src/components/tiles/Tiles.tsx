import styled from 'styled-components'

import { Button } from './Button'
import { SceneButton } from './SceneButton'
import { SceneItemButton } from './SceneItemButton'
import { Text } from './Text'

const validDirections: Record<string, 'column' | 'row'> = {
	column: 'column',
	row: 'row',
}

const TilesGroupWrapper = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	border: 1px solid ${(p: any) => p.theme.border};
	border-radius: ${(p: any) => p.theme.grid(0.5)};
	background-color: ${(p: any) => p.theme.groupBackground};
	padding: 0 ${(p: any) => p.theme.grid(0.5)} ${(p: any) => p.theme.grid(0.5)} ${(p: any) => p.theme.grid(0.5)};

	& h3 {
		margin: ${(p: any) => p.theme.grid(1)} 0;
	}
`

interface TilesGroupProps {
	$direction?: string
	$wrap?: boolean
}

const TilesGroup = styled.div<TilesGroupProps>`
	display: flex;
	flex-direction: ${(p: any) => validDirections[p.$direction || ''] || 'row'};
	flex-wrap: ${(p: any) => p.$wrap === false ? 'nowrap' : 'wrap'};
	margin-right: ${(p: any) => p.theme.grid(-0.5)};
	margin-bottom: ${(p: any) => p.theme.grid(-1)};
`

const TileWrapper = styled.div<TilesGroupProps>`
	position: relative;
	margin: 0;
	margin-right: ${(p: any) => p.theme.grid(0.5)};
	margin-bottom: ${(p: any) => p.theme.grid(1)};
`

interface TileConfig {
	group?: string
	tiles?: TileConfig[]
	button?: string
	scene?: string
	sceneItem?: string
	text?: string
	direction?: string
	wrap?: boolean
	[key: string]: any
}

interface TilesProps {
	tiles?: TileConfig[]
	connection?: string
	tileSize?: string | number
	direction?: string
	wrap?: boolean
	[key: string]: any
}

export const Tiles = ({
	tiles = [],
	connection,
	tileSize,
	direction,
	wrap,
}: TilesProps) => {
	const tileComponents = tiles.map((tile) => {
		if (!tile) {
			return null
		}

		const inheritableProps = {
			connection,
			tileSize,
		}

		if (tile.group) {
			return (
				<TilesGroupWrapper
					key={tile.group}
					data-elementtype='TilesGroupWrapper'
				>
					<h3>{tile.group}</h3>
					<Tiles {...inheritableProps} {...tile} tiles={tile.tiles} />
				</TilesGroupWrapper>
			)
		}

		if (tile.tiles) {
			return (
				<Tiles key={JSON.stringify(tile)} {...inheritableProps} {...tile} tiles={tile.tiles} />
			)
		}

		if (tile.button) {
			return (
				<Button key={tile.button} {...inheritableProps} {...tile} button={tile.button} />
			)
		}

		if (tile.scene) {
			return (
				<SceneButton key={tile.scene} connection={connection} tileSize={String(tileSize)} scene={tile.scene} title={tile.title} />
			)
		}

		if (tile.sceneItem) {
			return (
				<SceneItemButton key={tile.sceneItem} connection={connection} tileSize={String(tileSize)} sceneItem={tile.sceneItem as any} title={tile.title} />
			)
		}

		if (tile.text) {
			return (
				<Text key={tile.text} {...inheritableProps} {...tile} text={tile.text} />
			)
		}

		return null
	})
	
	return (
		<TilesGroup
			$direction={direction}
			$wrap={wrap}
			data-elementtype='TilesGroup'
		>
			{tileComponents.map(
				(tile, index) => (
					<TileWrapper
						key={index}
						data-elementtype='TileWrapper'
						$direction={direction}
						$wrap={wrap}
					>
						{tile}
					</TileWrapper>
				)
			)}
		</TilesGroup>
	)
}
