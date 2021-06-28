import * as React from 'react';
import OBSWebSocket from 'obs-websocket-js';

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
					throw new Error(`Missing connection information for {name}`);
				}

				const connection = {};
				connection.instance = new OBSWebSocket();
				connection.public = {};
				connection.public.name = name;
				connection.public.connected = false;
				connection.public.failed = false;
				connection.public.failedConnection = false;
				
				connection.instance.on('error', (err) => {
					console.error(`error for connection '${name}'`, err);
					connection.public.failed = err;
				});

				const connect = () => {
					const password = window.localStorage.getItem(`password-${connSettings.address}`);
					connection.instance.connect({
						address: connSettings.address,
						password: password || '',
					}).then(() => {
						console.log('connected');
						connection.public.connected = true;
						forceUpdate({});
					}).catch(err => {
						if (err.error === 'Authentication Failed.') {
							const password = prompt(`Please enter the password for ${connSettings.address}:`);
							if (password !== null) {
								window.localStorage.setItem(`password-${connSettings.address}`, password);
								connect();
							}
						}
						console.error(`Error connecting to '${name}' connection:`, err.error);
						connection.public.failedConnection = err.error;
						forceUpdate();
					});
				}
				connect();

				connection.public.send = (requestName, args, onSucceeded, onFailed) => {
					if (connection.instance) {
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
				}

				connection.public.on = (...args) => {
					connection.instance.on(...args);
				};

				connection.providers = {};

				connection.public.useDataProvider = (name, args) => {
					const providerId = JSON.stringify({name, args, connected: connection.public.connected});
					let provider = connection.providers[providerId];

					if (typeof args?.enabled === 'undefined' || Boolean(args?.enabled)) {
						if (!provider && connection.public.connected) {
							const factory = factories[name];
							if (!factory) {
								console.error(`obs provider named '${name}' not found.`);
								return undefined;
							}
							provider = factory(connection.public, args);
							connection.providers[providerId] = provider;
						}
					}

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
						[provider],
					);

					return provider?.value;
				};

				connection.public.action = (name, args) => {
					const factory = actions[name];
					if (!factory) {
						console.error(`obs action named '${name}' not found.`);
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
		[],
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
