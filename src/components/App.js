import * as React from 'react';

import { Layout } from "./Layout";
import { ThemeProvider } from "~/theme/theme"

import '~/theme/app.css';

export const App = (props) => {
	return (
		<ThemeProvider>
			<Layout>

			</Layout>
		</ThemeProvider>
	);
};
