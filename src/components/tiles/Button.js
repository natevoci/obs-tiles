import React from 'react';
import styled, { css } from 'styled-components';
import { Button as MUIButton } from '@material-ui/core';

import { useObsWebsocket } from '~/api';
import { LocalPrintshopSharp } from '@material-ui/icons';

const StyledMUIButton = styled(MUIButton)`
	width: ${p => p.$size*16}px;
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
				label={isStarted ? 'Stop Streaming' : isStopped ? 'Start Streaming' : isStarting ? 'Starting...' : isStopping ? 'Stopping' : 'Start Streaming'}
				disabled={isStarting || isStopping || isLoading}
				onClick={isStarted ? obs.stopStreaming : isStopped ? obs.startStreaming : undefined}
			/>
		);
	},
};

export const Button = (props) => {
	const component = ButtonComponents[props.button];

	return component ? React.createElement(component, props) : null;
};


