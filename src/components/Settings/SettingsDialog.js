import React from 'react';
import styled from 'styled-components';
import { Dialog, AppBar, Toolbar, DialogContent, DialogActions, Button, TextField, IconButton, Typography, Grid, Avatar } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Close } from '@material-ui/icons';

import { useSettings } from './SettingsContext';
import { useGoogleAuth } from '../Google/GoogleAuthContext';

const StyledTextField = styled(TextField)`
	& textarea {
		font-family: monospace;
	}
`;

const useStyles = makeStyles((theme) => ({
	appBar: {
		position: 'relative',
	},
	title: {
		marginLeft: theme.spacing(2),
		flex: 1,
	},
	small: {
		width: theme.spacing(3),
		height: theme.spacing(3),
		marginRight: theme.spacing(2),
	},
}));

export const SettingsDialog = ({
	onClose,
}) => {
	const classes = useStyles();
	const {settingsJSON, setSettingsJSON} = useSettings();
	const [value, setValue] = React.useState(settingsJSON);

	const {
		signIn,
		signOut,
		loginResult,
	} = useGoogleAuth();

	const handleChange = React.useCallback(
		(event) => {
			setValue(event.target.value);
		},
		[],
	);

	return (
		<Dialog
			open
			fullScreen
			onClose={onClose}
		>
			<AppBar className={classes.appBar}>
				<Toolbar>
					<Typography variant="h6" className={classes.title}>
						Settings
					</Typography>
					<IconButton
						edge="start"
						color="inherit"
						onClick={() => {
							onClose();
						}}
						aria-label="close"
					>
						<Close />
					</IconButton>
				</Toolbar>
			</AppBar>
			<DialogContent>
				<Grid container spacing={3}>
					<Grid container spacing={3} item xs={12} direction="row">
						{loginResult ? (
							<>
								<Grid item>
									<Avatar
										alt={loginResult.profileObj.name}
										src={loginResult.profileObj.imageUrl}
									/>
								</Grid>
								<Grid item>
									<Button
										variant="contained"
										onClick={signOut}
									>
										<Avatar src="https://developers.google.com/identity/sign-in/g-normal.png" className={classes.small} />
										<span>Sign out from {loginResult.profileObj.email}</span>
									</Button>
								</Grid>
							</>
						) : (
							<Grid item>
								<Button
									variant="contained"
									onClick={signIn}
								>
									<Avatar src="https://developers.google.com/identity/sign-in/g-normal.png" className={classes.small} />
									<span>Sign in with Google</span>
								</Button>
							</Grid>
						)}
					</Grid>
					<Grid item xs={12}>
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
					</Grid>
				</Grid>
			</DialogContent>
			<DialogActions>
				<Button
					color="primary"
					variant="contained"
					onClick={() => {
						setSettingsJSON(value);
						onClose();
					}}
				>
					Save
				</Button>
				<Button
					variant="contained"
					onClick={() => {
						onClose();
					}}
				>
					Cancel
				</Button>
			</DialogActions>
		</Dialog>
	)
};
