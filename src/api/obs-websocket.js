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
	connectionName: name
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
	}) => {
		const [imageData, setImageData] = React.useState();

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
								setImageData(data.img);
								timeout = setTimeout(updateScreenshot, 200);
							}
						}).catch((err) => {
							setImageData(null);
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
			[obs],
		);
	
		return imageData;
	};

	const useCurrentScene = () => {
		const [currentScene, setCurrentScene] = React.useState();
	
		React.useEffect(
			() => {
				if (obs) {
					obs.send('GetCurrentScene').then(data => {
						setCurrentScene(data.name);
					});
					obs.on('SwitchScenes', data => {
						setCurrentScene(data.sceneName);
						console.log('switchscenes');
					});
				}
			},
			[obs],
		);
	
		return currentScene;
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
		const [transitionData, setTransitionData] = React.useState(false);

		React.useEffect(
			() => {
				if (obs) {
					obs.on('TransitionBegin', data => {
						setTransitionData(data);
					});
					obs.on('TransitionEnd', () => {
						setTransitionData(null);
						console.log('transitionend');
					});
				}
			},
			[obs],
		);

		return transitionData;
	}

	return {
		useSceneImage,
		useCurrentScene,
		setCurrentScene,
		useTransition,
	};
}
