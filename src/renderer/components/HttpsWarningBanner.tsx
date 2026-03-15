import React from 'react'
import styled from 'styled-components'
import { IconButton } from '@material-ui/core'
import { Close, Warning } from '@material-ui/icons'

const Banner = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	background-color: #7a3a00;
	color: #ffd89b;
	font-size: 13px;
	flex-shrink: 0;
`

const BannerText = styled.span`
	flex: 1;
`

export const HttpsWarningBanner = () => {
	const [dismissed, setDismissed] = React.useState(false)

	// Only relevant in web mode loaded over HTTPS
	if (window.ipcRenderer || window.location.protocol !== 'https:' || dismissed) {
		return null
	}

	return (
		<Banner>
			<Warning style={{ fontSize: 18, flexShrink: 0 }} />
			<BannerText>
				obs-tiles is loaded over HTTPS, but the OBS WebSocket connection uses an unencrypted WebSocket (ws://).
				Browsers block mixed content, so the connection will not work. Load obs-tiles over HTTP instead.
			</BannerText>
			<IconButton size="small" style={{ color: 'inherit', padding: 2 }} onClick={() => setDismissed(true)}>
				<Close fontSize="small" />
			</IconButton>
		</Banner>
	)
}
