import React from 'react';
import styled from 'styled-components';
import { Button as MUIButton } from '@material-ui/core';

import { useObs } from '~/api/obs';

const StyledMUIButton = styled(MUIButton)`
	width: ${p => p.$size*16}px;

	&.MuiButton-contained.Mui-disabled {
		background-color: ${p => p.theme.disabledBackground};
		color: ${p => p.theme.disabledText};
	}
`;

const StyledButton = ({
	tileSize,
	label,
	...props
}) => {
	return (
		<StyledMUIButton
			$size={parseInt(tileSize)}
			variant='contained'
			{...props}
		>
			{label}
		</StyledMUIButton>
	);
}

const ButtonComponents = {
	'toggleStreaming': ({
		obs,
		tileSize,
	}) => {
		const {
			isStarted,
			isStopped,
			isStarting,
			isStopping,
			isLoading,
		} = obs.useDataProvider('isStreaming');

		return (
			<StyledButton
				tileSize={tileSize}
				label={isStarted ? 'Stop Streaming' : isStopped ? 'Start Streaming' : isStarting ? 'Starting...' : isStopping ? 'Stopping' : '...'}
				color={isStarted ? 'secondary' : isStopped ? 'primary' : 'inherit'}
				disabled={isStarting || isStopping || isLoading}
				onClick={isStarted ? () => obs.action('stopStreaming') : isStopped ? () => obs.action('startStreaming') : undefined}
			/>
		);
	},

	'toggleRecording': ({
		obs,
		tileSize,
	}) => {
		const {
			isStarted,
			isStopped,
			isStarting,
			isStopping,
			isLoading,
		} = obs.useDataProvider('isRecording');

		return (
			<StyledButton
				tileSize={tileSize}
				label={isStarted ? 'Stop Recording' : isStopped ? 'Start Recording' : isStarting ? 'Starting...' : isStopping ? 'Stopping' : '...'}
				color={isStarted ? 'secondary' : isStopped ? 'primary' : 'inherit'}
				disabled={isStarting || isStopping || isLoading}
				onClick={isStarted ? () => obs.action('stopRecording') : isStopped ? () => obs.action('startRecording') : undefined}
			/>
		);
	},
};

export const Button = ({
	connection,
	...props
}) => {
	const obs = useObs({ connection });

	const component = ButtonComponents[props.button];

	return component && obs.connected ? React.createElement(component, {
		obs,
		...props,
	}) : null;
};


