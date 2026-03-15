import React, { ReactNode } from 'react'
import json5 from 'json5'

import { SettingsContext } from './SettingsContext'
import { DEFAULT_SETTINGS } from '../../../shared/defaults'
import type { ConfigItem, ConfigFileFormat } from '../../../shared/types'

declare global {
	interface Window {
		ipcRenderer: {
			getSettings: () => Promise<any>
			saveSettings: (settings: any) => Promise<boolean>
		}
	}
}

interface SettingsProviderProps {
	children: ReactNode
}

function persistSettings(data: ConfigFileFormat) {
	if (window.ipcRenderer) {
		window.ipcRenderer.saveSettings(data).catch((error) => {
			console.error('Failed to save settings:', error)
		})
	} else {
		window.localStorage.setItem('settings', JSON.stringify(data))
	}
}

const EMPTY_SETTINGS: ConfigFileFormat = { ...DEFAULT_SETTINGS, configs: [] }

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
	const [settings, setSettings] = React.useState<ConfigFileFormat>(EMPTY_SETTINGS)
	const [autoOpenSelector, setAutoOpenSelector] = React.useState(false)

	// Fetch settings on mount
	React.useEffect(() => {
		const load = async () => {
			let rawSettings: any

			if (window.ipcRenderer) {
				try {
					rawSettings = await window.ipcRenderer.getSettings()
				} catch (error) {
					console.error('Failed to get settings:', error)
				}
			} else {
				const stored = window.localStorage.getItem('settings')
				if (stored) {
					try {
						rawSettings = json5.parse(stored)
					} catch (e) {
						console.error('Failed to parse stored settings:', e)
					}
				}
			}

			const loaded: ConfigFileFormat = rawSettings ?? { ...DEFAULT_SETTINGS }
			loaded.currentConfigIndex = Math.min(loaded.currentConfigIndex, loaded.configs.length - 1)
			setSettings(loaded)
			if ((loaded.selectConfigAtLaunch ?? false) && loaded.configs.length > 1) {
				setAutoOpenSelector(true)
			}
		}

		load()
	}, [])

	const closeAutoOpenSelector = React.useCallback(() => {
		setAutoOpenSelector(false)
	}, [])

	const selectConfig = React.useCallback((index: number) => {
		setSettings(prev => {
			const next = { ...prev, currentConfigIndex: index }
			persistSettings(next)
			return next
		})
	}, [])

	const addConfig = React.useCallback((name: string) => {
		const newConfig: ConfigItem = { ...DEFAULT_SETTINGS.configs[0], name }
		setSettings(prev => {
			const newConfigs = [...prev.configs, newConfig]
			const next = { ...prev, configs: newConfigs, currentConfigIndex: newConfigs.length - 1 }
			persistSettings(next)
			return next
		})
	}, [])

	const deleteConfig = React.useCallback((index: number) => {
		setSettings(prev => {
			if (prev.configs.length <= 1) return prev
			const newConfigs = prev.configs.filter((_, i) => i !== index)
			const next = { ...prev, configs: newConfigs, currentConfigIndex: Math.min(prev.currentConfigIndex, newConfigs.length - 1) }
			persistSettings(next)
			return next
		})
	}, [])

	const renameConfig = React.useCallback((index: number, newName: string) => {
		setSettings(prev => {
			const newConfigs = [...prev.configs]
			newConfigs[index] = { ...newConfigs[index], name: newName }
			const next = { ...prev, configs: newConfigs }
			persistSettings(next)
			return next
		})
	}, [])

	const saveAllConfigs = React.useCallback((newConfigs: ConfigItem[], selectedIndex: number) => {
		setSettings(prev => {
			const next = { ...prev, configs: newConfigs, currentConfigIndex: selectedIndex }
			persistSettings(next)
			return next
		})
	}, [])

	const saveFullSettings = React.useCallback((newSettings: ConfigFileFormat) => {
		setSettings(newSettings)
		persistSettings(newSettings)
	}, [])

	const updateCurrentConfig = React.useCallback((updater: (config: ConfigItem) => ConfigItem) => {
		setSettings(prev => {
			const newConfigs = [...prev.configs]
			newConfigs[prev.currentConfigIndex] = updater(newConfigs[prev.currentConfigIndex])
			const next = { ...prev, configs: newConfigs }
			persistSettings(next)
			return next
		})
	}, [])

	if (settings.configs.length === 0) {
		return null
	}

	const { title = DEFAULT_SETTINGS.title, configs, currentConfigIndex, selectConfigAtLaunch } = settings
	const currentConfig = configs[currentConfigIndex]

	return (
		<SettingsContext.Provider
			value={{
				title,
				selectConfigAtLaunch: selectConfigAtLaunch ?? false,
				autoOpenSelector,
				closeAutoOpenSelector,
				configs,
				currentConfigIndex,
				currentConfig,
				selectConfig,
				addConfig,
				deleteConfig,
				renameConfig,
				saveAllConfigs,
				saveFullSettings,
				updateCurrentConfig,
			}}
		>
			{children}
		</SettingsContext.Provider>
	)
}
