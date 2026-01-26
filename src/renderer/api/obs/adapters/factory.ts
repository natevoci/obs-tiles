/**
 * OBS WebSocket Adapter Factory
 * 
 * Creates the appropriate adapter (v4 or v5) based on auto-detection or configuration.
 * Auto-detection works by checking the first message from the server:
 * - v5 servers send an OpCode 0 (Hello) message immediately
 * - v4 servers wait for a request (like GetAuthRequired)
 */

import { OBSAdapter, OBSAdapterVersion, AdapterConnectionOptions } from '../abstraction/adapter'
import { V4Adapter } from './v4-adapter'
import { V5Adapter } from './v5-adapter'

/**
 * Timeout for version detection (ms)
 * If no Hello message is received within this time, assume v4
 */
const VERSION_DETECTION_TIMEOUT = 2000

window.addEventListener("beforeunload", function() {
	// pause the deugger to prevent indefinite reloads if vite HMR is enabled.
	debugger;
}, false)

/**
 * Create an OBS WebSocket adapter with auto-detection or forced version
 */
export async function createAdapter(options: AdapterConnectionOptions): Promise<OBSAdapter> {
	const { address, password, forceVersion = 'auto', subscribeVolumeMeters = false } = options

	if (forceVersion === 4) {
		return createV4Adapter(address, password)
	}

	if (forceVersion === 5) {
		return createV5Adapter(address, password, subscribeVolumeMeters)
	}

	// Auto-detect version
	return detectAndCreateAdapter(address, password, subscribeVolumeMeters)
}

async function createV4Adapter(address: string, password?: string): Promise<OBSAdapter> {
	const adapter = new V4Adapter()
	await adapter.connect(address, password)
	return adapter
}

async function createV5Adapter(address: string, password?: string, subscribeVolumeMeters: boolean = false): Promise<OBSAdapter> {
	const adapter = new V5Adapter()
	await adapter.connect(address, password, { subscribeVolumeMeters })
	return adapter
}

/**
 * Auto-detect the OBS WebSocket version by checking the first message
 */
async function detectAndCreateAdapter(address: string, password?: string, subscribeVolumeMeters: boolean = false): Promise<OBSAdapter> {
	return new Promise((resolve, reject) => {
		const wsUrl = `ws://${address}`
		let socket: WebSocket | null = null
		let resolved = false

		const cleanup = () => {
			if (socket && socket.readyState === WebSocket.OPEN) {
				socket.close()
			}
		}

		const resolveWithVersion = async (version: OBSAdapterVersion) => {
			if (resolved) return
			resolved = true
			cleanup()

			try {
				if (version === 5) {
					resolve(await createV5Adapter(address, password, subscribeVolumeMeters))
				} else {
					resolve(await createV4Adapter(address, password))
				}
			} catch (err) {
				reject(err)
			}
		}

		try {
			socket = new WebSocket(wsUrl)

			// Set timeout for version detection
			const timeout = setTimeout(() => {
				if (!resolved) {
					// No Hello received, assume v4
					console.log('[obs-adapter] No Hello message received, assuming v4')
					resolveWithVersion(4)
				}
			}, VERSION_DETECTION_TIMEOUT)

			socket.onopen = () => {
				// Connection opened, now wait for Hello (v5) or timeout (v4)
			}

			socket.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data)
					
					// v5 sends OpCode 0 (Hello) immediately
					if (message.op === 0) {
						clearTimeout(timeout)
						console.log('[obs-adapter] Received Hello message, detected v5')
						resolveWithVersion(5)
						return
					}

					// Any other message at this point is unexpected
					// but treat as v4 to be safe
					clearTimeout(timeout)
					console.log('[obs-adapter] Received unexpected message, assuming v4')
					resolveWithVersion(4)
				} catch {
					// Parse error, treat as v4
					clearTimeout(timeout)
					resolveWithVersion(4)
				}
			}

			socket.onerror = () => {
				if (!resolved) {
					resolved = true
					clearTimeout(timeout)
					reject(new Error('WebSocket connection failed'))
				}
			}

			socket.onclose = () => {
				if (!resolved) {
					resolved = true
					clearTimeout(timeout)
					reject(new Error('WebSocket connection closed during version detection'))
				}
			}
		} catch (error) {
			reject(error)
		}
	})
}

/**
 * Detect OBS WebSocket version without fully connecting
 * Useful for checking version before committing to a connection
 */
export async function detectVersion(address: string): Promise<OBSAdapterVersion> {
	return new Promise((resolve, reject) => {
		const wsUrl = `ws://${address}`
		let socket: WebSocket | null = null
		let resolved = false

		const cleanup = () => {
			if (socket) {
				socket.close()
			}
		}

		try {
			socket = new WebSocket(wsUrl)

			const timeout = setTimeout(() => {
				if (!resolved) {
					resolved = true
					cleanup()
					// No Hello received, assume v4
					resolve(4)
				}
			}, VERSION_DETECTION_TIMEOUT)

			socket.onmessage = (event) => {
				if (resolved) return
				
				try {
					const message = JSON.parse(event.data)
					if (message.op === 0) {
						resolved = true
						clearTimeout(timeout)
						cleanup()
						resolve(5)
					}
				} catch {
					// Ignore parse errors
				}
			}

			socket.onerror = () => {
				if (!resolved) {
					resolved = true
					clearTimeout(timeout)
					reject(new Error('Connection failed'))
				}
			}
		} catch (error) {
			reject(error)
		}
	})
}
