import React from 'react'
import styled from 'styled-components'
import { LinearProgress } from '@material-ui/core'

import { useObs, useStats, useVideoInfo } from '~/api/obs'
import type { TextTileConfig } from './Tiles';

interface ParagraphProps {
	$size: number
	$fontSize: number
}

const Paragraph = styled.p<ParagraphProps>`
	width: ${p => p.$size*16}px;
	font-size: ${p => `calc(${p.theme.fontSize.large} * ${p.$fontSize} / 10)`};
`

interface StyledTextProps {
	$size: number
}

const StyledText = styled.div<StyledTextProps>`
	width: ${p => p.$size*16}px;
`

const formatMB = (mb: number): string => {
	return (mb > 1000) ? `${(mb/1024).toFixed(3)} GB` : `${(mb).toFixed(3)} MB`
}

const TextComponents: Record<string, (props: any) => React.ReactElement | null> = {
	'stats': ({
		obs,
		tileSize,
		fontSize,
		statsLines,
		customText,
	}) => {
		const size = parseInt(tileSize)
		const textSize = parseInt(String(fontSize ?? tileSize))

		const stats = useStats(obs)
		const videoInfo = useVideoInfo(obs)

		// Default all lines to shown unless explicitly disabled
		const show = {
			fps:           statsLines?.fps           !== false,
			cpu:           statsLines?.cpu           !== false,
			memory:        statsLines?.memory        !== false,
			freeDisk:      statsLines?.freeDisk      !== false,
			skippedFrames: statsLines?.skippedFrames !== false,
		}

		const anyVisible = Object.values(show).some(Boolean) || Boolean(customText)

		// Guard against a fully empty tile - keep a minimum footprint for the
		// edit-mode overlay controls.
		if (!anyVisible) {
			return <StyledText $size={size}><Paragraph $size={size} $fontSize={textSize}>&nbsp;</Paragraph></StyledText>
		}

		// OBS not connected yet - show dash placeholders so tiles remain visible
		if (!stats) {
			return (
				<StyledText $size={size}>
					{show.fps && <Paragraph $size={size} $fontSize={textSize}>FPS: -</Paragraph>}
					{show.cpu && <Paragraph $size={size} $fontSize={textSize}>CPU: -</Paragraph>}
					{show.memory && <Paragraph $size={size} $fontSize={textSize}>Memory: -</Paragraph>}
					{show.freeDisk && <Paragraph $size={size} $fontSize={textSize}>Free Disk: -</Paragraph>}
					{show.skippedFrames && <Paragraph $size={size} $fontSize={textSize}>Skipped Frames: -</Paragraph>}
					{customText && <Paragraph $size={size} $fontSize={textSize}>{customText}</Paragraph>}
				</StyledText>
			)
		}

		const fps = stats.activeFps || 0
		const targetFps =
			(videoInfo?.fpsNumerator && videoInfo?.fpsDenominator)
				? (videoInfo.fpsNumerator / videoInfo.fpsDenominator)
				: 0
		const fpsPerc = targetFps > 0 ? 100 * fps / targetFps : 0
		const cpuUsage = stats.cpuUsage || 0
		const memoryUsage = stats.memoryUsage || 0
		const freeDiskSpace = stats.availableDiskSpace || 0
		const outputSkippedFrames = stats.outputSkippedFrames || 0

		return (
			<StyledText $size={size}>
				{show.fps && (
					<>
						<Paragraph $size={size} $fontSize={textSize}>FPS: {fps.toFixed(2)}</Paragraph>
						<LinearProgress variant='determinate' value={Math.round(fpsPerc)} color={fpsPerc > 80 ? 'primary' : 'secondary'} />
					</>
				)}
				{show.cpu && (
					<>
						<Paragraph $size={size} $fontSize={textSize}>CPU: {cpuUsage.toFixed(0)}%</Paragraph>
						<LinearProgress variant='determinate' value={Math.round(cpuUsage)} color={cpuUsage < 80 ? 'primary' : 'secondary'} />
					</>
				)}
				{show.memory && (
					<Paragraph $size={size} $fontSize={textSize}>Memory: {formatMB(memoryUsage)}</Paragraph>
				)}
				{show.freeDisk && (
					<Paragraph $size={size} $fontSize={textSize}>Free Disk: {formatMB(freeDiskSpace)}</Paragraph>
				)}
				{show.skippedFrames && (
					<Paragraph $size={size} $fontSize={textSize}>Skipped Frames: {outputSkippedFrames}</Paragraph>
				)}
				{customText && (
					<Paragraph $size={size} $fontSize={textSize}>{customText}</Paragraph>
				)}
			</StyledText>
		)
	},
}


export const Text = ({
	connection,
	...props
}: TextTileConfig) => {
	const obs = useObs({ connection })

	const component = TextComponents[props.text]

	return component ? React.createElement(component, {
		obs,
		...props,
	}) : null
}
