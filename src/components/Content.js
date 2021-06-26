import React from 'react';
import styled from 'styled-components';

import { useSettings } from './Settings/SettingsContext';
import { Tiles } from './tiles/Tiles';

const Main = styled.main`
	height: calc(100% - ${p => p.theme.grid(8)});
	margin-top: ${p => p.theme.grid(8)};
	padding: ${p => p.theme.grid(2)};
	overflow: auto;
`;

export const Content = () => {
	const {settings: {
		connections,
		...settings
	}} = useSettings();

	return (
		<Main
			data-elementtype='Main'
		>
			<Tiles
				tileSize='10'
				direction='row'
				{...settings}
			/>
		</Main>
	);
}