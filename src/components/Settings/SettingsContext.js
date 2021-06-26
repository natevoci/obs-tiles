import React from 'react';

export const SettingsContext = React.createContext({});

export const useSettings = () => React.useContext(SettingsContext);
