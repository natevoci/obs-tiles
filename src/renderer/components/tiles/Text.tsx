import React from 'react'
import styled from 'styled-components'
import { LinearProgress } from '@material-ui/core'

import { useObs } from '~/api/obs'

interface ParagraphProps {
	$size: number
}

const Paragraph = styled.p<ParagraphProps>`
	width: ${p => p.$size*16}px;
	font-size: ${p => 14*p.$size/18}px;
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
	}) => {
		const size = parseInt(tileSize)

		const stats = obs.useDataProvider('stats')
		const videoInfo = obs.useDataProvider('videoInfo')

		if (!stats) {
			return null
		}

		const fps = stats.fps || 0
		const fpsPerc = videoInfo?.fps > 0 ? 100 * fps / videoInfo?.fps : 0
		const cpuUsage = stats.cpuUsage || 0
		const memoryUsage = stats.memoryUsage || 0
		const freeDiskSpace = stats.freeDiskSpace || 0
		const outputSkippedFrames = stats.outputSkippedFrames || 0

		return (
			<StyledText
				$size={size}
			>
				<Paragraph $size={size}>FPS: {fps.toFixed(2)}</Paragraph>
				<LinearProgress variant='determinate' value={Math.round(fpsPerc)} color={fpsPerc > 80 ? 'primary' : 'secondary'} />
				<Paragraph $size={size}>CPU: {cpuUsage.toFixed(0)}%</Paragraph>
				<LinearProgress variant='determinate' value={Math.round(cpuUsage)} color={cpuUsage < 80 ? 'primary' : 'secondary'} />
				<Paragraph $size={size}>Memory: {formatMB(memoryUsage)}</Paragraph>
				<Paragraph $size={size}>Free Disk: {formatMB(freeDiskSpace)}</Paragraph>
				<Paragraph $size={size}>Skipped Frames: {outputSkippedFrames}</Paragraph>
			</StyledText>
		)
	},
}

interface TextProps {
	connection?: string
	text: string
	[key: string]: any
}

export const Text = ({
	connection,
	...props
}: TextProps) => {
	const obs = useObs({ connection })

	const component = TextComponents[props.text]

	if (!obs.connected) {
		return null
	}

	return component ? React.createElement(component, {
		obs,
		...props,
	}) : null
}
