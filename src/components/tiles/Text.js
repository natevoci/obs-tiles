import React from 'react';
import styled, { css } from 'styled-components';
import { LinearProgress } from '@material-ui/core';

import { useObs } from '~/api/obs';

const Paragraph = styled.p`
	width: ${p => p.$size*16}px;
`;

const StyledText = styled.div`
	width: ${p => p.$size*16}px;
`;

const formatMB = (mb) => {
	return (mb > 1000) ? `${(mb/1024).toFixed(3)} GB` : `${(mb).toFixed(3)} MB`
}

const TextComponents = {
	'stats': ({
		obs,
		tileSize,
		connection,
	}) => {
		const size = parseInt(tileSize);

		const stats = obs.useDataProvider('stats');

		if (!stats) {
			return null;
		}

		const fps = stats['fps'] || 0;
		const cpuUsage = stats['cpu-usage'] || 0;
		const memoryUsage = stats['memory-usage'] || 0;
		const freeDiskSpace = stats['free-disk-space'] || 0;
		const outputSkippedFrames = stats['output-skipped-frames'] || 0;

		return (
			<StyledText
				$size={size}
			>
				<Paragraph $size={size}>FPS: {fps.toFixed(2)}</Paragraph>
				<Paragraph $size={size}>CPU: {cpuUsage.toFixed(0)}%</Paragraph>
				<LinearProgress variant='determinate' value={Math.round(cpuUsage)} />
				<Paragraph $size={size}>Memory: {formatMB(memoryUsage)}</Paragraph>
				<Paragraph $size={size}>Free Disk: {formatMB(freeDiskSpace)}</Paragraph>
				<Paragraph $size={size}>Skipped Frames: {outputSkippedFrames}</Paragraph>
			</StyledText>
		);
	},

};

export const Text = ({
	connection,
	...props
}) => {
	const obs = useObs({ connection });

	const component = TextComponents[props.text];

	return component && obs.connected ? React.createElement(component, {
		obs,
		...props,
	}) : null;
};


