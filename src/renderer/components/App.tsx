import { OBSWebsocketProvider } from '~/api/obs'
import { SettingsProvider } from "~/components/Settings/SettingsProvider"
import { ThemeProvider } from "~/theme/theme.tsx"
import { EditModeProvider } from "~/components/EditMode/EditModeContext"

import { Layout } from "./Layout"

import '~/theme/app.css'

export const App = () => {
	return (
		<ThemeProvider>
			<SettingsProvider>
				<OBSWebsocketProvider>
					<EditModeProvider>
						<Layout>
						</Layout>
					</EditModeProvider>
				</OBSWebsocketProvider>
			</SettingsProvider>
		</ThemeProvider>
	)
}
