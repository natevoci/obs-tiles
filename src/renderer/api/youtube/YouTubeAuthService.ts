/**
 * YouTubeAuthService
 *
 * Handles OAuth 2.0 Authorization Code + PKCE flow for YouTube Data API v3.
 * Electron mode: opens system browser + listens via IPC for the redirect code.
 * Web mode: not supported (manual key entry only).
 */

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl'

// ---------------------------------------------------------------------------
// PKCE helpers (uses Web Crypto API — available in renderer)
// ---------------------------------------------------------------------------

function generateCodeVerifier(): string {
	const array = new Uint8Array(64)
	crypto.getRandomValues(array)
	return base64urlEncode(array)
}

async function generateCodeChallenge(verifier: string): Promise<string> {
	const encoded = new TextEncoder().encode(verifier)
	const digest = await crypto.subtle.digest('SHA-256', encoded)
	return base64urlEncode(new Uint8Array(digest))
}

function base64urlEncode(buffer: Uint8Array): string {
	let str = ''
	buffer.forEach((b) => { str += String.fromCharCode(b) })
	return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface YouTubeTokens {
	accessToken: string
	expiresAt: number   // epoch ms
	refreshToken?: string
}

// ---------------------------------------------------------------------------
// YouTubeAuthService
// ---------------------------------------------------------------------------

export class YouTubeAuthService {
	private clientId: string
	private clientSecret: string
	private tokens: YouTubeTokens | null = null

	constructor(clientId: string, clientSecret: string, storedRefreshToken?: string) {
		this.clientId = clientId
		this.clientSecret = clientSecret
		if (storedRefreshToken) {
			// Pre-seed with the stored refresh token; access token will be fetched on first use
			this.tokens = { accessToken: '', expiresAt: 0, refreshToken: storedRefreshToken }
		}
	}

	get isAuthenticated(): boolean {
		return Boolean(this.tokens?.refreshToken)
	}

	get refreshToken(): string | undefined {
		return this.tokens?.refreshToken
	}

	/**
	 * Returns a valid access token, refreshing it silently if expired.
	 * Throws if not authenticated.
	 */
	async getAccessToken(): Promise<string> {
		if (!this.tokens?.refreshToken) {
			throw new Error('Not authenticated — call startOAuthFlow() first')
		}

		const now = Date.now()
		// Refresh if expired or expiring within 60 seconds
		if (!this.tokens.accessToken || this.tokens.expiresAt - now < 60_000) {
			await this._refreshAccessToken()
		}

		return this.tokens!.accessToken
	}

	/**
	 * Starts the PKCE OAuth flow (Electron only).
	 * Opens the system browser and waits for the redirect code via IPC.
	 * Returns the refresh token (caller should persist it in settings).
	 */
	async startOAuthFlow(): Promise<string> {
		if (!window.ipcRenderer) {
			throw new Error('OAuth flow is only supported in Electron mode')
		}

		const codeVerifier = generateCodeVerifier()
		const codeChallenge = await generateCodeChallenge(codeVerifier)

		// Ask the main process to start a local HTTP server and return the port
		const { port } = await window.ipcRenderer.youtubeOAuthStart()

		const params = new URLSearchParams({
			client_id: this.clientId,
			redirect_uri: `http://localhost:${port}`,
			response_type: 'code',
			scope: SCOPE,
			code_challenge: codeChallenge,
			code_challenge_method: 'S256',
			access_type: 'offline',
			prompt: 'consent',
		})

		const authUrl = `${AUTH_ENDPOINT}?${params.toString()}`

		// Open the browser — shell.openExternal is called in the main process
		window.ipcRenderer.youtubeOpenBrowser(authUrl)

		// Wait for main process to receive the redirect and forward the code
		const { code, error } = await window.ipcRenderer.youtubeOAuthResult()
		if (error || !code) {
			throw new Error(error ?? 'OAuth flow did not return a code')
		}

		// Exchange code for tokens in the renderer (keeps client_secret in renderer)
		const tokens = await this._exchangeCode(code, codeVerifier, `http://localhost:${port}`)
		this.tokens = tokens

		return tokens.refreshToken!
	}

	/**
	 * Clear stored tokens (sign out).
	 */
	clearTokens(): void {
		this.tokens = null
	}

	// ---------------------------------------------------------------------------
	// Private
	// ---------------------------------------------------------------------------

	private async _exchangeCode(
		code: string,
		codeVerifier: string,
		redirectUri: string,
	): Promise<YouTubeTokens> {
		const body = new URLSearchParams({
			code,
			client_id: this.clientId,
			client_secret: this.clientSecret,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code',
			code_verifier: codeVerifier,
		})

		const resp = await fetch(TOKEN_ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: body.toString(),
		})

		if (!resp.ok) {
			const text = await resp.text()
			throw new Error(`Token exchange failed: ${resp.status} ${text}`)
		}

		const json = await resp.json()
		return {
			accessToken: json.access_token,
			expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
			refreshToken: json.refresh_token,
		}
	}

	private async _refreshAccessToken(): Promise<void> {
		if (!this.tokens?.refreshToken) throw new Error('No refresh token available')

		const body = new URLSearchParams({
			client_id: this.clientId,
			client_secret: this.clientSecret,
			refresh_token: this.tokens.refreshToken,
			grant_type: 'refresh_token',
		})

		const resp = await fetch(TOKEN_ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: body.toString(),
		})

		if (!resp.ok) {
			const text = await resp.text()
			// 400 invalid_grant means refresh token was revoked
			if (resp.status === 400) {
				this.tokens = null
				throw new Error('Refresh token revoked — re-authentication required')
			}
			throw new Error(`Token refresh failed: ${resp.status} ${text}`)
		}

		const json = await resp.json()
		this.tokens = {
			...this.tokens!,
			accessToken: json.access_token,
			expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
			// Google may return a new refresh token; keep the old one if not
			refreshToken: json.refresh_token ?? this.tokens!.refreshToken,
		}
	}
}
