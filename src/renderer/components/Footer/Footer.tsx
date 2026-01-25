import styled from 'styled-components'

import { SettingsButton } from '../Settings/SettingsButton'
import OBSLogo from '~/assets/obslogo.png?url'
import { APP_VERSION } from '../../version'

const Wrapper = styled.div`
	height: ${p => p.theme.grid(8)};
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: ${p => p.theme.grid(4)} ${p => p.theme.grid(2)};
	background-color: ${p => p.theme.navBackground};
`

const LogoContainer = styled.div`
	display: flex;
	align-items: center;
	gap: ${p => p.theme.grid(2)};
`

const Logo = styled.img`
    max-height: ${p => p.theme.grid(6.75)};
`;

const Version = styled.span`
	font-size: ${p => p.theme.grid(1.5)};
	color: ${p => p.theme.text};
	opacity: 0.7;
`

export const Footer = () => (
	<Wrapper>
		<LogoContainer>
			<Logo src={OBSLogo} alt="OBS logo" />
			<Version>v{APP_VERSION}</Version>
		</LogoContainer>
		<SettingsButton />
	</Wrapper>
)
