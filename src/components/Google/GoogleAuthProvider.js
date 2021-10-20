import React from 'react';
import { useGoogleLogin, useGoogleLogout } from 'react-google-login';

import { GoogleAuthContext } from './GoogleAuthContext';
// import { useSettings } from '../Settings';

const clientId = '523795745815-cu4ilfedrc7g6qef8t3bkr3703u2tbfr.apps.googleusercontent.com';

export const GoogleAuthProvider = ({ children }) => {
	const [
		loginResult,
		setLoginResult,
	] = React.useState();

	const {
		tokenObj,
		profileObj,
	} = loginResult ?? {};

	// const {
	// 	configUrlJSON,
	// 	setConfigUrlJSON,
	// } = useSettings();

	const {
		signIn,
	} = useGoogleLogin({
		onSuccess: (res) => {
			setLoginResult(res);
			// refreshTokenSetup(res);
		},
		onFailure: (res) => {
			console.log(`Login failed`, res);
		},
		clientId,
		isSignedIn: true,
		accessType: 'offline',
	});

	const {
		signOut,
	} = useGoogleLogout({
		onLogoutSuccess: () => {
			setLoginResult({});
		},
		onFailure: (res) => {
			console.log(`Logout failed`, res);
		},
		clientId,
		accessType: 'offline',
	});

	// React.useEffect(
	// 	() => {
	// 		if (loginResult) {
	// 			// TODO: Load from drive
	// 			// setConfigUrlJSON(jsonContent);
	// 		}
	// 	},
	// 	[loginResult],
	// );

	return (
		<GoogleAuthContext.Provider
			value={{
				signIn,
				signOut,
				loginResult: {
					tokenObj,
					profileObj,
				},
			}}
		>
			{children}
		</GoogleAuthContext.Provider>
	);
}
