import React, { ReactNode } from 'react'
import json5 from 'json5'

import { SettingsContext } from './SettingsContext'

declare global {
	interface Window {
		ipcRenderer: {
			getPortableConfig: () => Promise<{
				title?: string
				dataDir?: string
				config?: any
			} | undefined>
		}
	}
}

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
	const [hasPortableConfig, setHasPortableConfig] = React.useState<boolean>(false)
	
	const [settingsJSON, setSettingsJSON] = React.useState('')
	
	// Fetch portable config on mount
	React.useEffect(() => {
		if (window.ipcRenderer) {
			window.ipcRenderer.getPortableConfig().then((portableConfig) => {
				const config = portableConfig?.config;
				if (config) {
					setHasPortableConfig(true)
					setSettingsJSON(JSON.stringify(config, null, 2))
				}
			}).catch((error) => {
				console.error('Failed to get portable config:', error)
			})
		}
		else {
			setSettingsJSON(window.localStorage.getItem(`settingsCurrent`) || JSON.stringify(DEFAULT_SETTINGS, null, 2))
		}
	}, [])

	// Don't allow changing settings if they come from portable.json
	const handleSetSettingsJSON = (value: string) => {
		if (!hasPortableConfig) {
			window.localStorage.setItem(`settingsCurrent`, value)
			setSettingsJSON(value)
		}
	}

	if (!settingsJSON) {
		return null
	}

	return (
		<SettingsContext.Provider
			value={{
				settingsJSON,
				setSettingsJSON: handleSetSettingsJSON,
				settings: json5.parse(settingsJSON || '{}'),
				isConfigFromPortable: hasPortableConfig,
			}}
		>
			{children}
		</SettingsContext.Provider>
	)
}
