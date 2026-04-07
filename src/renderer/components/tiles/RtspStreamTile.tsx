import * as React from 'react'
import styled from 'styled-components'
import { IconButton } from '@material-ui/core'
import { VolumeOff, VolumeUp, PlayArrow, Stop } from '@material-ui/icons'

import { useSettings } from '~/components/Settings/SettingsContext'
import { useEditMode } from '~/components/EditMode/EditModeContext'
import { TileWrapper, StyledCircularProgress } from './TileWrapper'
import { useRtspStream } from '~/api/obs/rtsp'
import type { RtspStreamTileConfig } from './Tiles'

// ============================================================================
// Styled Components
// ============================================================================

interface SizeProps {
	$size: number
}

interface StreamCanvasProps extends SizeProps {
	$hasFrame: boolean
}

const StreamCanvas = styled.canvas<StreamCanvasProps>`
	display: block;
	width: ${p => p.$size * 16}px;
	height: ${p => p.$size * 9}px;
	background-color: #000;
	visibility: ${p => p.$hasFrame ? 'visible' : 'hidden'};
`

const OverlayCenter = styled.div<SizeProps>`
	position: absolute;
	width: ${p => p.$size * 16}px;
	height: ${p => p.$size * 9}px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	pointer-events: none;
	z-index: 5;
`

const ErrorText = styled.p`
	color: ${p => p.theme.sceneText};
	font-size: ${p => p.theme.fontSize.small};
	text-align: center;
	padding: 8px;
	margin: 0;
`

const MuteButtonWrapper = styled.div`
	position: absolute;
	bottom: 4px;
	right: 4px;
	z-index: 10;
	pointer-events: auto;
`

const PlayButtonWrapper = styled.div`
	position: absolute;
	bottom: 4px;
	left: 4px;
	z-index: 10;
	pointer-events: auto;
`

const AudioLevelMeterWrapper = styled.div`
	position: absolute;
	top: 0;
	bottom: 0;
	right: 0px;
	width: 5px;
	z-index: 8;
	pointer-events: none;
	border-radius: 2px;
	overflow: hidden;
	background: linear-gradient(
		to top,
		#00c853 0%,
		#00c853 50%,
		#ffb300 55%,
		#ffb300 85%,
		#f44336 86%,
		#d50000 100%
	);
`

interface AudioLevelBarProps {
	$levelPercent: number
}

const AudioLevelBar = styled.div<AudioLevelBarProps>`
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: ${p => 100 - p.$levelPercent}%;
	background-color: rgba(0, 0, 0, 0.75);
	transition: height 80ms ease-out;
`

const StyledMuteButton = styled(IconButton)`
	padding: 4px !important;
	background-color: rgba(0, 0, 0, 0.5) !important;
	color: white !important;
	&:hover {
		background-color: rgba(0, 0, 0, 0.7) !important;
	}
`

// ============================================================================
// Component
// ============================================================================

export const RtspStreamTile = ({
	connection,
	rtspStream,
	streamUrl,
	fps,
	audioSyncOffsetMs,
	startMuted = true,
	title,
	tileSize = '10',
	fontSize,
}: RtspStreamTileConfig) => {
	const tileSizeInt = parseInt(String(tileSize))
	const labelFontSize = parseInt(String(fontSize ?? tileSize))
	const label = title || rtspStream

	const { currentConfig, settings } = useSettings()

	// Derive default stream URL from the connection's host address
	const resolvedStreamUrl = React.useMemo(() => {
		if (streamUrl) return streamUrl

		const connectionKey = connection || currentConfig.connection
		const connectionConfig = currentConfig.connections?.[connectionKey]
		if (!connectionConfig?.address) {
			return ''
		}

		// address is e.g. "192.168.1.100:4455" or "localhost:4455"
		const host = connectionConfig.address.split(':')[0]
		return `rtsp://${host}/live`
	}, [streamUrl, connection, currentConfig])

	const ffmpegPath = settings.ffmpegPath ?? ''

	React.useEffect(() => {
		console.log(`[RtspStreamTile] id='${rtspStream}' resolvedUrl='${resolvedStreamUrl}' ffmpegPath='${ffmpegPath}'`)
	}, [rtspStream, resolvedStreamUrl, ffmpegPath])

	const { hasFrame, canvasRef, connecting, error, muted, toggleMute, active, toggleActive, audioLevel } = useRtspStream({
		streamId: `rtsp-${rtspStream}`,
		streamUrl: resolvedStreamUrl,
		startMuted,
		fps: fps ?? null,
		audioSyncOffsetMs: audioSyncOffsetMs ?? 0,
		ffmpegPath,
	})

	const { isEditMode } = useEditMode()
	// Remember whether the stream was active when edit mode was entered
	// so we only auto-resume if we were the ones who stopped it
	const wasActiveBeforeEditMode = React.useRef(false)
	React.useEffect(() => {
		if (isEditMode) {
			wasActiveBeforeEditMode.current = active
			if (active) toggleActive()
		} else {
			if (wasActiveBeforeEditMode.current && !active) toggleActive()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isEditMode])

	// Listen for rtsp-control keyboard shortcut events
	React.useEffect(() => {
		const fullStreamId = `rtsp-${rtspStream}`
		const handler = (e: Event) => {
			const { command, streamId } = (e as CustomEvent<{ command: string; streamId: string }>).detail
			if (streamId !== fullStreamId) return
			if (command === 'start' && !active) toggleActive()
			else if (command === 'stop' && active) toggleActive()
			else if (command === 'toggle') toggleActive()
		}
		window.addEventListener('rtsp-control', handler)
		return () => window.removeEventListener('rtsp-control', handler)
	}, [active, toggleActive, rtspStream])

	// Overlay content (spinner, error, or nothing)
	const overlayContent = React.useMemo(() => {
		if (connecting && !hasFrame) {
			return <StyledCircularProgress size={tileSizeInt * 3} />
		}
		if (error) {
			return <ErrorText>{error}</ErrorText>
		}
		return null
	}, [connecting, hasFrame, error, tileSizeInt])

	// Audio level meter overlay
	const levelPercent = audioLevel !== null
		? Math.round(Math.max(0, ((audioLevel + 60) / 60) * 100))
		: 0

	// Mute button overlay
	const muteOverlay = (
		<MuteButtonWrapper>
			<StyledMuteButton
				size='small'
				onClick={e => {
					e.stopPropagation()
					toggleMute()
				}}
			>
				{muted ? <VolumeOff fontSize='small' /> : <VolumeUp fontSize='small' />}
			</StyledMuteButton>
		</MuteButtonWrapper>
	)

	// Play/stop button overlay
	const playOverlay = (
		<PlayButtonWrapper>
			<StyledMuteButton
				size='small'
				onClick={e => {
					e.stopPropagation()
					toggleActive()
				}}
			>
				{active ? <Stop fontSize='small' /> : <PlayArrow fontSize='small' />}
			</StyledMuteButton>
		</PlayButtonWrapper>
	)

	return (
		<TileWrapper
			size={tileSizeInt}
			fontSize={labelFontSize}
			label={label}
			overlay={
				<>
					{overlayContent && (
						<OverlayCenter $size={tileSizeInt}>
							{overlayContent}
						</OverlayCenter>
					)}
					{audioLevel !== null && (
						<AudioLevelMeterWrapper>
							<AudioLevelBar $levelPercent={levelPercent} />
						</AudioLevelMeterWrapper>
					)}
					{playOverlay}
					{muteOverlay}
				</>
			}
			elementType='RtspStreamTile'
		>
			<StreamCanvas
				ref={canvasRef}
				$size={tileSizeInt}
				$hasFrame={hasFrame}
			/>
		</TileWrapper>
	)
}
