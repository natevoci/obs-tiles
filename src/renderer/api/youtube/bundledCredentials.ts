/**
 * Bundled OAuth client credentials, injected at build time via Vite env vars.
 *
 * For production builds these come from repository secrets:
 *   VITE_YOUTUBE_CLIENT_ID / VITE_YOUTUBE_CLIENT_SECRET
 *
 * For local development, create a `.env.local` file at the project root
 * (see `.env.local.example` — the file is gitignored).
 *
 * When neither is set (e.g. a local build without .env.local), both values are
 * empty strings and `hasBundledCredentials` is false — the Settings panel then
 * requires the user to supply their own GCP credentials.
 */

export const BUNDLED_CLIENT_ID: string = import.meta.env.VITE_YOUTUBE_CLIENT_ID ?? ''
export const BUNDLED_CLIENT_SECRET: string = import.meta.env.VITE_YOUTUBE_CLIENT_SECRET ?? ''

/** True when bundled credentials were injected at build time. */
export const hasBundledCredentials: boolean = Boolean(BUNDLED_CLIENT_ID && BUNDLED_CLIENT_SECRET)
