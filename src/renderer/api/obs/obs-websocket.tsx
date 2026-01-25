import * as React from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@material-ui/core'

import { useSettings } from '~/components/Settings/SettingsContext'
import { useForceUpdate } from '~/hooks'

import * as factories from './providers'
import * as actions from './actions'
import { ConnectionPublic } from './types'
import { OBSAdapter, OBSAdapterVersion } from './abstraction/adapter'
import { createAdapter } from './adapters'

interface PasswordPromptState {
	open: boolean
	address: string
	resolve: ((password: string | null) => void) | null
}

interface Connection {
	adapter: OBSAdapter | null
	shouldBeConnected: boolean
	public: ConnectionPublic
	providers: Record<string, any>
}

const obsContext = React.createContext<{ getConnection: (name: string) => Connection | null }>({ getConnection: () => null })

interface OBSWebsocketProviderProps {
	children: React.ReactNode
}

export const OBSWebsocketProvider = ({ children }: OBSWebsocketProviderProps) => {
	const connectionsRef = React.useRef<Record<string, Connection>>({})
	const { settings } = useSettings()
	const forceUpdate = useForceUpdate()
	
	// Track settings to detect changes and reconnect
	const prevSettingsRef = React.useRef<string>('')
	
	React.useEffect(() => {
		const settingsKey = JSON.stringify(settings)
		
		// Skip if this is the initial mount or settings haven't changed
		if (prevSettingsRef.current === '' || prevSettingsRef.current === settingsKey) {
			prevSettingsRef.current = settingsKey
			return
		}
		
		prevSettingsRef.current = settingsKey
		
		// Settings changed - disconnect all existing connections and clear cache
		console.log('[obs-websocket] Settings changed, reconnecting...')
		const connections = connectionsRef.current
		for (const name of Object.keys(connections)) {
			const connection = connections[name]
			if (connection.adapter) {
				connection.shouldBeConnected = false
				connection.adapter.disconnect()
			}
		}
		// Clear the connections cache so they get recreated with new settings
		connectionsRef.current = {}
		forceUpdate()
	}, [settings, forceUpdate])

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
			const connections = connectionsRef.current
			if (!connections[connectionName]) {
				const connSettings = settings.connections[connectionName]
				if (!connSettings) {
					throw new Error(`Missing connection information for '${connectionName}'. Available connections (${Object.keys(settings.connections).join(', ')})`)
				}

				const connection: Connection = {
					adapter: null,
					shouldBeConnected: false,
					public: {
						name: connectionName,
						connected: false,
						connecting: false,
						failed: false,
						failedConnection: false,
						apiVersion: undefined,
						disconnect: () => {},
						reconnect: () => {},
						send: () => {},
						on: () => {},
						useDataProvider: () => undefined,
						action: () => {},
						adapter: undefined,
					},
					providers: {},
				}

				const connect = async () => {
					connection.shouldBeConnected = true
					connection.public.connecting = true
					connection.public.failed = false
					connection.public.failedConnection = false
					forceUpdate()

					const password = window.localStorage.getItem(`password-${connSettings.address}`)
					
					// Determine API version from config
					const apiVersionConfig = connSettings.apiVersion || 'auto'
					let forceVersion: OBSAdapterVersion | 'auto' = 'auto'
					if (apiVersionConfig === 'v4') forceVersion = 4
					else if (apiVersionConfig === 'v5') forceVersion = 5

					try {
						const adapter = await createAdapter({
							address: connSettings.address,
							password: password || undefined,
							forceVersion,
						})

						connection.adapter = adapter
						connection.public.adapter = adapter
						connection.public.connected = true
						connection.public.apiVersion = adapter.version
						console.log(`[obs-websocket] Connected to ${connectionName} using v${adapter.version} API`)

						// Set up reconnection on disconnect
						adapter.on('ConnectionClosed', () => {
							console.log(`[obs-websocket] Connection closed for ${connectionName}`)
							connection.public.connected = false
							connection.public.adapter = undefined
							connection.adapter = null
							forceUpdate()

							setTimeout(() => {
								if (!connection.public.connected && connection.shouldBeConnected) {
									connect()
								}
							}, 5000)
						})

						adapter.on('ConnectionError', (err: any) => {
							console.error(`[obs-websocket] Error for ${connectionName}:`, err)
							connection.public.failed = err
						})

					} catch (err: any) {
						connection.public.connected = false
						
						// Check for authentication failure
						// v4: error contains 'Authentication Failed'
						// v5: WebSocket closes with code 4009 and reason 'Authentication failed.'
						const errorMsg = err?.error || err?.message || String(err)
						const isAuthError = 
							errorMsg.toLowerCase().includes('authentication failed') || 
							err?.code === 401 || 
							err?.code === 4009
						
						if (isAuthError) {
							const newPassword = await promptForPassword(connSettings.address)
							if (newPassword !== null) {
								window.localStorage.setItem(`password-${connSettings.address}`, newPassword)
								connect()
								return
							}
						}
						
						console.error(`[obs-websocket] Error connecting to '${connectionName}':`, errorMsg)
						connection.public.failedConnection = errorMsg
					} finally {
						connection.public.connecting = false
						forceUpdate()
					}
				}

				window.setTimeout(() => connect(), 0)

				connection.public.disconnect = () => {
					connection.shouldBeConnected = false
					if (connection.adapter) {
						connection.adapter.disconnect()
					}
					connection.adapter = null
					connection.public.adapter = undefined
					connection.public.connected = false
				}

				connection.public.reconnect = () => {
					connect()
				}

				// Legacy send method for backward compatibility
				connection.public.send = (requestName, args, onSucceeded, onFailed) => {
					if (connection.adapter) {
						connection.adapter.sendRaw(requestName, args)
							.then((data) => onSucceeded?.(data))
							.catch((err) => {
								if (onFailed) {
									onFailed(err)
								} else {
									console.debug(`Error calling '${requestName}'`, err)
								}
							})
					}
				}

				connection.public.on = (event: string, listener: Function) => {
					if (connection.adapter) {
						connection.adapter.on(event, listener as any)
					}
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
