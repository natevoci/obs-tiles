import React from 'react';

export const GoogleAuthContext = React.createContext({});

export const useGoogleAuth = () => React.useContext(GoogleAuthContext);
