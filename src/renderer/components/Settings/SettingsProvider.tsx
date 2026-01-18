import React, { ReactNode } from 'react'
import json5 from 'json5'

import { SettingsContext } from './SettingsContext'

const DEFAULT_SETTINGS = {
	connections: {
		main: {
			address: '<enter address>:4444',
		}
	},
	connection: 'main',
	tileSize: 10,
	direction: 'column',
	tiles: [
		{
			group: 'Scenes',
			direction: 'row',
			tiles: [
				{
					scene: 'Scene 1',
				},
				{
					scene: 'Scene 2',
				},
				{
					direction: 'column',
					tiles: [
						{
							button: 'toggleStreaming',
						},
						{
							button: 'toggleRecording',
						},
						{
							text: 'stats',
						},
					],
				},
			],
		},
	]
}

interface SettingsProviderProps {
	children: ReactNode
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
	const [settingsJSON, setSettingsJSON] = React.useState(
		window.localStorage.getItem(`settingsCurrent`) || JSON.stringify(
			DEFAULT_SETTINGS,
			null,
			2,
		),
	)

	return (
		<SettingsContext.Provider
			value={{
				settingsJSON,
				setSettingsJSON: (value) => {
					window.localStorage.setItem(`settingsCurrent`, value)
					setSettingsJSON(value)
				},

				settings: json5.parse(settingsJSON || '{}'),
			}}
		>
			{children}
		</SettingsContext.Provider>
	)
}
