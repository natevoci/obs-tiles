import React from 'react'
import { ConfigItem } from '../../../shared/types'

interface SettingsContextType {
	// All configs
	configs: ConfigItem[]
	currentConfigIndex: number
	
	// Current config helpers
	settingsJSON: string
	setSettingsJSON: (value: string) => void
	settings: ConfigItem
	
	// Config management
	selectConfig: (index: number) => void
	addConfig: (name: string) => void
	deleteConfig: (index: number) => void
	renameConfig: (index: number, newName: string) => void
	saveAllConfigs: (configs: ConfigItem[], selectedIndex: number) => void
	updateCurrentConfig: (updater: (config: ConfigItem) => ConfigItem) => void
}

export const SettingsContext = React.createContext<SettingsContextType>({} as SettingsContextType)

export const useSettings = () => React.useContext(SettingsContext)
