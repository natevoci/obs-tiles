import React from 'react';
import styled, { css } from 'styled-components';

import { Button } from './Button';
import { SceneButton } from './SceneButton';

const validDirections = {
	column: 'column',
	row: 'row',
};

const TilesGroupWrapper = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	border: 1px solid ${p => p.theme.border};
	background-color: ${p => p.theme.navBackground};

	& h3 {
		margin-top: ${p => p.theme.grid(1)};
	}
`;

const TilesGroup = styled.div`
	display: flex;
	flex-direction: ${p => validDirections[p.$direction] || 'row'};
	flex-wrap: wrap;
`;

const TileWrapper = styled.div`
	position: relative;
	margin: ${p => p.theme.grid(0.5)};

	&:not(:last-child) {
		${p => p.$direction === 'column' ? css`
		margin-bottom: 0;
		` : p.$direction === 'row' ? css`
		margin-right: 0;
		` : ''}
	}
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
