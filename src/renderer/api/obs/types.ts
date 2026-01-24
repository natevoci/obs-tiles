export interface ConnectionPublic {
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
