import React from 'react'
import styled from 'styled-components'
import { Button as MUIButton } from '@material-ui/core'

import { useObs, useIsStreaming, useIsRecording } from '~/api/obs'
import { useSettings } from '~/components/Settings/SettingsContext'
import { ConfirmDialog } from '~/components/ConfirmDialog'
import type { ButtonTileConfig } from './Tiles';

interface StyledMUIButtonProps {
	$size: number
	$fontSize: number
}

const StyledMUIButton = styled(MUIButton)<StyledMUIButtonProps>`
	width: ${p => p.$size*16}px;
	font-size: ${p => `calc(${p.theme.fontSize.large} * ${p.$fontSize} / 10)`};

	&.MuiButton-contained.Mui-disabled {
		background-color: ${p => p.theme.disabledBackground};
		color: ${p => p.theme.disabledText};
	}
`

interface StyledButtonProps {
	tileSize: string | number
	fontSize?: string | number
	label: string
	[key: string]: any
}

const StyledButton = ({
	tileSize,
	fontSize,
	label,
	...props
}: StyledButtonProps) => {
	return (
		<StyledMUIButton
			$size={parseInt(String(tileSize))}
			$fontSize={parseInt(String(fontSize ?? tileSize))}
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
		fontSize,
	}) => {
		const {
			isStarted = false,
			isStopped = false,
			isStarting = false,
			isStopping = false,
			isLoading = true,
		} = useIsStreaming(obs) ?? {}

		const { settings } = useSettings()
		const [confirmOpen, setConfirmOpen] = React.useState(false)
		const [pendingAction, setPendingAction] = React.useState<(() => void) | null>(null)

		const handleClick = (action: () => void, needsConfirm: boolean) => {
			if (needsConfirm) {
				setPendingAction(() => action)
				setConfirmOpen(true)
			} else {
				action()
			}
		}

		const startAction = () => obs.action('startStreaming')
		const stopAction = () => obs.action('stopStreaming')

		return (
			<>
				<StyledButton
					tileSize={tileSize}
					fontSize={fontSize}
					label={isStarted ? 'Stop Streaming' : (isStopped || isLoading) ? 'Start Streaming' : isStarting ? 'Starting...' : isStopping ? 'Stopping' : '...'}
					color={isStarted ? 'secondary' : isStopped ? 'primary' : 'inherit'}
					disabled={isStarting || isStopping || isLoading}
					onClick={
						isStarted ? () => handleClick(stopAction, settings.confirmBeforeStopStreaming ?? false)
						: isStopped ? () => handleClick(startAction, settings.confirmBeforeStartStreaming ?? false)
						: undefined
					}
				/>
				<ConfirmDialog
					open={confirmOpen}
					title={isStarted ? 'Stop Streaming?' : 'Start Streaming?'}
					message={isStarted ? 'Are you sure you want to stop the stream?' : 'Are you sure you want to start the stream?'}
					onConfirm={() => { pendingAction?.(); setConfirmOpen(false) }}
					onCancel={() => setConfirmOpen(false)}
				/>
			</>
		)
	},

	'toggleRecording': ({
		obs,
		tileSize,
		fontSize,
	}) => {
		const {
			isStarted = false,
			isStopped = false,
			isStarting = false,
			isStopping = false,
			isLoading = true,
		} = useIsRecording(obs) ?? {}

		const { settings } = useSettings()
		const [confirmOpen, setConfirmOpen] = React.useState(false)
		const [pendingAction, setPendingAction] = React.useState<(() => void) | null>(null)

		const handleClick = (action: () => void, needsConfirm: boolean) => {
			if (needsConfirm) {
				setPendingAction(() => action)
				setConfirmOpen(true)
			} else {
				action()
			}
		}

		const startAction = () => obs.action('startRecording')
		const stopAction = () => obs.action('stopRecording')

		return (
			<>
				<StyledButton
					tileSize={tileSize}
					fontSize={fontSize}
					label={isStarted ? 'Stop Recording' : (isStopped || isLoading) ? 'Start Recording' : isStarting ? 'Starting...' : isStopping ? 'Stopping' : '...'}
					color={isStarted ? 'secondary' : isStopped ? 'primary' : 'inherit'}
					disabled={isStarting || isStopping || isLoading}
					onClick={
						isStarted ? () => handleClick(stopAction, settings.confirmBeforeStopRecording ?? false)
						: isStopped ? () => handleClick(startAction, settings.confirmBeforeStartRecording ?? false)
						: undefined
					}
				/>
				<ConfirmDialog
					open={confirmOpen}
					title={isStarted ? 'Stop Recording?' : 'Start Recording?'}
					message={isStarted ? 'Are you sure you want to stop the recording?' : 'Are you sure you want to start the recording?'}
					onConfirm={() => { pendingAction?.(); setConfirmOpen(false) }}
					onCancel={() => setConfirmOpen(false)}
				/>
			</>
		)
	},
}


export const Button = ({
	connection,
	...props
}: ButtonTileConfig) => {
	const obs = useObs({ connection })

	const component = ButtonComponents[props.button]

	return component ? React.createElement(component, {
		obs,
		...props,
	}) : null
}
