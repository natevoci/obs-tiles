import React from 'react';
import { IconButton } from '@material-ui/core';
import SettingsIcon from '@material-ui/icons/Settings';

import { SettingsDialog } from './SettingsDialog';

export const SettingsButton = () => {
	const [settingsVisible, setSettingsVisible] = React.useState(false);

	return (
		<>
			<IconButton
				aria-label="settings"
				color='inherit'
				onClick={() => {
					setSettingsVisible(true);
				}}
			>
				<SettingsIcon />
			</IconButton>

			{settingsVisible ? (
				<SettingsDialog
					onClose={() => setSettingsVisible(false)}
				/>
			) : null}
		</>
	)
};
