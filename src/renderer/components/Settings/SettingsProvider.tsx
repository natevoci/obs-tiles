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

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
	const [title, setTitle] = React.useState<string>(DEFAULT_SETTINGS.title)
	const [configs, setConfigs] = React.useState<ConfigItem[]>([])
	const [currentConfigIndex, setCurrentConfigIndex] = React.useState(0)

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

			const stored: ConfigFileFormat = rawSettings ?? { ...DEFAULT_SETTINGS }
			if (stored.title) setTitle(stored.title)
			setConfigs(stored.configs)
			setCurrentConfigIndex(Math.min(stored.currentConfigIndex, stored.configs.length - 1))
		}

		load()
	}, [])

	const buildBlob = React.useCallback((
		newConfigs: ConfigItem[],
		newIndex: number,
		newTitle?: string,
	): ConfigFileFormat => ({
		title: newTitle ?? title,
		configs: newConfigs,
		currentConfigIndex: newIndex,
	}), [title])

	const saveConfigs = React.useCallback((newConfigs: ConfigItem[], newIndex?: number) => {
		setConfigs(newConfigs)
		const indexToSave = newIndex !== undefined ? newIndex : currentConfigIndex
		persistSettings(buildBlob(newConfigs, indexToSave))
	}, [currentConfigIndex, buildBlob])

	const selectConfig = React.useCallback((index: number) => {
		setCurrentConfigIndex(index)
		persistSettings(buildBlob(configs, index))
	}, [configs, buildBlob])

	const addConfig = React.useCallback((name: string) => {
		const newConfig: ConfigItem = {
			...DEFAULT_SETTINGS.configs[0],
			name,
		}
		const newConfigs = [...configs, newConfig]
		const newIndex = newConfigs.length - 1
		saveConfigs(newConfigs, newIndex)
		setCurrentConfigIndex(newIndex)
	}, [configs, saveConfigs])

	const deleteConfig = React.useCallback((index: number) => {
		if (configs.length <= 1) return
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

	const saveFullSettings = React.useCallback((settings: ConfigFileFormat) => {
		if (settings.title !== undefined) setTitle(settings.title)
		setConfigs(settings.configs)
		setCurrentConfigIndex(settings.currentConfigIndex)
		persistSettings(settings)
	}, [])

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

	return (
		<SettingsContext.Provider
			value={{
				title,
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
