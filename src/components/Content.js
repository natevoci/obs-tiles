import React from 'react';
import styled from 'styled-components';

import { useSettings } from './Settings/SettingsContext';
import { Tiles } from './tiles/Tiles';

const Main = styled.main`
	padding: ${p => p.theme.grid(1)};
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