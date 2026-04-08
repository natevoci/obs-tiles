/**
 * useYouTubeLive
 *
 * Central React hook for the YouTube Live integration.
 * Manages auth state, broadcast lifecycle, and status polling.
 *
 * Usage:
 *   const yt = useYouTubeLive(obs, youtubeConfig)
 */

import React from 'react'
import { YouTubeAuthService } from './YouTubeAuthService'
import { YouTubeLiveService, YouTubeApiError } from './YouTubeLiveService'
import type { LiveBroadcastInfo, LiveStreamInfo, CreateBroadcastOptions } from './YouTubeLiveService'
import type { YouTubeConfig } from '../../../shared/types'
import type { ConnectionPublic } from '../obs/types'
import { setStreamServiceSettings, startStreaming, stopStreaming } from '../obs/actions/streaming'
import { BUNDLED_CLIENT_ID, BUNDLED_CLIENT_SECRET } from './bundledCredentials'

// Re-export for convenience
export type { LiveBroadcastInfo, LiveStreamInfo, CreateBroadcastOptions }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type YouTubeLivePhase =
  | 'idle'
  | 'checking-existing'
  | 'creating-broadcast'
  | 'configuring-obs'
  | 'starting-stream'
  | 'live'
  | 'stopping'
  | 'error'

export interface YouTubeLiveState {
  phase: YouTubeLivePhase
  isAuthenticated: boolean
  /** Set while live. */
  broadcastId: string | null
  /** Viewer count from polling (null if not yet known). */
  concurrentViewers: number | null
  /** Error message to surface to the UI. */
  error: string | null
  /** Broadcasts found during the pre-flight check (drives ResumeBroadcastDialog). */
  existingBroadcasts: LiveBroadcastInfo[]
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 30_000

export function useYouTubeLive(
  obs: ConnectionPublic | null,
  config: YouTubeConfig | undefined,
): YouTubeLiveHook {
  const [state, setState] = React.useState<YouTubeLiveState>({
    phase: 'idle',
    isAuthenticated: Boolean(config?.refreshToken),
    broadcastId: null,
    concurrentViewers: null,
    error: null,
    existingBroadcasts: [],
  })

  // Stable service instances (recreated when credentials change)
  const authServiceRef = React.useRef<YouTubeAuthService | null>(null)
  const liveServiceRef = React.useRef(new YouTubeLiveService())

  // Keep auth service in sync with credentials
  React.useEffect(() => {
    const clientId = config?.clientId || BUNDLED_CLIENT_ID
    const clientSecret = config?.clientSecret || BUNDLED_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      authServiceRef.current = null
      setState(prev => ({ ...prev, isAuthenticated: false }))
      return
    }
    authServiceRef.current = new YouTubeAuthService(
      clientId,
      clientSecret,
      config?.refreshToken,
    )
    setState(prev => ({ ...prev, isAuthenticated: authServiceRef.current!.isAuthenticated }))
  }, [config?.clientId, config?.clientSecret, config?.refreshToken])

  // ---------------------------------------------------------------------------
  // Status polling while live
  // ---------------------------------------------------------------------------

  React.useEffect(() => {
    if (state.phase !== 'live' || !state.broadcastId) return

    const broadcastId = state.broadcastId
    let cancelled = false

    const poll = async () => {
      const auth = authServiceRef.current
      if (!auth) return
      try {
        const token = await auth.getAccessToken()
        const status = await liveServiceRef.current.getBroadcastStatus(token, broadcastId)
        if (cancelled) return
        setState(prev => ({
          ...prev,
          concurrentViewers: status.concurrentViewers,
          // If YouTube externally ended the broadcast, go back to idle
          phase: status.lifeCycleStatus === 'complete' ? 'idle' : prev.phase,
          broadcastId: status.lifeCycleStatus === 'complete' ? null : prev.broadcastId,
        }))
      } catch (e) {
        // Polling failures are non-fatal — log but don't surface to UI
        console.error('[useYouTubeLive] poll error:', e)
      }
    }

    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [state.phase, state.broadcastId])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const setError = (message: string) =>
    setState(prev => ({ ...prev, phase: 'error', error: message }))

  /**
   * Run the pre-flight check: look for any existing active/testing broadcasts.
   * Returns the list; caller should show ResumeBroadcastDialog if non-empty.
   */
  const checkExistingBroadcasts = React.useCallback(async (): Promise<LiveBroadcastInfo[]> => {
    const auth = authServiceRef.current
    if (!auth) throw new Error('Not authenticated')
    setState(prev => ({ ...prev, phase: 'checking-existing', error: null }))
    try {
      const token = await auth.getAccessToken()
      const list = await liveServiceRef.current.checkForExistingBroadcasts(token)
      setState(prev => ({ ...prev, phase: 'idle', existingBroadcasts: list }))
      return list
    } catch (e: any) {
      setError(_toErrorMessage(e))
      return []
    }
  }, [])

  /**
   * Create a new broadcast + stream, push the key to OBS, and start streaming.
   */
  const goLive = React.useCallback(async (opts: CreateBroadcastOptions) => {
    const auth = authServiceRef.current
    if (!auth) return setError('Not authenticated')
    if (!obs) return setError('OBS is not connected')

    try {
      setState(prev => ({ ...prev, phase: 'creating-broadcast', error: null }))
      const token = await auth.getAccessToken()
      const liveService = liveServiceRef.current

      // 1. Create stream and broadcast in parallel
      const [stream, broadcastId] = await Promise.all([
        liveService.createStream(token, opts.title),
        liveService.createBroadcast(token, opts),
      ])

      // 2. Bind stream to broadcast
      await liveService.bindStream(token, broadcastId, stream.streamId)

      // 3. Push stream key to OBS
      setState(prev => ({ ...prev, phase: 'configuring-obs' }))
      await setStreamServiceSettings(obs, 'rtmp_custom', {
        server: stream.ingestionAddress,
        key: stream.streamKey,
        bwtest: false,
        use_auth: false,
      })

      // 4. Start OBS streaming
      setState(prev => ({ ...prev, phase: 'starting-stream' }))
      startStreaming(obs)()

      setState(prev => ({
        ...prev,
        phase: 'live',
        broadcastId,
        concurrentViewers: null,
        existingBroadcasts: [],
      }))
    } catch (e: any) {
      setError(_toErrorMessage(e))
    }
  }, [obs])

  /**
   * Resume an existing broadcast: fetch its stream key, push to OBS, start streaming.
   */
  const resumeBroadcast = React.useCallback(async (broadcast: LiveBroadcastInfo) => {
    const auth = authServiceRef.current
    if (!auth) return setError('Not authenticated')
    if (!obs) return setError('OBS is not connected')
    if (!broadcast.boundStreamId) return setError('Broadcast has no bound stream')

    try {
      setState(prev => ({ ...prev, phase: 'configuring-obs', error: null }))
      const token = await auth.getAccessToken()
      const stream = await liveServiceRef.current.getStreamKey(token, broadcast.boundStreamId)

      await setStreamServiceSettings(obs, 'rtmp_custom', {
        server: stream.ingestionAddress,
        key: stream.streamKey,
        bwtest: false,
        use_auth: false,
      })

      setState(prev => ({ ...prev, phase: 'starting-stream' }))
      startStreaming(obs)()

      setState(prev => ({
        ...prev,
        phase: 'live',
        broadcastId: broadcast.broadcastId,
        concurrentViewers: null,
        existingBroadcasts: [],
      }))
    } catch (e: any) {
      setError(_toErrorMessage(e))
    }
  }, [obs])

  /**
   * Stop streaming and transition the YouTube broadcast to complete.
   */
  const stopLive = React.useCallback(async () => {
    const auth = authServiceRef.current
    if (!obs) return setError('OBS is not connected')

    setState(prev => ({ ...prev, phase: 'stopping' }))
    try {
      // Stop OBS regardless of whether the YouTube API call succeeds
      stopStreaming(obs)()

      if (auth && state.broadcastId) {
        const token = await auth.getAccessToken()
        await liveServiceRef.current.transitionBroadcast(token, state.broadcastId, 'complete')
      }

      setState(prev => ({
        ...prev,
        phase: 'idle',
        broadcastId: null,
        concurrentViewers: null,
      }))
    } catch (e: any) {
      // Even if the API call failed, go back to idle
      setState(prev => ({ ...prev, phase: 'idle', broadcastId: null, concurrentViewers: null }))
      console.error('[useYouTubeLive] stopLive error:', e)
    }
  }, [obs, state.broadcastId])

  /**
   * End a specific existing broadcast (from the ResumeBroadcastDialog) without
   * resuming it. Removes it from the existingBroadcasts list.
   */
  const endExistingBroadcast = React.useCallback(async (broadcastId: string) => {
    const auth = authServiceRef.current
    if (!auth) return setError('Not authenticated')
    try {
      const token = await auth.getAccessToken()
      await liveServiceRef.current.transitionBroadcast(token, broadcastId, 'complete')
      setState(prev => ({
        ...prev,
        existingBroadcasts: prev.existingBroadcasts.filter(b => b.broadcastId !== broadcastId),
      }))
    } catch (e: any) {
      setError(_toErrorMessage(e))
    }
  }, [])

  const clearError = React.useCallback(() => {
    setState(prev => ({ ...prev, phase: 'idle', error: null }))
  }, [])

  return {
    ...state,
    checkExistingBroadcasts,
    goLive,
    resumeBroadcast,
    stopLive,
    endExistingBroadcast,
    clearError,
  }
}

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface YouTubeLiveHook extends YouTubeLiveState {
  checkExistingBroadcasts: () => Promise<LiveBroadcastInfo[]>
  goLive: (opts: CreateBroadcastOptions) => Promise<void>
  resumeBroadcast: (broadcast: LiveBroadcastInfo) => Promise<void>
  stopLive: () => Promise<void>
  endExistingBroadcast: (broadcastId: string) => Promise<void>
  clearError: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _toErrorMessage(e: unknown): string {
  if (e instanceof YouTubeApiError) return e.message
  if (e instanceof Error) return e.message
  return String(e)
}
