import * as React from 'react';
import OBSWebSocket from 'obs-websocket-js';

import { useSettings } from '~/components/Settings/SettingsContext';

const obsContext = React.createContext({});

export const OBSWebsocketProvider = ({ children }) => {
	const { current: connections } = React.useRef({});
	const { settings } = useSettings();

	return (
		<obsContext.Provider
			value={{
				getConnection: (name) => {
					if (!connections[name]) {
						const connSettings = settings.connections[name];
						if (!connSettings) {
							throw new Error(`Missing connection information for {name}`);
						}

						const connection = {};
						connection.name = name;
						connection.obs = new OBSWebSocket();
						connection.connected = false;
						connection.failed = false;
						
						connection.obs.on('AuthenticationSuccess', () => {
							connection.connected = true;
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
			}}
		>
			{children}
		</obsContext.Provider>
	)
}

export const useObsWebsocket = ({
	connection: name
}) => {
	const { getConnection } = React.useContext(obsContext);
	const connection = getConnection(name);
	const [connected, setConnected] = React.useState(connection.connected);

	React.useEffect(
		() => {
			connection.obs.on('AuthenticationSuccess', () => {
				setConnected(true);
			});
		},
		[]
	);

	const obs = connected ? connection.obs : null;

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
						return obs.send('TakeSourceScreenshot', {
							sourceName: scene,
							embedPictureFormat: 'png',
							width: tileSize*16,
							height: tileSize*9,
						}).then(data => {
							if (data?.img) {
								setData(data.img);
								timeout = setTimeout(updateScreenshot, refreshTime);
							}
						}).catch((err) => {
							setData(null);
							throw err;
						});
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
					obs.send('GetCurrentScene').then(data => {
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
			obs.send('SetCurrentScene', {
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
					obs.send('GetStreamingStatus').then(data => {
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
		obs?.send?.('StartStreaming');
	};

	const stopStreaming = () => {
		obs?.send?.('StopStreaming');
	};

	const startStopStreaming = () => {
		obs?.send?.('StartStopStreaming');
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
	};
}
