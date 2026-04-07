import styled from 'styled-components'

import { Footer } from './Footer/Footer'
import { Content } from './Content'
import { ConfigSelectorDialog } from './Footer/ConfigSelectorDialog'
import { HttpsWarningBanner } from './HttpsWarningBanner'
import { useSettings } from './Settings/SettingsContext'
import { useObs, useCurrentScene } from '~/api/obs'
import { useKeyboardShortcuts } from '../hooks'
import React from 'react'

const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	overflow: auto;
	position: relative;
	top: 0;
	height: 100%;
	margin: 0;
	background-color: ${p => p.theme.background};
	font-family: ${p => p.theme.fontFamily};
	font-size: ${p => p.theme.fontSize.medium};
	font-weight: ${p => p.theme.fontWeight.regular};
	color: ${p => p.theme.text};
`

export const Layout = () => {
	const { autoOpenSelector, closeAutoOpenSelector, currentConfig } = useSettings()
	const obs = useObs({ connection: currentConfig.connection })
	const currentSceneData = useCurrentScene(obs)
	useKeyboardShortcuts(currentConfig.shortcuts ?? [], obs, currentSceneData?.name)

	// Config selector triggered by keyboard shortcut
	const [shortcutSelectorOpen, setShortcutSelectorOpen] = React.useState(false)
	React.useEffect(() => {
		const handler = () => setShortcutSelectorOpen(true)
		window.addEventListener('obs-tiles-open-config-selector', handler)
		return () => window.removeEventListener('obs-tiles-open-config-selector', handler)
	}, [])

	return (
		<Wrapper>
			<HttpsWarningBanner />
			<Content />
			<Footer />
			<ConfigSelectorDialog open={autoOpenSelector} onClose={closeAutoOpenSelector} />
			<ConfigSelectorDialog open={shortcutSelectorOpen} onClose={() => setShortcutSelectorOpen(false)} />
		</Wrapper>
	)
}
