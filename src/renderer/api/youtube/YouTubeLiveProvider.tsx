/**
 * YouTubeLiveProvider
 *
 * Mounts a single shared useYouTubeLive instance for the app.
 * All YouTubeLiveTile components and keyboard shortcuts consume the same
 * state machine, auth service, and polling loop via useYouTubeLiveContext().
 *
 * Must be rendered inside <OBSWebsocketProvider> and <SettingsProvider>.
 */

import React from 'react'
import { useObs } from '~/api/obs'
import { useSettings } from '~/components/Settings/SettingsContext'
import { useYouTubeLive } from './useYouTubeLive'
import type { YouTubeLiveHook } from './useYouTubeLive'
import type { ConnectionPublic } from '../obs/types'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface YouTubeLiveContextValue {
	yt: YouTubeLiveHook
	obs: ConnectionPublic
}

const YouTubeLiveContext = React.createContext<YouTubeLiveContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const YouTubeLiveProvider = ({ children }: { children: React.ReactNode }) => {
	const { settings, currentConfig } = useSettings()
	// Use the OBS connection configured in YouTube settings, falling back to
	// the active config's default connection.
	const obsConnectionName = settings.youtube?.obsConnection ?? currentConfig.connection
	const obs = useObs({ connection: obsConnectionName })
	const yt = useYouTubeLive(obs, settings.youtube)

	return (
		<YouTubeLiveContext.Provider value={{ yt, obs }}>
			{children}
		</YouTubeLiveContext.Provider>
	)
}

// ---------------------------------------------------------------------------
// Consumer hook
// ---------------------------------------------------------------------------

export function useYouTubeLiveContext(): YouTubeLiveContextValue {
	const ctx = React.useContext(YouTubeLiveContext)
	if (!ctx) throw new Error('useYouTubeLiveContext must be used within YouTubeLiveProvider')
	return ctx
}
