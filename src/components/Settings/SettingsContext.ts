import React from 'react'

interface SettingsContextType {
	configUrl: string
	setConfigUrl: (value: string) => void
	configUrlJSON: string | null
	setConfigUrlJSON: (value: string) => void
	settingsJSON: string
	setSettingsJSON: (value: string) => void
	settings: any
}

export const SettingsContext = React.createContext<SettingsContextType>({} as SettingsContextType)

export const useSettings = () => React.useContext(SettingsContext)
