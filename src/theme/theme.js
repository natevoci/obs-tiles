import React, { useContext } from 'react';
import {
    ThemeContext as StyledThemeContext,
    ThemeProvider as StyledThemeProvider,
} from 'styled-components';
import {
    createMuiTheme,
    ThemeProvider as MUIThemeProvider,
} from '@material-ui/core/styles';

import variables from './variables';

const muiTheme = createMuiTheme({
    palette: {
        primary: {
            main: variables.primary,
            // contrastText: variables.white,
        },
        secondary: {
            main: variables.secondary,
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
