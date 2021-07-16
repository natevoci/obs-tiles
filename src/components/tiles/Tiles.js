import React from 'react';
import styled, { css } from 'styled-components';

import { Button } from './Button';
import { SceneButton } from './SceneButton';
import { Text } from './Text';

const validDirections = {
	column: 'column',
	row: 'row',
};

const TilesGroupWrapper = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	border: 1px solid ${p => p.theme.border};
	background-color: ${p => p.theme.groupBackground};
	padding: 0 ${p => p.theme.grid(0.5)};

	& h3 {
		margin: ${p => p.theme.grid(1)} 0;
	}
`;

const TilesGroup = styled.div`
	display: flex;
	flex-direction: ${p => validDirections[p.$direction] || 'row'};
	flex-wrap: wrap;
	margin-right: ${p => p.theme.grid(-0.5)};
	margin-bottom: ${p => p.theme.grid(-1)};
`;

const TileWrapper = styled.div`
	position: relative;
	margin: 0;
	margin-right: ${p => p.theme.grid(0.5)};
	margin-bottom: ${p => p.theme.grid(1)};
`;

export const Tiles = ({
	tiles,
	connection,
	tileSize,
	direction,
}) => {
	const tileComponents = tiles.map((tile) => {
		if (!tile) {
			return null;
		}

		const inheritableProps = {
			connection,
			tileSize,
			direction,
		};

		if (tile.group) {
			return (
				<TilesGroupWrapper
					data-elementtype='TilesGroupWrapper'
				>
					<h3>{tile.group}</h3>
					<Tiles {...inheritableProps} {...tile} />
				</TilesGroupWrapper>
			);
		}

		if (tile.tiles) {
			return <Tiles {...inheritableProps} {...tile} />;
		}

		if (tile.button) {
			return (
				<Button {...inheritableProps} {...tile} />
			);
		}

		if (tile.scene) {
			return (
				<SceneButton {...inheritableProps} {...tile} />
			);
		}

		if (tile.text) {
			return (
				<Text {...inheritableProps} {...tile} />
			)
		}

		return null;
	});
	
	return (
		<TilesGroup
			$direction={direction}
			data-elementtype='TilesGroup'
		>
			{tileComponents.map(
				(tile, index) => (
					<TileWrapper
						key={index}
						data-elementtype='TileWrapper'
						$direction={direction}
					>
						{tile}
					</TileWrapper>
				)
			)}
		</TilesGroup>
	);
}
