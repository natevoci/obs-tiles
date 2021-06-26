import React from 'react';
import styled, { css } from 'styled-components';
import { Button } from '@material-ui/core';

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

const StyledButton = styled(Button)`
	width: ${p => p.$size*16}px;
`;

const TileWrapper = styled.div`
	/* display: flex; */
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
	connectionName,
	direction = 'row',
}) => {

	const tileComponents = tiles.map((tile) => {
		if (!tile) {
			return null;
		}

		if (tile.connection) {
			connectionName = tile.connection;
		}

		if (tile.group) {
			return (
				<TilesGroupWrapper
					data-elementtype='TilesGroupWrapper'
				>
					<h3>{tile.group}</h3>
					<Tiles
						{...tile}
						connectionName={connectionName}
					/>
				</TilesGroupWrapper>
			);
		}

		if (tile.button) {
			return (
				<StyledButton
					$size={10}
					variant='contained'
				>
					{tile.label || tile.button}
				</StyledButton>
			);
		}

		if (tile.scene) {
			return (
				<SceneButton tile={tile} connectionName={connectionName} />
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
