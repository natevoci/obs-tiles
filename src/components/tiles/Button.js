import React from 'react';
import styled, { css } from 'styled-components';
import { Button as MUIButton } from '@material-ui/core';

import { useObsWebsocket } from '~/api';

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
		tileSize,
		connection,
	}) => {
		const obs = useObsWebsocket({ connection });

		const {
			isStarted,
			isStopped,
			isStarting,
			isStopping,
			isLoading,
		} = obs.useIsStreaming();

		return (
			<StyledButton
				tileSize={tileSize}
				label={isStarted ? 'Stop Streaming' : isStopped ? 'Start Streaming' : isStarting ? 'Starting...' : isStopping ? 'Stopping' : '...'}
				color={isStarted ? 'secondary' : isStopped ? 'primary' : 'inherit'}
				disabled={isStarting || isStopping || isLoading}
				onClick={isStarted ? obs.stopStreaming : isStopped ? obs.startStreaming : undefined}
			/>
		);
	},

	'toggleRecording': ({
		tileSize,
		connection,
	}) => {
		const obs = useObsWebsocket({ connection });

		const {
			isStarted,
			isStopped,
			isStarting,
			isStopping,
			isLoading,
		} = obs.useIsRecording();

		return (
			<StyledButton
				tileSize={tileSize}
				label={isStarted ? 'Stop Recording' : isStopped ? 'Start Recording' : isStarting ? 'Starting...' : isStopping ? 'Stopping' : '...'}
				color={isStarted ? 'secondary' : isStopped ? 'primary' : 'inherit'}
				disabled={isStarting || isStopping || isLoading}
				onClick={isStarted ? obs.stopRecording : isStopped ? obs.startRecording : undefined}
			/>
		);
	},
};

export const Button = (props) => {
	const component = ButtonComponents[props.button];

	return component ? React.createElement(component, props) : null;
};


