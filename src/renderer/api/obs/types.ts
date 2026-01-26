import { OBSAdapter, OBSAdapterVersion } from './abstraction/adapter'

export interface ConnectionPublic {
	name: string
	connected: boolean
	connecting: boolean
	failed: any
	failedConnection: string | boolean
	/** The detected or configured API version (4 or 5) */
	apiVersion?: OBSAdapterVersion
	disconnect: () => void
	reconnect: () => void
	useDataProvider: (name: string, args?: any) => any
	action: (name: string, args?: any) => void
	/** The underlying adapter for direct access to typed methods */
	adapter?: OBSAdapter
}
