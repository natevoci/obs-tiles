import { createProvider } from '../createProvider';

export const stats = (obs, {
	refreshTime = 3000,
} = {}) => createProvider({
	attach: (onChanged) => {
		let timeout;
		const cpuUsageHistory = [0,0,0,0,0];
		const fn = () => {
			if (obs.v4) {
				obs.send('GetStats', {}, data => {
					cpuUsageHistory.push(data.stats['cpu-usage']);
					cpuUsageHistory.shift();
					const cpuUsage = cpuUsageHistory.reduce((a, b) => a + b, 0) / cpuUsageHistory.length;

					onChanged({
						cpuUsage,
						memoryUsage: data.stats['memory-usage'],
						availableDiskSpace: data.stats['free-disk-space'],
						activeFps: data.stats['fps'],
						averageFrameRenderTime: data.stats['average-frame-time'],
						renderSkippedFrames: data.stats['render-missed-frames'],
						renderTotalFrames: data.stats['render-total-frames'],
						outputSkippedFrames: data.stats['output-skipped-frames'],
						outputTotalFrames: data.stats['output-total-frames'],
					});
					timeout = setTimeout(fn, refreshTime);
				});
			}
			else {
				obs.send('GetStats', {}, data => {
					cpuUsageHistory.push(data.cpuUsage);
					cpuUsageHistory.shift();
					const cpuUsage = cpuUsageHistory.reduce((a, b) => a + b, 0) / cpuUsageHistory.length;

					onChanged({
						...data,
						cpuUsage,
					});
					timeout = setTimeout(fn, refreshTime);
				});
			}
		};

		fn();

		return () => {
			if (timeout) {
				clearTimeout(timeout);
			}
		};
	}
});
