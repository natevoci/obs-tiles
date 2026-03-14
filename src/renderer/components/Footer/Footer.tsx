import React from 'react'
import styled from 'styled-components'
import { Button, IconButton, Tooltip } from '@material-ui/core'
import { ConfigSelectorDialog } from './ConfigSelectorDialog'
import { Edit, HighlightOff } from '@material-ui/icons'

import { SettingsButton } from '../Settings/SettingsButton'
import { useSettings } from '../Settings/SettingsContext'
import { useEditMode } from '../EditMode/EditModeContext'
import OBSLogo from '~/assets/obslogo.png?url'
import { APP_VERSION } from '../../version'

const Wrapper = styled.div`
	height: ${p => p.theme.grid(8)};
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: ${p => p.theme.grid(4)} ${p => p.theme.grid(2)};
	background-color: ${p => p.theme.navBackground};
`

const LogoContainer = styled.div`
	display: flex;
	align-items: center;
	gap: ${p => p.theme.grid(2)};
`

const Logo = styled.img`
    max-height: ${p => p.theme.grid(6.75)};
`;

const Version = styled.span`
	font-size: ${p => p.theme.grid(1.5)};
	color: ${p => p.theme.text};
	opacity: 0.7;
`

const RightActions = styled.div`
	display: flex;
	align-items: center;
	gap: 4px;
	color: ${p => p.theme.text};
`

export const Footer = () => {
	const { configs, currentConfigIndex, selectConfig } = useSettings()
	const configName = configs[currentConfigIndex]?.name || ''

	const { isEditMode, setEditMode } = useEditMode()

	const [dialogOpen, setDialogOpen] = React.useState(false)
	const multipleConfigs = configs.length > 1

	return (
		<Wrapper>
			<LogoContainer>
				<Logo src={OBSLogo} alt="OBS logo" />
				<Version>v{APP_VERSION}</Version>
				<Button
					variant="contained"
					size="small"
					disabled={!multipleConfigs}
					onClick={() => setDialogOpen(true)}
				>
					Selected Config: {configName}
				</Button>
				<ConfigSelectorDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
			</LogoContainer>
			<RightActions>
				<Tooltip title={isEditMode ? 'Exit Inline Edit' : 'Inline Edit'}>
					<IconButton
						size="small"
						color="inherit"
						onClick={() => setEditMode(!isEditMode)}
						style={{ color: isEditMode ? '#538c61' : 'inherit' }}
					>
						{isEditMode ? <HighlightOff /> : <Edit />}
					</IconButton>
				</Tooltip>
				<SettingsButton />
			</RightActions>
		</Wrapper>
	)
}
