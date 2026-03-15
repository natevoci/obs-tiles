import React from 'react'
import { ConfigItem, ConfigFileFormat } from '../../../shared/types'

interface SettingsContextType {
	// Full settings blob
	settings: ConfigFileFormat

	// Auto-open at launch
	autoOpenSelector: boolean
	closeAutoOpenSelector: () => void

	// Current config (convenience)
	currentConfig: ConfigItem

	// Actions
	selectConfig: (index: number) => void
	saveFullSettings: (settings: ConfigFileFormat) => void
	updateCurrentConfig: (updater: (config: ConfigItem) => ConfigItem) => void
}

export const SettingsContext = React.createContext<SettingsContextType>({} as SettingsContextType)

export const useSettings = () => React.useContext(SettingsContext)
