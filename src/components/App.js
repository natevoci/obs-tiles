import * as React from 'react';

import { OBSWebsocketProvider } from '~/api/obs-websocket';
import { SettingsProvider } from "~/components/Settings/SettingsProvider";
import { ThemeProvider } from "~/theme/theme";

import { Layout } from "./Layout";

import '~/theme/app.css';

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
