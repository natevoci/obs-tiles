import React from 'react';
import styled from 'styled-components';

import { useSettings } from './Settings/SettingsContext';
import { Tiles } from './tiles/Tiles';
import { Dialog } from '@material-ui/core';

const Main = styled.main`
	padding: ${p => p.theme.grid(1)};
`;

export const Content = () => {
	const {
		configUrl,
		configUrlJSON,
		setConfigUrlJSON,
		setSettingsJSON,
		settings: {
			connections,
			...tileSettings
		},
	} = useSettings();

	const [promptToUpdate, setPromptToUpdate] = React.useState(false);

	React.useEffect(
		() => {
			if (configUrl) {
				fetch(
					configUrl,
					{
						mode: 'cors',
					},
				).then(response => {
					debugger;
					if (response.ok) {
					}
					response.text().then(message => {
						if (json5.parse(message)) {
							if (message !== configUrlJSON) {
								setConfigUrlJSON(message);
								setPromptToUpdate(true);
							}
						}
					});
				});
			}
		},
		[],
	);

	return (
		<Main
			data-elementtype='Main'
		>
			{promptToUpdate ? (
				<Dialog
					open
					onClose={() => setPromptToUpdate(false)}
				>
					<DialogTitle>
						Updated configuration detected
					</DialogTitle>
					<DialogContent>
						<p>The configuration from the source url has changed.</p>
						<p>Update configuration?</p>
					</DialogContent>
					<DialogActions>
						<Button
							onClick={() => {
								setPromptToUpdate(false);
							}}
						>
							Ignore
						</Button>
						<Button
							onClick={() => {
								setPromptToUpdate(false);
								setSettings(configUrlJSON);
							}}
						>
							Update
						</Button>
					</DialogActions>
				</Dialog>
			) : null}
			<Tiles
				tileSize='10'
				direction='row'
				{...tileSettings}
			/>
		</Main>
	);
}