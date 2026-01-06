/**
 * OBS WebSocket 4.9.1 Authentication
 * Implements SHA256-based authentication as per the OBS protocol specification
 */

/**
 * Generate SHA256 hash and return as base64
 * @param {string} data - Data to hash
 * @returns {Promise<string>} Base64 encoded SHA256 hash
 */
async function sha256Base64(data: string): Promise<string> {
	const encoder = new TextEncoder()
	const dataBuffer = encoder.encode(data)
	const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	const hashBase64 = btoa(String.fromCharCode.apply(null, hashArray as unknown as any))
	return hashBase64
}

/**
 * Generate authentication response for OBS WebSocket 4.9.1
 * 
 * Process:
 * 1. Concatenate password + server salt
 * 2. SHA256 hash and base64 encode -> base64_secret
 * 3. Concatenate base64_secret + challenge
 * 4. SHA256 hash and base64 encode -> auth_response
 * 
 * @param {string} password - User's OBS password
 * @param {string} challenge - Challenge from server's Hello message
 * @param {string} salt - Salt from server's Hello message
 * @returns {Promise<string>} Base64 encoded authentication response
 */
export async function getAuthResponse(password: string, challenge: string, salt: string): Promise<string> {
	try {
		// Step 1: Create secret_string = password + salt
		const secretString = password + salt

		// Step 2: Hash and encode to get base64_secret
		const secretHash = await sha256Base64(secretString)

		// Step 3: Create auth_response_string = base64_secret + challenge
		const authResponseString = secretHash + challenge

		// Step 4: Hash and encode to get final auth_response
		const authResponse = await sha256Base64(authResponseString)

		return authResponse
	} catch (error) {
		throw new Error(`Failed to generate auth response: ${error instanceof Error ? error.message : String(error)}`)
	}
}

export default getAuthResponse
