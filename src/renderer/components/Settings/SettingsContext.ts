import React from 'react'

interface SettingsContextType {
	settingsJSON: string
	setSettingsJSON: (value: string) => void
	settings: any
}

export const SettingsContext = React.createContext<SettingsContextType>({} as SettingsContextType)

export const useSettings = () => React.useContext(SettingsContext)
