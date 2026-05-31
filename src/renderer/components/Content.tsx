import styled from 'styled-components'

import { useSettings } from './Settings/SettingsContext'
import { Tiles } from './tiles/Tiles'
import { useEditMode } from './EditMode/EditModeContext'
import { EditableTiles } from './EditMode/EditableTiles'

const Main = styled.main`
	padding: 0 0 ${p => p.theme.grid(1)} 0;
	border-bottom: 3px solid ${p => p.theme.border};
`

export const Content = () => {
	const {
		currentConfig: {
			connections,
			...tileSettings
		},
	} = useSettings()

	const { isEditMode } = useEditMode()

	return (
		<Main
			data-elementtype='Main'
		>
			{isEditMode ? (
				<EditableTiles />
			) : (
				<Tiles
					{...tileSettings}
					tileSize={tileSettings.tileSize ?? '10'}
					fontSize={tileSettings.fontSize ?? tileSettings.tileSize ?? '10'}
					activeRefreshTime={tileSettings.activeRefreshTime}
					inactiveRefreshTime={tileSettings.inactiveRefreshTime}
					direction={tileSettings.direction ?? 'row'}
				/>
			)}
		</Main>
	)
}
