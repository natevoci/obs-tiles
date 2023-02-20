import * as React from 'react';
import OBSWebSocket4 from 'obs-websocket-js';
import OBSWebSocket5 from 'obs-websocket-js-5';

import { useSettings } from '~/components/Settings/SettingsContext';
import { useForceUpdate } from '~/hooks';

import * as factories from './providers';
import * as actions from './actions';

const obsContext = React.createContext({});

export const OBSWebsocketProvider = ({ children }) => {
	const { current: connections } = React.useRef({});
	const { settings } = useSettings();
	const forceUpdate = useForceUpdate();

	const getConnection = React.useCallback(
		(name) => {
			if (!connections[name]) {
				const connSettings = settings.connections[name];
				if (!connSettings) {
					throw new Error(`Missing connection information for '${name}'. Available connections (${Object.keys(settings.connections).join(', ')})`);
				}

				const v4 = connSettings.address.endsWith(':4444')

				const connection = {};
				connection.instance = v4 ? new OBSWebSocket4() : new OBSWebSocket5();
				connection.shouldBeConnected = false;
				connection.public = {};
				connection.public.v4 = v4;
				connection.public.name = name;
				connection.public.connected = false;
				connection.public.connecting = false;
				connection.public.failed = false;
				connection.public.failedConnection = false;
				
				const configureInstance = () => {
					connection.instance.on('error', (err) => {
						console.error(`error for connection '${name}'`, err);
						connection.public.failed = err;
					});

					connection.instance.on('ConnectionClosed', () => {
						console.log(`Connection closed`);
						connection.public.connected = false;
						forceUpdate();

						setTimeout(
							() => {
								if (!connection.public.connected && connection.shouldBeConnected) {
									connect();
								}
							},
							50000
						);
					});
				};

				configureInstance();

				const connect = () => {
					connection.shouldBeConnected = true;
					connection.public.connecting = true;
					forceUpdate();

					const password = window.localStorage.getItem(`password-${connSettings.address}`);
					(
						connection.public.v4 ? (
							connection.instance.connect({
								address: connSettings.address,
								password: password || '',
							})
						) : (
							connection.instance.connect(
								`ws://${connSettings.address}`,
								password || '',
							)
						)
					).then(() => {
						connection.public.connected = true;
					}).catch(err => {
						connection.public.connected = false;
						if (
							(connection.public.v4 && err.error === 'Authentication Failed.') ||
							(!connection.public.v4 && err.code === 4009)
						) {
							const password = prompt(`Please enter the password for ${connSettings.address}:`);
							if (password !== null) {
								window.localStorage.setItem(`password-${connSettings.address}`, password);
								connect();
								return;
							}
						}
						console.error(`Error connecting to '${name}' connection:`, err);
						connection.public.failedConnection = err.error;
					}).then(() => {
						connection.public.connecting = false;
						forceUpdate();
					});
				}

				// Start connecting after this render cycle is complete.
				window.setTimeout(
					() => {
						connect();
					},
					0,
				);

				connection.public.disconnect = () => {
					connection.shouldBeConnected = false;
					connection.instance.disconnect();
					connection.public.connected = false;
				}

				connection.public.reconnect = () => {
					connect();
				};

				// See https://github.com/Palakis/obs-websocket/blob/4.9.1/docs/generated/protocol.md#takesourcescreenshot
				// for details of request names and args
				connection.public.send = (requestName, args, onSucceeded, onFailed) => {
					if (connection.instance) {
						if (connection.public.v4) {
							connection.instance.sendCallback(requestName, args, (err, data) => {
								if (err) {
									if (onFailed) {
										onFailed(err);
									}
									else {
										console.debug(`Error calling '${requestName}'`, err, connection);
									}
								}
								else {
									onSucceeded?.(data);
								}
							});
						}
						else {
							connection.instance.call(
								requestName,
								args,
							).then(data => {
								onSucceeded?.(data);
							}).catch(err => {
								if (onFailed) {
									onFailed(err);
								}
								else {
									console.debug(`Error calling '${requestName}'`, requestName, args, err, connection);
								}
							});
						}
					}
				}

				connection.public.on = (...args) => {
					connection.instance.on(...args);
				};

				connection.providers = {};

				const useDataProvider = (name, args) => {
					const providerId = JSON.stringify({name, args, connected: connection.public.connected});
					let provider = connection.providers[providerId];

					const forceUpdate = useForceUpdate();
					
					React.useEffect(
						() => {
							if (provider) {
								provider.attach(forceUpdate);
	
								return () => {
									provider.detach(forceUpdate);
								}
							}
						},
						[provider, connection.public.connected],
					);

					if (typeof args?.enabled === 'undefined' || Boolean(args?.enabled)) {
						if (!provider && connection.public.connected) {
							const factory = factories[name];
							if (!factory) {
								console.error(`obs provider named '${name}' not found. Available providers (${Object.keys(factories).join(', ')})`);
								return undefined;
							}
							provider = factory(connection.public, args);
							connection.providers[providerId] = provider;
						}
					}

					return provider?.value;
				};
				connection.public.useDataProvider = useDataProvider;

				connection.public.action = (name, args) => {
					const factory = actions[name];
					if (!factory) {
						console.error(`obs action named '${name}' not found. Available actions (${Object.keys(actions).join(', ')})`);
					}
					const action = factory(connection.public);
					if (action) {
						action(args);
					}
				};

				connections[name] = connection;
			}
			return connections[name];
		},
		[settings?.connections],
	);

	return (
		<obsContext.Provider
			value={{
				getConnection,
			}}
		>
			{children}
		</obsContext.Provider>
	)
}

export const useObs = ({
	connection: name
}) => {
	const { getConnection } = React.useContext(obsContext);
	const connection = getConnection(name);

	return connection.public;
}
