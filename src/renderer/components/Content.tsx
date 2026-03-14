import styled from 'styled-components'

import { useSettings } from './Settings/SettingsContext'
import { Tiles } from './tiles/Tiles'
import { useEditMode } from './EditMode/EditModeContext'
import { EditableTiles } from './EditMode/EditableTiles'

const Main = styled.main`
	padding: ${p => p.theme.grid(1)};
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
					direction={tileSettings.direction ?? 'row'}
				/>
			)}
		</Main>
	)
}
