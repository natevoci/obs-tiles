import React from 'react'

interface EditModeContextType {
	isEditMode: boolean
	setEditMode: (v: boolean) => void
	/** Tile config currently on the clipboard (from a Cut operation) */
	clipboard: any | null
	setClipboard: (tile: any | null) => void
}

export const EditModeContext = React.createContext<EditModeContextType>({
	isEditMode: false,
	setEditMode: () => {},
	clipboard: null,
	setClipboard: () => {},
})

export const useEditMode = () => React.useContext(EditModeContext)

interface EditModeProviderProps {
	children: React.ReactNode
}

export const EditModeProvider = ({ children }: EditModeProviderProps) => {
	const [isEditMode, setEditMode] = React.useState(false)
	const [clipboard, setClipboard] = React.useState<any | null>(null)

	return (
		<EditModeContext.Provider value={{ isEditMode, setEditMode, clipboard, setClipboard }}>
			{children}
		</EditModeContext.Provider>
	)
}
