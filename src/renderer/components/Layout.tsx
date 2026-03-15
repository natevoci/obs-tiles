import styled from 'styled-components'

import { Footer } from './Footer/Footer'
import { Content } from './Content'
import { ConfigSelectorDialog } from './Footer/ConfigSelectorDialog'
import { HttpsWarningBanner } from './HttpsWarningBanner'
import { useSettings } from './Settings/SettingsContext'

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
	const { autoOpenSelector, closeAutoOpenSelector } = useSettings()

	return (
		<Wrapper>
			<HttpsWarningBanner />
			<Content />
			<Footer />
			<ConfigSelectorDialog open={autoOpenSelector} onClose={closeAutoOpenSelector} />
		</Wrapper>
	)
}
