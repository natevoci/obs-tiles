import React, { ReactNode } from 'react'
import json5 from 'json5'

import { SettingsContext, ConfigItem } from './SettingsContext'
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

/**
 * Convert legacy single-config format to new array format
 */
function normalizeConfig(config: any): ConfigItem[] {
	if (!config) {
		return DEFAULT_CONFIG
	}
	
	// Already in new array format
	if (Array.isArray(config)) {
		return config
	}
	
	// Legacy single-object format - convert to array
	return [{
		name: 'Default',
		...config,
	}]
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
	const [configs, setConfigs] = React.useState<ConfigItem[]>([])
	const [currentConfigIndex, setCurrentConfigIndex] = React.useState(0)
	
	// Fetch config on mount
	React.useEffect(() => {
		const loadConfig = async () => {
			let rawConfig: any
			let savedIndex = 0
			
			if (window.ipcRenderer) {
				try {
					rawConfig = await window.ipcRenderer.getConfig()
				} catch (error) {
					console.error('Failed to get config:', error)
				}
			} else {
				const stored = window.localStorage.getItem('settingsCurrent')
				if (stored) {
					try {
						rawConfig = json5.parse(stored)
					} catch (e) {
						console.error('Failed to parse stored config:', e)
					}
				}
				savedIndex = parseInt(window.localStorage.getItem('currentConfigIndex') || '0', 10)
			}
			
			const normalized = normalizeConfig(rawConfig)
			setConfigs(normalized)
			setCurrentConfigIndex(Math.min(savedIndex, normalized.length - 1))
		}
		
		loadConfig()
	}, [])

	const saveConfigs = React.useCallback((newConfigs: ConfigItem[], newIndex?: number) => {
		setConfigs(newConfigs)
		
		if (window.ipcRenderer) {
			window.ipcRenderer.saveConfig(newConfigs).catch((error) => {
				console.error('Failed to save config:', error)
			})
		} else {
			window.localStorage.setItem('settingsCurrent', JSON.stringify(newConfigs))
			if (newIndex !== undefined) {
				window.localStorage.setItem('currentConfigIndex', String(newIndex))
			}
		}
	}, [])

	const handleSetSettingsJSON = React.useCallback((value: string) => {
		try {
			const parsed = json5.parse(value) as ConfigItem
			const newConfigs = [...configs]
			newConfigs[currentConfigIndex] = parsed
			saveConfigs(newConfigs)
		} catch (error) {
			console.error('Failed to parse config:', error)
		}
	}, [configs, currentConfigIndex, saveConfigs])

	const selectConfig = React.useCallback((index: number) => {
		setCurrentConfigIndex(index)
		if (!window.ipcRenderer) {
			window.localStorage.setItem('currentConfigIndex', String(index))
		}
	}, [])

	const addConfig = React.useCallback((name: string) => {
		const newConfig: ConfigItem = {
			...DEFAULT_CONFIG[0],
			name,
		}
		const newConfigs = [...configs, newConfig]
		const newIndex = newConfigs.length - 1
		saveConfigs(newConfigs, newIndex)
		setCurrentConfigIndex(newIndex)
	}, [configs, saveConfigs])

	const deleteConfig = React.useCallback((index: number) => {
		if (configs.length <= 1) {
			return // Don't delete the last config
		}
		const newConfigs = configs.filter((_, i) => i !== index)
		const newIndex = Math.min(currentConfigIndex, newConfigs.length - 1)
		saveConfigs(newConfigs, newIndex)
		setCurrentConfigIndex(newIndex)
	}, [configs, currentConfigIndex, saveConfigs])

	const renameConfig = React.useCallback((index: number, newName: string) => {
		const newConfigs = [...configs]
		newConfigs[index] = { ...newConfigs[index], name: newName }
		saveConfigs(newConfigs)
	}, [configs, saveConfigs])

	const saveAllConfigs = React.useCallback((newConfigs: ConfigItem[], selectedIndex: number) => {
		saveConfigs(newConfigs, selectedIndex)
		setCurrentConfigIndex(selectedIndex)
	}, [saveConfigs])

	if (configs.length === 0) {
		return null
	}

	const currentConfig = configs[currentConfigIndex]
	const settingsJSON = JSON.stringify(currentConfig, null, 2)

	return (
		<SettingsContext.Provider
			value={{
				configs,
				currentConfigIndex,
				settingsJSON,
				setSettingsJSON: handleSetSettingsJSON,
				settings: currentConfig,
				selectConfig,
				addConfig,
				deleteConfig,
				renameConfig,
				saveAllConfigs,
			}}
		>
			{children}
		</SettingsContext.Provider>
	)
}
