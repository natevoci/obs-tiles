import React from 'react'

export interface ConfigItem {
	name: string
	connections: Record<string, any>
	connection: string
	tileSize: number
	direction: string
	tiles: any[]
	[key: string]: any
}

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
}

export const SettingsContext = React.createContext<SettingsContextType>({} as SettingsContextType)

export const useSettings = () => React.useContext(SettingsContext)
