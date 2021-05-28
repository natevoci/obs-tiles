import React, { useContext } from 'react';
import {
    ThemeContext as StyledThemeContext,
    ThemeProvider as StyledThemeProvider,
} from 'styled-components';

import variables from './variables';

const createTheme = theme => ({
    ...variables,
    ...(theme || {}),
});

export const ThemeProvider = ({ children, theme }) => (
    <StyledThemeProvider theme={createTheme(theme)}>
        {children}
    </StyledThemeProvider>
);

export const useTheme = () => useContext(StyledThemeContext);
