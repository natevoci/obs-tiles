import React from 'react'
import styled, { css } from 'styled-components'
import { Dialog, AppBar, Toolbar, DialogContent, DialogActions, Button, TextField, IconButton, Typography } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import { Close } from '@material-ui/icons'

import { useSettings } from './SettingsContext'

interface FlexRowProps {
	$fillHeight?: boolean
	$height?: string
	$minHeight?: string
}

const FlexRow = styled.div<FlexRowProps>`
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
`

interface FlexColumnProps {
	$fixedHeight?: boolean | string
}

const FlexColumn = styled.div<FlexColumnProps>`
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
`

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
`

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
		overflowY: 'hidden',
	},
}))

interface SettingsDialogProps {
	onClose: () => void
}

export const SettingsDialog = ({
	onClose,
}: SettingsDialogProps) => {
	const classes = useStyles()
	const {settingsJSON, setSettingsJSON, isConfigFromPortable} = useSettings()
	const [value, setValue] = React.useState(settingsJSON)

	const handleChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			setValue(event.target.value)
		},
		[],
	)

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
						{isConfigFromPortable && <span style={{ marginLeft: '1em', fontSize: '0.8em', fontStyle: 'italic' }}>(loaded from portable.json)</span>}
					</Typography>
					<IconButton
						edge="start"
						color="inherit"
						onClick={() => {
							onClose()
						}}
						aria-label="close"
					>
						<Close />
					</IconButton>
				</Toolbar>
			</AppBar>
			<DialogContent className={classes.content}>
				{isConfigFromPortable && (
					<div style={{ marginBottom: '1em', padding: '1em', backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #90caf9' }}>
						<Typography variant="body2" color="primary">
							Configuration is loaded from <code>portable.json</code> and cannot be edited.
						</Typography>
					</div>
				)}
				<FlexColumn
					aria-label='Column'
					$fixedHeight
				>
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
							disabled={isConfigFromPortable}
						/>
					</FlexRow>
				</FlexColumn>
			</DialogContent>

			<DialogActions>
				{!isConfigFromPortable && (
					<Button
						color="primary"
						variant="contained"
						onClick={() => {
							setSettingsJSON(value)
							onClose()
						}}
					>
						Save
					</Button>
				)}
				<Button
					variant="contained"
					onClick={() => {
						onClose()
					}}
				>
					{isConfigFromPortable ? 'Close' : 'Cancel'}
				</Button>
			</DialogActions>
		</Dialog>
	)
}
