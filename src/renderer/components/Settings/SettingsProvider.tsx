import React, { ReactNode } from 'react'
import json5 from 'json5'

import { SettingsContext } from './SettingsContext'
import { DEFAULT_CONFIG } from '../../../shared/defaults'

declare global {
	interface Window {
		ipcRenderer: {
			getSettings: () => Promise<{
				title: string
				dataDir: string
			}>
			getConfig: () => Promise<any>
			saveConfig: (config: any) => Promise<boolean>
		}
	}
}

interface SettingsProviderProps {
	children: ReactNode
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
	const [settingsJSON, setSettingsJSON] = React.useState('')
	
	// Fetch config on mount
	React.useEffect(() => {
		if (window.ipcRenderer) {
			window.ipcRenderer.getConfig().then((config) => {
				if (config) {
					setSettingsJSON(JSON.stringify(config, null, 2))
				} else {
					setSettingsJSON(JSON.stringify(DEFAULT_CONFIG, null, 2))
				}
			}).catch((error) => {
				console.error('Failed to get config:', error)
				setSettingsJSON(JSON.stringify(DEFAULT_CONFIG, null, 2))
			})
		}
		else {
			setSettingsJSON(window.localStorage.getItem(`settingsCurrent`) || JSON.stringify(DEFAULT_CONFIG, null, 2))
		}
	}, [])

	const handleSetSettingsJSON = (value: string) => {
		setSettingsJSON(value)
		
		// Save to file via IPC if available
		if (window.ipcRenderer) {
			try {
				const config = json5.parse(value)
				window.ipcRenderer.saveConfig(config).catch((error) => {
					console.error('Failed to save config:', error)
				})
			} catch (error) {
				console.error('Failed to parse config for saving:', error)
			}
		} else {
			window.localStorage.setItem(`settingsCurrent`, value)
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
			}}
		>
			{children}
		</SettingsContext.Provider>
	)
}
