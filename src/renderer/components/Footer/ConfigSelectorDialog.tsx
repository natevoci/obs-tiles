import React from 'react'
import { Dialog, DialogTitle, MenuList, MenuItem, ListItemText } from '@material-ui/core'

import { useSettings } from '../Settings/SettingsContext'

interface Props {
	open: boolean
	onClose: () => void
}

export const ConfigSelectorDialog = ({ open, onClose }: Props) => {
	const { configs, currentConfigIndex, selectConfig } = useSettings()

	return (
		<Dialog open={open} onClose={onClose}>
			<DialogTitle>Select Config</DialogTitle>
			<MenuList dense style={{ minWidth: 220, paddingBottom: 8 }}>
				{configs.map((cfg, idx) => (
					<MenuItem
						key={idx}
						selected={idx === currentConfigIndex}
						onClick={() => {
							selectConfig(idx)
							onClose()
						}}
					>
						<ListItemText primary={cfg.name} />
					</MenuItem>
				))}
			</MenuList>
		</Dialog>
	)
}
