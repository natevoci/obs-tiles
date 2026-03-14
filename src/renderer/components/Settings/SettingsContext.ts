import React from 'react'
import { ConfigItem, ConfigFileFormat } from '../../../shared/types'

interface SettingsContextType {
	// Global settings
	title: string

	// All configs
	configs: ConfigItem[]
	currentConfigIndex: number

	// Current config
	currentConfig: ConfigItem

	// Config management
	selectConfig: (index: number) => void
	addConfig: (name: string) => void
	deleteConfig: (index: number) => void
	renameConfig: (index: number, newName: string) => void
	saveAllConfigs: (configs: ConfigItem[], selectedIndex: number) => void
	saveFullSettings: (settings: ConfigFileFormat) => void
	updateCurrentConfig: (updater: (config: ConfigItem) => ConfigItem) => void
}

export const SettingsContext = React.createContext<SettingsContextType>({} as SettingsContextType)

export const useSettings = () => React.useContext(SettingsContext)
