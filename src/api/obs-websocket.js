import * as React from 'react';
import OBSWebSocket from 'obs-websocket-js';

import { useSettings } from '~/components/Settings/SettingsContext';

const obsContext = React.createContext({});

export const OBSWebsocketProvider = ({ children }) => {
	const { current: connections } = React.useRef({});
	const { settings } = useSettings();
	const [connected, setConnected] = React.useState(false);

	const getConnection = React.useCallback(
		(name) => {
			if (!connections[name]) {
				const connSettings = settings.connections[name];
				if (!connSettings) {
					throw new Error(`Missing connection information for {name}`);
				}

				const connection = {};
				connection.name = name;
				connection.obs = new OBSWebSocket();
				connection.failed = false;
				
				connection.obs.on('AuthenticationSuccess', () => {
					setConnected(true);
				});
				connection.obs.on('AuthenticationFailure', () => {
					console.error('Authentication failed');
				});
				connection.obs.on('error', (err) => {
					connection.failed = err;
				});

				connection.obs.connect({
					address: connSettings.address,
					password: connSettings.password,
				});
				connections[name] = connection;
			}
			return connections[name];
		},
		[],
	);

	return (
		<obsContext.Provider
			value={{
				connected,
				getConnection,
			}}
		>
			{children}
		</obsContext.Provider>
	)
}

export const useObsWebsocket = ({
	connection: name
}) => {
	const { connected, getConnection } = React.useContext(obsContext);
	const connection = getConnection(name);

	const obs = connected ? connection.obs : null;

	const send = (requestName, args, onSucceeded, onFailed) => {
		if (obs) {
			obs.sendCallback(requestName, args, (err, data) => {
				if (err) {
					if (onFailed) {
						onFailed(err);
					}
					else {
						console.debug(`Error calling '${requestName}': ${err}`);
					}
				}
				else {
					onSucceeded?.(data);
				}
			});
		}
	}

	const useSceneImage = ({
		scene,
		tileSize,
		refreshTime = 1000,
	}) => {
		const [data, setData] = React.useState();

		React.useEffect(
			() => {
				let timeout;
				if (obs) {
					const updateScreenshot = () => {
						send(
							'TakeSourceScreenshot',
							{
								sourceName: scene,
								embedPictureFormat: 'png',
								width: tileSize*16,
								height: tileSize*9,
							},
							data => {
								if (data?.img) {
									setData(data.img);
									timeout = setTimeout(updateScreenshot, refreshTime);
								}
							},
							err => {
								setData(null);
							}
						);
					};

					updateScreenshot();

				}
	
				return () => {
					if (timeout) {
						clearTimeout(timeout);
					}
				}
			},
			[obs, refreshTime],
		);
	
		return data;
	};

	const useCurrentScene = () => {
		const [data, setData] = React.useState();
	
		React.useEffect(
			() => {
				if (obs) {
					send('GetCurrentScene', {}, data => {
						setData(data.name);
					});
					obs.on('SwitchScenes', data => {
						setData(data.sceneName);
						console.log('switchscenes');
					});
				}
			},
			[obs],
		);
	
		return data;
	};

	const setCurrentScene = ({
		scene
	}) => {
		if (obs) {
			send('SetCurrentScene', {
				'scene-name': scene,
			});
		}
	};

	const useTransition = () => {
		const [data, setData] = React.useState(false);

		React.useEffect(
			() => {
				if (obs) {
					obs.on('TransitionBegin', data => {
						setData(data);
					});
					obs.on('TransitionEnd', () => {
						setData(null);
						console.log('transitionend');
					});
				}
			},
			[obs],
		);

		return data;
	}

	const useStreamStatus = () => {
		const [data, setData] = React.useState();
	
		React.useEffect(
			() => {
				if (obs) {
					obs.on('StreamStatus', data => {
						setData(data);
					});
				}
			},
			[obs],
		);
	
		return data;
	};

	const useIsStreaming = () => {
		const [data, setData] = React.useState();
	
		React.useEffect(
			() => {
				if (obs) {
					send('GetStreamingStatus', {}, data => {
						setData(data.streaming ? 'started' : 'stopped');
					});
					obs.on('StreamStarting', () => {
						setData('starting');
					});
					obs.on('StreamStarted', () => {
						setData('started');
					});
					obs.on('StreamStopping', () => {
						setData('stopping');
					});
					obs.on('StreamStopped', () => {
						setData('stopped');
					});
				}
			},
			[obs],
		);

		return {
			isStarted: data === 'started',
			isStopped: data === 'stopped',
			isStarting: data === 'starting',
			isStopping: data === 'stopping',
			isLoading: !data,
		};
	};

	const startStreaming = () => {
		send('StartStreaming');
	};

	const stopStreaming = () => {
		send('StopStreaming');
	};

	const startStopStreaming = () => {
		send('StartStopStreaming');
	};

	const useIsRecording = () => {
		const [data, setData] = React.useState();
	
		React.useEffect(
			() => {
				if (obs) {
					send('GetStreamingStatus', {}, data => {
						setData(data.recording ? 'started' : 'stopped');
					});
					obs.on('RecordingStarting', () => {
						setData('starting');
					});
					obs.on('RecordingStarted', () => {
						setData('started');
					});
					obs.on('RecordingStopping', () => {
						setData('stopping');
					});
					obs.on('RecordingStopped', () => {
						setData('stopped');
					});
				}
			},
			[obs],
		);

		return {
			isStarted: data === 'started',
			isStopped: data === 'stopped',
			isStarting: data === 'starting',
			isStopping: data === 'stopping',
			isLoading: !data,
		};
	};

	const useStats = ({
		refreshTime = 1000,
	} = {}) => {
		const [data, setData] = React.useState();
	
		React.useEffect(
			() => {
				if (obs) {
					let timeout;
					const getStats = () => {
						send('GetStats', {}, data => {
							setData(data.stats);
							timeout = setTimeout(getStats, refreshTime);
						});
					};

					getStats();

					return () => {
						if (timeout) {
							clearTimeout(timeout);
						}
					};
				}
			},
			[obs],
		);

		return data;
	}

	const startRecording = () => {
		send('StartRecording');
	};

	const stopRecording = () => {
		send('StopRecording');
	};

	const startStopRecording = () => {
		send('StartStopRecording');
	};

	return {
		useSceneImage,
		useCurrentScene,
		setCurrentScene,
		useTransition,
		useStreamStatus,
		useIsStreaming,
		startStreaming,
		stopStreaming,
		startStopStreaming,
		useIsRecording,
		startRecording,
		stopRecording,
		startStopRecording,
		useStats,
	};
}
