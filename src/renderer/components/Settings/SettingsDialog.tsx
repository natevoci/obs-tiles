import React from 'react'
import styled, { css } from 'styled-components'
import { 
	Dialog, 
	AppBar, 
	Toolbar, 
	DialogContent, 
	DialogActions, 
	Button, 
	TextField, 
	IconButton, 
	Typography,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
} from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import { Close, Add, Delete, Edit } from '@material-ui/icons'

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
		margin-bottom: ${p => p.theme.grid(2)};
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

const ConfigRow = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 16px;
`

const ConfigSelect = styled(FormControl)`
	flex: 1;
	min-width: 200px;
	margin-top: 8px !important;
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
	const { 
		configs: savedConfigs, 
		currentConfigIndex: savedConfigIndex, 
		saveAllConfigs,
	} = useSettings()
	
	// Local state - copy of configs that we edit locally until Save
	const [localConfigs, setLocalConfigs] = React.useState(() => 
		savedConfigs.map(c => ({ ...c }))
	)
	const [localConfigIndex, setLocalConfigIndex] = React.useState(savedConfigIndex)
	
	// Get the current config's JSON for the text area
	const currentConfigJSON = React.useMemo(() => 
		JSON.stringify(localConfigs[localConfigIndex], null, 2),
		[localConfigs, localConfigIndex]
	)
	const [value, setValue] = React.useState(currentConfigJSON)
	const [renameDialogOpen, setRenameDialogOpen] = React.useState(false)
	const [newConfigDialogOpen, setNewConfigDialogOpen] = React.useState(false)
	const [dialogInputValue, setDialogInputValue] = React.useState('')

	// Update text area when switching configs (save current edits to local state first)
	const updateLocalConfigFromTextArea = React.useCallback(() => {
		try {
			const parsed = JSON.parse(value)
			setLocalConfigs(prev => {
				const updated = [...prev]
				updated[localConfigIndex] = parsed
				return updated
			})
		} catch (e) {
			// Invalid JSON, ignore
		}
	}, [value, localConfigIndex])

	// Update text area value when config index changes
	React.useEffect(() => {
		setValue(JSON.stringify(localConfigs[localConfigIndex], null, 2))
	}, [localConfigIndex, localConfigs])

	const handleChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			setValue(event.target.value)
		},
		[],
	)

	const handleConfigSelect = (event: React.ChangeEvent<{ value: unknown }>) => {
		// Save current text area edits to local state
		updateLocalConfigFromTextArea()
		setLocalConfigIndex(event.target.value as number)
	}

	const handleNewConfig = () => {
		setDialogInputValue('')
		setNewConfigDialogOpen(true)
	}

	const handleNewConfigConfirm = () => {
		if (dialogInputValue.trim()) {
			// Save current text area edits first
			updateLocalConfigFromTextArea()
			// Create new config based on default structure
			const newConfig = {
				...localConfigs[0],
				name: dialogInputValue.trim(),
			}
			const newConfigs = [...localConfigs, newConfig]
			setLocalConfigs(newConfigs)
			setLocalConfigIndex(newConfigs.length - 1)
		}
		setNewConfigDialogOpen(false)
	}

	const handleRename = () => {
		setDialogInputValue(localConfigs[localConfigIndex]?.name || '')
		setRenameDialogOpen(true)
	}

	const handleRenameConfirm = () => {
		if (dialogInputValue.trim()) {
			setLocalConfigs(prev => {
				const updated = [...prev]
				updated[localConfigIndex] = { ...updated[localConfigIndex], name: dialogInputValue.trim() }
				return updated
			})
		}
		setRenameDialogOpen(false)
	}

	const handleDelete = () => {
		if (localConfigs.length > 1 && window.confirm(`Delete config "${localConfigs[localConfigIndex]?.name}"?`)) {
			const newConfigs = localConfigs.filter((_, i) => i !== localConfigIndex)
			const newIndex = Math.min(localConfigIndex, newConfigs.length - 1)
			setLocalConfigs(newConfigs)
			setLocalConfigIndex(newIndex)
		}
	}

	const handleSave = () => {
		// Save current text area edits first
		let finalConfigs = localConfigs
		try {
			const parsed = JSON.parse(value)
			finalConfigs = [...localConfigs]
			finalConfigs[localConfigIndex] = parsed
		} catch (e) {
			// Show error and keep dialog open to allow correction
			alert(`Invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`)
			return
		}
		// Commit all changes to the provider
		saveAllConfigs(finalConfigs, localConfigIndex)
		onClose()
	}

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
							onClose()
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
					<ConfigRow>
						<ConfigSelect variant="outlined" size="small">
							<InputLabel id="config-select-label">Configuration</InputLabel>
							<Select
								labelId="config-select-label"
								value={localConfigIndex}
								onChange={handleConfigSelect}
								label="Configuration"
							>
								{localConfigs.map((config, index) => (
									<MenuItem key={index} value={index}>
										{config.name}
									</MenuItem>
								))}
							</Select>
						</ConfigSelect>
						<IconButton size="small" onClick={handleNewConfig} title="New Config">
							<Add />
						</IconButton>
						<IconButton size="small" onClick={handleRename} title="Rename Config">
							<Edit />
						</IconButton>
						<IconButton 
							size="small" 
							onClick={handleDelete} 
							title="Delete Config"
							disabled={localConfigs.length <= 1}
						>
							<Delete />
						</IconButton>
					</ConfigRow>
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
					onClick={handleSave}
				>
					Save
				</Button>
				<Button
					variant="contained"
					onClick={() => {
						onClose()
					}}
				>
					Cancel
				</Button>
			</DialogActions>

			{/* New Config Dialog */}
			<Dialog open={newConfigDialogOpen} onClose={() => setNewConfigDialogOpen(false)}>
				<DialogContent>
					<TextField
						autoFocus
						margin="dense"
						label="Config Name"
						fullWidth
						variant="outlined"
						value={dialogInputValue}
						onChange={(e) => setDialogInputValue(e.target.value)}
						onKeyPress={(e) => e.key === 'Enter' && handleNewConfigConfirm()}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setNewConfigDialogOpen(false)}>Cancel</Button>
					<Button onClick={handleNewConfigConfirm} color="primary" variant="contained">
						Create
					</Button>
				</DialogActions>
			</Dialog>

			{/* Rename Dialog */}
			<Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)}>
				<DialogContent>
					<TextField
						autoFocus
						margin="dense"
						label="Config Name"
						fullWidth
						variant="outlined"
						value={dialogInputValue}
						onChange={(e) => setDialogInputValue(e.target.value)}
						onKeyPress={(e) => e.key === 'Enter' && handleRenameConfirm()}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
					<Button onClick={handleRenameConfirm} color="primary" variant="contained">
						Rename
					</Button>
				</DialogActions>
			</Dialog>
		</Dialog>
	)
}
