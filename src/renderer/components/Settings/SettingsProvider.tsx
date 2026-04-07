import React, { ReactNode } from 'react'
import json5 from 'json5'

import { SettingsContext } from './SettingsContext'
import { DEFAULT_SETTINGS, DEFAULT_SHORTCUTS as DEFAULT_SHORTCUTS_RAW } from '../../../shared/defaults'
import type { ConfigItem, ConfigFileFormat, KeyboardShortcut } from '../../../shared/types'

const DEFAULT_SHORTCUTS = DEFAULT_SHORTCUTS_RAW as KeyboardShortcut[]

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

			const loaded: ConfigFileFormat = {
				...DEFAULT_SETTINGS,
				...rawSettings,
			}
			loaded.currentConfigIndex = Math.min(loaded.currentConfigIndex, loaded.configs.length - 1)

			// Migration: apply default shortcuts to any config that was saved before shortcuts existed
			loaded.configs = loaded.configs.map((cfg) =>
				cfg.shortcuts === undefined ? { ...cfg, shortcuts: DEFAULT_SHORTCUTS } : cfg
			)

			setSettings(loaded)
			if (loaded.selectConfigAtLaunch && loaded.configs.length > 1) {
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

	const saveFullSettings = React.useCallback((newSettings: ConfigFileFormat) => {
		setSettings(newSettings)
		persistSettings(newSettings)
	}, [])

	const updateCurrentConfig = React.useCallback((updater: (config: ConfigItem) => ConfigItem) => {
		setSettings(prev => {
			const newConfigs = [...prev.configs]
			newConfigs[prev.currentConfigIndex] = updater(newConfigs[prev.currentConfigIndex])
			console.log('Updated current config. New config:', newConfigs[prev.currentConfigIndex]);
			const next = { ...prev, configs: newConfigs }
			persistSettings(next)
			return next
		})
	}, [])

	if (settings.configs.length === 0) {
		return null
	}

	const currentConfig = settings.configs[settings.currentConfigIndex]

	return (
		<SettingsContext.Provider
			value={{
				settings,
				autoOpenSelector,
				closeAutoOpenSelector,
				currentConfig,
				selectConfig,
				saveFullSettings,
				updateCurrentConfig,
			}}
		>
			{children}
		</SettingsContext.Provider>
	)
}
