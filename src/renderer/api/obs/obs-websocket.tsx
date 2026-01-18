import * as React from 'react'
import OBSWebSocketClient from './websocket-client'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@material-ui/core'

import { useSettings } from '~/components/Settings/SettingsContext'
import { useForceUpdate } from '~/hooks'

import * as factories from './providers'
import * as actions from './actions'

interface PasswordPromptState {
	open: boolean
	address: string
	resolve: ((password: string | null) => void) | null
}

interface ConnectionPublic {
	name: string
	connected: boolean
	connecting: boolean
	failed: any
	failedConnection: string | boolean
	disconnect: () => void
	reconnect: () => void
	send: (requestName: string, args?: any, onSucceeded?: Function, onFailed?: Function) => void
	on: (event: string, listener: Function) => void
	useDataProvider: (name: string, args?: any) => any
	action: (name: string, args?: any) => void
}

interface Connection {
	instance: OBSWebSocketClient
	shouldBeConnected: boolean
	public: ConnectionPublic
	providers: Record<string, any>
}

const obsContext = React.createContext<{ getConnection: (name: string) => Connection | null }>({ getConnection: () => null })

interface OBSWebsocketProviderProps {
	children: React.ReactNode
}

export const OBSWebsocketProvider = ({ children }: OBSWebsocketProviderProps) => {
	const { current: connections } = React.useRef<Record<string, Connection>>({})
	const { settings } = useSettings()
	const forceUpdate = useForceUpdate()

	// Password prompt state
	const [passwordPrompt, setPasswordPrompt] = React.useState<PasswordPromptState>({
		open: false,
		address: '',
		resolve: null,
	})
	const [passwordInput, setPasswordInput] = React.useState('')

	const promptForPassword = (address: string): Promise<string | null> => {
		return new Promise((resolve) => {
			setPasswordInput('')
			setPasswordPrompt({ open: true, address, resolve })
		})
	}

	const handlePasswordSubmit = () => {
		passwordPrompt.resolve?.(passwordInput)
		setPasswordPrompt({ open: false, address: '', resolve: null })
	}

	const handlePasswordCancel = () => {
		passwordPrompt.resolve?.(null)
		setPasswordPrompt({ open: false, address: '', resolve: null })
	}

	const getConnection = React.useCallback(
		(connectionName: string): Connection => {
			if (!connections[connectionName]) {
				const connSettings = settings.connections[connectionName]
				if (!connSettings) {
					throw new Error(`Missing connection information for '${connectionName}'. Available connections (${Object.keys(settings.connections).join(', ')})`)
				}

				const connection: Connection = {
					instance: new OBSWebSocketClient(),
					shouldBeConnected: false,
					public: {
						name: connectionName,
						connected: false,
						connecting: false,
						failed: false,
						failedConnection: false,
						disconnect: () => {},
						reconnect: () => {},
						send: () => {},
						on: () => {},
						useDataProvider: () => undefined,
						action: () => {},
					},
					providers: {},
				}
				
				connection.instance.on('error', (err: any) => {
					console.error(`error for connection '${connectionName}'`, err)
					connection.public.failed = err
				})

				connection.instance.on('ConnectionClosed', () => {
					console.log(`Connection closed`)
					connection.public.connected = false
					forceUpdate()

					setTimeout(
						() => {
							if (!connection.public.connected && connection.shouldBeConnected) {
								connect()
							}
						},
						50000
					)
				})

				const connect = () => {
					connection.shouldBeConnected = true
					connection.public.connecting = true
					forceUpdate()

					const password = window.localStorage.getItem(`password-${connSettings.address}`)
					connection.instance.connect({
						address: connSettings.address,
						password: password || '',
					}).then(() => {
						connection.public.connected = true
					}).catch(async (err) => {
						connection.public.connected = false
						if (err.error === 'Authentication Failed.') {
							const password = await promptForPassword(connSettings.address)
							if (password !== null) {
								window.localStorage.setItem(`password-${connSettings.address}`, password)
								connect()
								return
							}
						}
						console.error(`Error connecting to '${connectionName}' connection:`, err.error)
						connection.public.failedConnection = err.error
					}).then(() => {
						connection.public.connecting = false
						forceUpdate()
					})
				}

				window.setTimeout(
					() => {
						connect()
					},
					0,
				)

				connection.public.disconnect = () => {
					connection.shouldBeConnected = false
					connection.instance.disconnect()
					connection.public.connected = false
				}

				connection.public.reconnect = () => {
					connect()
				}

				connection.public.send = (requestName, args, onSucceeded, onFailed) => {
					if (connection.instance) {
						connection.instance.sendCallback(requestName, args, (err: any, data: any) => {
							if (err) {
								if (onFailed) {
									onFailed(err)
								}
								else {
									console.debug(`Error calling '${requestName}'`, err, connection)
								}
							}
							else {
								onSucceeded?.(data)
							}
						})
					}
				}

				connection.public.on = (...args: any[]) => {
					(connection.instance.on as any)(...args)
				}

				const useDataProvider = (name: string, args?: any) => {
					const providerId = JSON.stringify({name, args, connected: connection.public.connected})
					let provider = connection.providers[providerId]

					const componentForceUpdate = useForceUpdate()
					
					React.useEffect(
						() => {
							if (provider) {
								provider.attach(componentForceUpdate)
	
								return () => {
									provider.detach(componentForceUpdate)
								}
							}
						},
						[provider, connection.public.connected],
					)

					if (typeof args?.enabled === 'undefined' || Boolean(args?.enabled)) {
						if (!provider && connection.public.connected) {
							const factory = factories[name as keyof typeof factories] as any
							if (!factory) {
								console.error(`obs provider named '${name}' not found. Available providers (${Object.keys(factories).join(', ')})`)
								return undefined
							}
							provider = factory(connection.public, args)
							connection.providers[providerId] = provider
						}
					}

					return provider?.value
				}
				connection.public.useDataProvider = useDataProvider

				connection.public.action = (name, args) => {
					const factory = actions[name as keyof typeof actions] as any
					if (!factory) {
						console.error(`obs action named '${name}' not found. Available actions (${Object.keys(actions).join(', ')})`)
					}
					const action = factory(connection.public)
					if (action) {
						action(args)
					}
				}

				connections[connectionName] = connection
			}
			return connections[connectionName]
		},
		[settings?.connections],
	)

	return (
		<obsContext.Provider
			value={{
				getConnection,
			}}
		>
			{children}
			<Dialog open={passwordPrompt.open} onClose={handlePasswordCancel}>
				<DialogTitle>Password Required</DialogTitle>
				<DialogContent>
					<p style={{ marginBottom: 16 }}>Enter password for {passwordPrompt.address}:</p>
					<TextField
						autoFocus
						variant="outlined"
						label="Password"
						type="password"
						fullWidth
						value={passwordInput}
						onChange={(e) => setPasswordInput(e.target.value)}
						onKeyPress={(e) => {
							if (e.key === 'Enter') {
								handlePasswordSubmit()
							}
						}}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={handlePasswordCancel}>Cancel</Button>
					<Button onClick={handlePasswordSubmit} color="primary">
						Connect
					</Button>
				</DialogActions>
			</Dialog>
		</obsContext.Provider>
	)
}

export const useObs = ({
	connection: name
}: { connection?: string }): ConnectionPublic => {
	const { getConnection } = React.useContext(obsContext)
	const connection = getConnection(name || 'main')

	return connection?.public as ConnectionPublic
}
