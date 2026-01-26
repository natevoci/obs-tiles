import React from 'react'
import styled from 'styled-components'
import { Button as MUIButton } from '@material-ui/core'

import { useObs, useIsStreaming, useIsRecording } from '~/api/obs'

interface StyledMUIButtonProps {
	$size: number
}

const StyledMUIButton = styled(MUIButton)<StyledMUIButtonProps>`
	width: ${p => p.$size*16}px;

	&.MuiButton-contained.Mui-disabled {
		background-color: ${p => p.theme.disabledBackground};
		color: ${p => p.theme.disabledText};
	}
`

interface StyledButtonProps {
	tileSize: string | number
	label: string
	[key: string]: any
}

const StyledButton = ({
	tileSize,
	label,
	...props
}: StyledButtonProps) => {
	return (
		<StyledMUIButton
			$size={parseInt(String(tileSize))}
			variant='contained'
			{...props}
		>
			{label}
		</StyledMUIButton>
	)
}

const ButtonComponents: Record<string, (props: any) => React.ReactElement | null> = {
	'toggleStreaming': ({
		obs,
		tileSize,
	}) => {
		const {
			isStarted = false,
			isStopped = false,
			isStarting = false,
			isStopping = false,
			isLoading = true,
		} = useIsStreaming(obs)

		return (
			<StyledButton
				tileSize={tileSize}
				label={isStarted ? 'Stop Streaming' : isStopped ? 'Start Streaming' : isStarting ? 'Starting...' : isStopping ? 'Stopping' : '...'}
				color={isStarted ? 'secondary' : isStopped ? 'primary' : 'inherit'}
				disabled={isStarting || isStopping || isLoading}
				onClick={isStarted ? () => obs.action('stopStreaming') : isStopped ? () => obs.action('startStreaming') : undefined}
			/>
		)
	},

	'toggleRecording': ({
		obs,
		tileSize,
	}) => {
		const {
			isStarted = false,
			isStopped = false,
			isStarting = false,
			isStopping = false,
			isLoading = true,
		} = useIsRecording(obs)

		return (
			<StyledButton
				tileSize={tileSize}
				label={isStarted ? 'Stop Recording' : isStopped ? 'Start Recording' : isStarting ? 'Starting...' : isStopping ? 'Stopping' : '...'}
				color={isStarted ? 'secondary' : isStopped ? 'primary' : 'inherit'}
				disabled={isStarting || isStopping || isLoading}
				onClick={isStarted ? () => obs.action('stopRecording') : isStopped ? () => obs.action('startRecording') : undefined}
			/>
		)
	},
}

interface ButtonProps {
	connection?: string
	button: string
	[key: string]: any
}

export const Button = ({
	connection,
	...props
}: ButtonProps) => {
	const obs = useObs({ connection })

	const component = ButtonComponents[props.button]

	if (!obs.connected) {
		return null;
	}

	return component ? React.createElement(component, {
		obs,
		...props,
	}) : null
}
