import * as React from 'react';

import { OBSWebsocketProvider } from '/src/api/obs';
import { SettingsProvider } from "/src/components/Settings/SettingsProvider";
import { ThemeProvider } from "/src/theme/theme";

import { Layout } from "./Layout";

import '/src/theme/app.css';

export const App = (props) => {
	return (
		<ThemeProvider>
			<SettingsProvider>
				<OBSWebsocketProvider>
					<Layout>
					</Layout>
				</OBSWebsocketProvider>
			</SettingsProvider>
		</ThemeProvider>
	);
};
