import React, { ReactNode } from 'react'
import json5 from 'json5'

import { SettingsContext } from './SettingsContext'
import { DEFAULT_CONFIG } from '../../../shared/defaults'
import type { ConfigItem, ConfigFileFormat } from '../../../shared/types'

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
 * Convert legacy formats to new ConfigFileFormat
 */
function normalizeConfig(config: any): ConfigFileFormat {
	if (!config) {
		return DEFAULT_CONFIG
	}
	
	// Already in new format
	if (config.configs && Array.isArray(config.configs) && typeof config.currentConfigIndex === 'number') {
		return config as ConfigFileFormat
	}
	
	// Old array format - convert to new format
	if (Array.isArray(config)) {
		return {
			configs: config,
			currentConfigIndex: 0
		}
	}
	
	// Legacy single-object format - convert to new format
	return {
		configs: [{
			name: 'Default',
			...config,
		}],
		currentConfigIndex: 0
	}
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
	const [configs, setConfigs] = React.useState<ConfigItem[]>([])
	const [currentConfigIndex, setCurrentConfigIndex] = React.useState(0)
	
	// Fetch config on mount
	React.useEffect(() => {
		const loadConfig = async () => {
			let rawConfig: any
			
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
			}
			
			const normalized = normalizeConfig(rawConfig)
			setConfigs(normalized.configs)
			setCurrentConfigIndex(Math.min(normalized.currentConfigIndex, normalized.configs.length - 1))
			
			// If we converted from old format, save the new format
			const wasOldFormat = rawConfig && (Array.isArray(rawConfig) || (!rawConfig.configs && !Array.isArray(rawConfig)))
			if (wasOldFormat) {
				console.log('Converting old config format to new format')
				if (window.ipcRenderer) {
					window.ipcRenderer.saveConfig(normalized).catch((error) => {
						console.error('Failed to save converted config:', error)
					})
				} else {
					window.localStorage.setItem('settingsCurrent', JSON.stringify(normalized))
				}
			}
		}
		
		loadConfig()
	}, [])

	const saveConfigs = React.useCallback((newConfigs: ConfigItem[], newIndex?: number) => {
		setConfigs(newConfigs)
		const indexToSave = newIndex !== undefined ? newIndex : currentConfigIndex
		
		const configToSave: ConfigFileFormat = {
			configs: newConfigs,
			currentConfigIndex: indexToSave
		}
		
		if (window.ipcRenderer) {
			window.ipcRenderer.saveConfig(configToSave).catch((error) => {
				console.error('Failed to save config:', error)
			})
		} else {
			window.localStorage.setItem('settingsCurrent', JSON.stringify(configToSave))
		}
	}, [currentConfigIndex])

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
		// Save the entire config with the new index
		const configToSave: ConfigFileFormat = {
			configs,
			currentConfigIndex: index
		}
		
		if (window.ipcRenderer) {
			window.ipcRenderer.saveConfig(configToSave).catch((error) => {
				console.error('Failed to save config:', error)
			})
		} else {
			window.localStorage.setItem('settingsCurrent', JSON.stringify(configToSave))
		}
	}, [configs])

	const addConfig = React.useCallback((name: string) => {
		const newConfig: ConfigItem = {
			...DEFAULT_CONFIG.configs[0],
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

	const updateCurrentConfig = React.useCallback((updater: (config: ConfigItem) => ConfigItem) => {
		setConfigs(prevConfigs => {
			const newConfigs = [...prevConfigs]
			newConfigs[currentConfigIndex] = updater(newConfigs[currentConfigIndex])
			saveConfigs(newConfigs)
			return newConfigs
		})
	}, [currentConfigIndex, saveConfigs])

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
				updateCurrentConfig,
			}}
		>
			{children}
		</SettingsContext.Provider>
	)
}
