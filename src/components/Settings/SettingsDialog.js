import React from 'react';
import styled, { css } from 'styled-components';
import { Dialog, AppBar, Toolbar, DialogContent, DialogActions, Button, TextField, IconButton, Typography, Avatar } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Close } from '@material-ui/icons';

import { useSettings } from './SettingsContext';
import { useGoogleAuth } from '../Google/GoogleAuthContext';

const FlexRow = styled.div`
	position: relative;
	display: flex;
	flex-direction: row;
	${p => p.$fillHeight ? css`
		flex-grow: 1;
		overflow-y: hidden;
	` : ''};
	${p => p.$height ? css`
		height: ${p.$height};
	` : ''};
	${p => p.$minHeight ? css`
		min-height: ${p.$minHeight};
	` : ''}

	> :not(:last-child) {
		margin-right: ${p => p.theme.grid(3)};
	}
`;

const FlexColumn = styled.div`
	position: relative;
	display: flex;
	flex-direction: column;
	${p => p.$fixedHeight ? css`
		overflow-y: hidden;
	` : ''}
	${p => p.$fixedHeight ? css`
		height: ${p.$fixedHeight === true ? '100%' : p.$fixedHeight};
	` : ''}

	> :not(:last-child) {
		margin-bottom: ${p => p.theme.grid(3)};
	}
`;

const StyledTextField = styled(TextField)`
	height: 100%;
	> .MuiInputBase-root {
		height: 100%;
		align-items: initial;
		overflow-y: auto;
	}
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
	content: {
		position: 'relative',
		paddingTop: theme.spacing(2),
		overflowY: 'none',
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
			<DialogContent className={classes.content}>
				<FlexColumn
					aria-label='Column'
					$fixedHeight
				>
					<FlexRow
						aria-label='Google login row'
						$height='auto'
					>
						{loginResult?.profileObj ? (
							<>
								<div>
									<Avatar
										alt={loginResult.profileObj.name}
										src={loginResult.profileObj.imageUrl}
									/>
								</div>
								<div>
									<Button
										variant="contained"
										onClick={signOut}
									>
										<Avatar src="https://developers.google.com/identity/sign-in/g-normal.png" className={classes.small} />
										<span>Sign out from {loginResult.profileObj.email}</span>
									</Button>
								</div>
							</>
						) : (
							<div>
								<Button
									variant="contained"
									onClick={signIn}
								>
									<Avatar src="https://developers.google.com/identity/sign-in/g-normal.png" className={classes.small} />
									<span>Sign in with Google</span>
								</Button>
							</div>
						)}
					</FlexRow>

					<FlexRow
						aria-label='Settings text area row'
						$fillHeight
					>
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
						/>
					</FlexRow>
				</FlexColumn>
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
