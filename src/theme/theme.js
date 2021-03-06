import React, { useContext } from 'react';
import {
	ThemeContext as StyledThemeContext,
	ThemeProvider as StyledThemeProvider,
} from 'styled-components';
import {
	createTheme,
	ThemeProvider as MUIThemeProvider,
} from '@material-ui/core/styles';

import variables from './variables';

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
});

export const ThemeProvider = ({ children, theme }) => (
	<MUIThemeProvider theme={muiTheme}>
		<StyledThemeProvider theme={{
			...variables,
			...(theme || {}),
		}}>
			{children}
		</StyledThemeProvider>
	</MUIThemeProvider>
);

export const useTheme = () => useContext(StyledThemeContext);
