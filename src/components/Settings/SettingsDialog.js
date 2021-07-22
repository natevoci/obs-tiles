import React from 'react';
import styled from 'styled-components';
import { useGoogleLogin } from 'react-google-login';
import { IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@material-ui/core';
import SettingsIcon from '@material-ui/icons/Settings';

import { useSettings } from './SettingsContext';

const clientId = '523795745815-cu4ilfedrc7g6qef8t3bkr3703u2tbfr.apps.googleusercontent.com';

const StyledTextField = styled(TextField)`
	& textarea {
		font-family: monospace;
	}
`;

export const SettingsDialog = ({
	onClose,
}) => {
	const {settings, setSettings} = useSettings();
	const [value, setValue] = React.useState('');

	const { signIn } = useGoogleLogin({
		onSuccess: (res) => {
			console.log(`Login Successful`, res.profileObj);
			// refreshTokenSetup(res);
		},
		onFailure: (res) => {
			console.log(`Login failed`, res);
		},
		clientId,
		isSignedIn: true,
		accessType: 'offline',
	})

	const handleChange = React.useCallback(
		(event) => {
			setValue(event.target.value);
		},
		[],
	);

	return (
		<Dialog
			open
			fullWidth
			fullHeight
			maxWidth="md"
			onClose={onClose}
		>
			<DialogTitle>
				Settings
			</DialogTitle>
			<DialogContent>
				<Button
					onClick={signIn}
				>
					<span>Sign in with Google</span>
				</Button>
				{/* <StyledTextField
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
				</StyledTextField> */}
			</DialogContent>
			<DialogActions>
				<Button
					onClick={() => {
						setSettings(JSON.parse(value));
						onClose();
					}}
				>
					Save
				</Button>
			</DialogActions>
		</Dialog>
	)
};
