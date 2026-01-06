import React, { useContext, ReactNode } from 'react'
import {
	ThemeContext as StyledThemeContext,
	ThemeProvider as StyledThemeProvider,
} from 'styled-components'
import {
	createTheme,
	ThemeProvider as MUIThemeProvider,
} from '@material-ui/core/styles'

import variables from './variables'

const muiTheme = createTheme({
	palette: {
		primary: {
			main: variables.primary,
			// contrastText: variables.white,
		},
		secondary: {
			main: variables.secondary,
		},
	},
	typography: {
		button: {
			textTransform: 'none',
		},
	},
})

interface ThemeProviderProps {
	children: ReactNode
	theme?: Record<string, any>
}

export const ThemeProvider = ({ children, theme }: ThemeProviderProps) => (
	<MUIThemeProvider theme={muiTheme}>
		{React.createElement(StyledThemeProvider as any, {
			theme: {
				...variables,
				...(theme || {}),
			},
		}, children)}
	</MUIThemeProvider>
)

export const useTheme = () => useContext(StyledThemeContext as any)
