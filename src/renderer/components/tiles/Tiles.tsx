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

interface TilesGroupWrapperProps {
	$backgroundColor?: string
}

const TilesGroupWrapper = styled.div<TilesGroupWrapperProps>`
	display: flex;
	flex-direction: column;
	align-items: center;
	border: 1px solid ${(p: any) => p.theme.border};
	border-radius: ${(p: any) => p.theme.grid(0.5)};
	background-color: ${(p: any) => p.$backgroundColor || p.theme.groupBackground};
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
	backgroundColor?: string;
}

export interface SceneButtonTileConfig extends BaseTileConfig {
	scene: string;
	/** Display mode: 'preview' (default tile) or 'checkbox' (compact checkbox row) */
	viewType?: 'preview' | 'checkbox';
}

export interface SceneItemButtonTileConfig extends BaseTileConfig {
	sceneItem: {
		scene: string
		item: string
		click?: string
		longPress?: string
	}
	/** Display mode: 'preview' (default tile) or 'checkbox' (compact checkbox row) */
	viewType?: 'preview' | 'checkbox';
}

export interface ButtonTileConfig extends BaseTileConfig {
	button: string;
}

export interface TextTileConfig extends BaseTileConfig {
	text: string;
	/**
	 * For text='stats': which stat lines to display.
	 * All lines are shown by default when this property is omitted.
	 * Set a key to false to hide that line.
	 */
	statsLines?: {
		fps?: boolean
		cpu?: boolean
		memory?: boolean
		freeDisk?: boolean
		skippedFrames?: boolean
	}
	/** Optional custom text rendered below the main tile content. */
	customText?: string
}

export interface AudioInputTileConfig extends BaseTileConfig {
	audioInput: {
		inputName: string
		maxVolume?: number
	}
	/** Display mode: 'preview' (default tile) or 'checkbox' (compact checkbox row) */
	viewType?: 'preview' | 'checkbox';
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
		warnExtraProps(tile, ['group', 'tiles', 'direction', 'wrap', 'backgroundColor', ...COMMON_TILE_PROPS], 'GroupTileConfig');
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
		warnExtraProps(tile, ['scene', 'viewType', ...COMMON_TILE_PROPS], 'SceneButtonTileConfig');
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
		warnExtraProps(tile, ['sceneItem', 'viewType', ...COMMON_TILE_PROPS], 'SceneItemButtonTileConfig');
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
		warnExtraProps(tile, ['text', 'statsLines', 'customText', ...COMMON_TILE_PROPS], 'TextTileConfig');
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
		warnExtraProps(tile, ['audioInput', 'viewType', ...COMMON_TILE_PROPS], 'AudioInputTileConfig');
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
			console.log('Rendering group tile:', tile.group, " with background color:", tile);
			return (
				<TilesGroupWrapper key={tile.group} data-elementtype='TilesGroupWrapper' $backgroundColor={tile.backgroundColor}>
					<h3>{tile.group}</h3>
					<Tiles {...inheritableProps} {...tile} tiles={tile.tiles} />
				</TilesGroupWrapper>
			);
		}

		if (isSceneButtonTileConfig(tile)) {
			return (
				<SceneButton
					key={tile.scene}
					{...inheritableProps}
					connection={connection}
					{...tile}
				/>
			);
		}

		if (isSceneItemButtonTileConfig(tile)) {
			return (
				<SceneItemButton
					key={tile.sceneItem.item ?? JSON.stringify(tile.sceneItem)}
					{...inheritableProps}
					connection={connection}
					{...tile}
				/>
			);
		}

		if (isButtonTileConfig(tile)) {
			return (
				<Button
					key={tile.button}
					{...inheritableProps}
					{...tile}
				/>
			);
		}

		if (isTextTileConfig(tile)) {
			return (
				<Text
					key={tile.text}
					{...inheritableProps}
					{...tile}
				/>
			);
		}

		if (isAudioInputTileConfig(tile)) {
			return (
				<AudioInputTile 
					key={tile.audioInput.inputName} 
					{...inheritableProps}
					{...tile}
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
