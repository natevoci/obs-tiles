import styled from 'styled-components'

import { AudioInputTile } from './AudioInputTile'
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


// Base config for all tiles
interface BaseTileConfig {
	title?: string;
	connection?: string;
	tileSize?: string | number;
}

// Specific tile configs
export interface GroupTileConfig extends BaseTileConfig {
	group: string;
	tiles: TileConfig[];
	direction?: string;
	wrap?: boolean;
}

export interface SceneButtonTileConfig extends BaseTileConfig {
	scene: string;
}

export interface SceneItemButtonTileConfig extends BaseTileConfig {
	sceneItem: {
		scene: string
		item: string
		click?: string
		longPress?: string
	}
}

export interface ButtonTileConfig extends BaseTileConfig {
	button: string;
}

export interface TextTileConfig extends BaseTileConfig {
	text: string;
}

export interface AudioInputTileConfig extends BaseTileConfig {
	audioInput: {
		inputName: string
		maxVolume?: number
	}
}

type TileConfig =
	| GroupTileConfig
	| SceneButtonTileConfig
	| SceneItemButtonTileConfig
	| ButtonTileConfig
	| TextTileConfig
	| AudioInputTileConfig;


// Common props for all tile types
const COMMON_TILE_PROPS = ['title', 'connection', 'tileSize'];

function warnExtraProps(tile: any, allowed: string[], typeName: string) {
	if (typeof tile !== 'object' || tile == null) return;
	const extras = Object.keys(tile).filter(
		key => !allowed.includes(key)
	);
	if (extras.length > 0) {
		console.warn(
			`[Tiles] Extra properties in ${typeName}:`,
			extras,
			'\nTile:', tile
		);
	}
}

function isGroupTileConfig(tile: TileConfig): tile is GroupTileConfig {
	const valid =
		typeof tile === 'object' &&
		'tiles' in tile &&
		Array.isArray((tile as any).tiles);
	if (valid) {
		warnExtraProps(tile, ['group', 'tiles', 'direction', 'wrap', ...COMMON_TILE_PROPS], 'GroupTileConfig');
	}
	return valid;
}

function isSceneButtonTileConfig(tile: TileConfig): tile is SceneButtonTileConfig {
	const valid =
		typeof tile === 'object' &&
		'scene' in tile &&
		typeof (tile as any).scene === 'string' &&
		!('sceneItem' in tile);
	if (valid) {
		warnExtraProps(tile, ['scene', ...COMMON_TILE_PROPS], 'SceneButtonTileConfig');
	}
	return valid;
}

function isSceneItemButtonTileConfig(tile: TileConfig): tile is SceneItemButtonTileConfig {
	const valid =
		typeof tile === 'object' &&
		'sceneItem' in tile &&
		typeof (tile as any).sceneItem === 'object' &&
		(tile as any).sceneItem !== null;
	if (valid) {
		warnExtraProps(tile, ['sceneItem', ...COMMON_TILE_PROPS], 'SceneItemButtonTileConfig');
	}
	return valid;
}

function isButtonTileConfig(tile: TileConfig): tile is ButtonTileConfig {
	const valid =
		typeof tile === 'object' &&
		'button' in tile &&
		typeof (tile as any).button === 'string' &&
		!!(tile as any).button;
	if (valid) {
		warnExtraProps(tile, ['button', ...COMMON_TILE_PROPS], 'ButtonTileConfig');
	}
	return valid;
}

function isTextTileConfig(tile: TileConfig): tile is TextTileConfig {
	const valid =
		typeof tile === 'object' &&
		'text' in tile &&
		typeof (tile as any).text === 'string' &&
		!!(tile as any).text;
	if (valid) {
		warnExtraProps(tile, ['text', ...COMMON_TILE_PROPS], 'TextTileConfig');
	}
	return valid;
}

function isAudioInputTileConfig(tile: TileConfig): tile is AudioInputTileConfig {
	const valid =
		typeof tile === 'object' &&
		'audioInput' in tile &&
		typeof (tile as any).audioInput === 'object' &&
		(tile as any).audioInput !== null &&
		typeof (tile as any).audioInput.inputName === 'string';
	if (valid) {
		warnExtraProps(tile, ['audioInput', ...COMMON_TILE_PROPS], 'AudioInputTileConfig');
	}
	return valid;
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
		if (!tile) return null;

		const inheritableProps = {
			connection,
			tileSize,
		};

		if (isGroupTileConfig(tile)) {
			return (
				<TilesGroupWrapper key={tile.group} data-elementtype='TilesGroupWrapper'>
					<h3>{tile.group}</h3>
					<Tiles {...inheritableProps} {...tile} tiles={tile.tiles} />
				</TilesGroupWrapper>
			);
		}

		if (isSceneButtonTileConfig(tile)) {
			return (
				<SceneButton key={tile.scene} connection={connection} tileSize={String(tileSize)} scene={tile.scene} title={tile.title} />
			);
		}

		if (isSceneItemButtonTileConfig(tile)) {
			return (
				<SceneItemButton key={tile.sceneItem.item ?? JSON.stringify(tile.sceneItem)} connection={connection} tileSize={String(tileSize)} sceneItem={tile.sceneItem} title={tile.title} />
			);
		}

		if (isButtonTileConfig(tile)) {
			return (
				<Button key={tile.button} {...inheritableProps} {...tile} button={tile.button} />
			);
		}

		if (isTextTileConfig(tile)) {
			return (
				<Text key={tile.text} {...inheritableProps} {...tile} text={tile.text} />
			);
		}

		if (isAudioInputTileConfig(tile)) {
			return (
				<AudioInputTile 
					key={tile.audioInput.inputName} 
					connection={connection} 
					tileSize={String(tileSize)} 
					audioInput={tile.audioInput} 
					title={tile.title} 
				/>
			);
		}

		return null;
	});
	
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
