import React from 'react'
import styled from 'styled-components'
import json5 from 'json5'

import { useSettings } from './Settings/SettingsContext'
import { Tiles } from './tiles/Tiles'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@material-ui/core'

const Main = styled.main`
	padding: ${p => p.theme.grid(1)};
`

export const Content = () => {
	const {
		configUrl,
		configUrlJSON,
		setConfigUrlJSON,
		setSettingsJSON,
		settings: {
			connections,
			...tileSettings
		},
	} = useSettings()

	const [promptToUpdate, setPromptToUpdate] = React.useState(false)

	React.useEffect(
		() => {
			if (configUrl) {
				fetch(
					configUrl,
					{
						mode: 'cors',
					},
				).then(response => {
					if (response.ok) {
						response.text().then(message => {
							try {
								if (json5.parse(message)) {
									if (message !== configUrlJSON) {
										setConfigUrlJSON(message)
										setPromptToUpdate(true)
									}
								}
							} catch (e) {
								console.error('Failed to parse config URL JSON', e)
							}
						})
					}
				})
					.catch(error => {
						console.error('Failed to fetch config URL', error)
					})
			}
		},
		[configUrl],
	)

	return (
		<Main
			data-elementtype='Main'
		>
			{promptToUpdate ? (
				<Dialog
					open
					onClose={() => setPromptToUpdate(false)}
				>
					<DialogTitle>
						Updated configuration detected
					</DialogTitle>
					<DialogContent>
						<p>The configuration from the source url has changed.</p>
						<p>Update configuration?</p>
					</DialogContent>
					<DialogActions>
						<Button
							onClick={() => {
								setPromptToUpdate(false)
							}}
						>
							Ignore
						</Button>
						<Button
							onClick={() => {
								setPromptToUpdate(false)
								setSettingsJSON(configUrlJSON || '')
							}}
						>
							Update
						</Button>
					</DialogActions>
				</Dialog>
			) : null}
			<Tiles
				tileSize='10'
				direction='row'
				{...tileSettings}
			/>
		</Main>
	)
}
