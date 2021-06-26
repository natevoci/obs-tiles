import React from 'react';
import styled from 'styled-components';
import { IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@material-ui/core';
import SettingsIcon from '@material-ui/icons/Settings';

import { useSettings } from './SettingsContext';

const StyledTextField = styled(TextField)`
	& textarea {
		font-family: monospace;
	}
`;

export const SettingsDialog = () => {
	const [settingsVisible, setSettingsVisible] = React.useState(false);
	const {settings, setSettings} = useSettings();
	const [value, setValue] = React.useState('');

	const handleChange = React.useCallback(
		(event) => {
			setValue(event.target.value);
		},
		[],
	);

	return (
		<>
			<IconButton
				aria-label="settings"
				onClick={() => {
					setValue(JSON.stringify(settings, null, 2));
					setSettingsVisible(true);
				}}
			>
				<SettingsIcon />
			</IconButton>

			{settingsVisible ? (
				<Dialog
					open
					fullWidth
					fullHeight
					maxWidth="md"
					onClose={() => setSettingsVisible(false)}
				>
					<DialogTitle>
						Settings
					</DialogTitle>
					<DialogContent>
						<StyledTextField
							id="settings"
							type="text"
							multiline
							fullWidth
							variant={'filled'}
							InputProps={{
								disableUnderline: true
							}}
							value={value}
							onChange={handleChange}
						>
						</StyledTextField>
					</DialogContent>
					<DialogActions>
						<Button
							onClick={() => {
								setSettings(JSON.parse(value));
								setSettingsVisible(false);
							}}
						>
							Save
						</Button>
					</DialogActions>
				</Dialog>
			) : null}
		</>
	)
};
