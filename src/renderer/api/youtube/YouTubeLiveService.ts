/**
 * YouTubeLiveService
 *
 * Wraps the YouTube Data API v3 calls needed for the live-streaming workflow:
 *   createStream → createBroadcast → bindStream → (OBS streams) → transitionBroadcast
 *
 * All methods require a valid access token supplied by YouTubeAuthService.
 * Error responses from the YouTube API throw a YouTubeApiError.
 */

const API_BASE = 'https://www.googleapis.com/youtube/v3'

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class YouTubeApiError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly body: unknown,
	) {
		super(message)
		this.name = 'YouTubeApiError'
	}
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface LiveStreamInfo {
	/** YouTube liveStream resource id. */
	streamId: string
	/** RTMP ingest URL, e.g. "rtmp://a.rtmp.youtube.com/live2" */
	ingestionAddress: string
	/** The stream key (used as the RTMP key / "stream name"). */
	streamKey: string
}

export interface LiveBroadcastInfo {
	broadcastId: string
	title: string
	/** ISO‑8601 scheduled start time. */
	scheduledStartTime: string
	/** 'active' | 'testing' | 'complete' | 'created' | 'ready' | 'revoked' */
	lifeCycleStatus: string
	/** bound liveStream id */
	boundStreamId: string | null
}

export interface CreateBroadcastOptions {
	title: string
	description?: string
	privacyStatus: 'public' | 'unlisted' | 'private'
	latencyPreference: 'ultraLow' | 'low' | 'normal'
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function apiFetch(
	url: string,
	accessToken: string,
	options?: RequestInit,
): Promise<any> {
	const resp = await fetch(url, {
		...options,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
			...(options?.headers ?? {}),
		},
	})

	if (!resp.ok) {
		let body: unknown
		try { body = await resp.json() } catch { body = await resp.text().catch(() => null) }
		throw new YouTubeApiError(
			`YouTube API ${resp.status}: ${(body as any)?.error?.message ?? resp.statusText}`,
			resp.status,
			body,
		)
	}

	// 204 No Content
	if (resp.status === 204) return null
	return resp.json()
}

// ---------------------------------------------------------------------------
// YouTubeLiveService
// ---------------------------------------------------------------------------

export class YouTubeLiveService {
	/**
	 * Create a liveStream resource (defines the ingest point).
	 * Returns the stream ID, ingest URL, and stream key.
	 */
	async createStream(accessToken: string, title: string): Promise<LiveStreamInfo> {
		const body = {
			snippet: { title },
			cdn: {
				frameRate: 'variable',
				ingestionType: 'rtmp',
				resolution: 'variable',
			},
		}

		const data = await apiFetch(
			`${API_BASE}/liveStreams?part=snippet,cdn`,
			accessToken,
			{ method: 'POST', body: JSON.stringify(body) },
		)

		return {
			streamId: data.id,
			ingestionAddress: data.cdn.ingestionInfo.ingestionAddress,
			streamKey: data.cdn.ingestionInfo.streamName,
		}
	}

	/**
	 * Create a liveBroadcast resource.
	 *  - enableAutoStart: true  → YouTube auto-transitions to `live` when OBS sends data
	 *  - enableAutoStop:  false → broadcast persists through OBS crashes (user must stop explicitly)
	 */
	async createBroadcast(
		accessToken: string,
		opts: CreateBroadcastOptions,
	): Promise<string> {
		const scheduledStartTime = new Date().toISOString()

		const body = {
			snippet: {
				title: opts.title,
				description: opts.description ?? '',
				scheduledStartTime,
			},
			contentDetails: {
				enableAutoStart: true,
				enableAutoStop: false,
				latencyPreference: opts.latencyPreference,
				monitorStream: { enableMonitorStream: false },
			},
			status: {
				privacyStatus: opts.privacyStatus,
				selfDeclaredMadeForKids: false,
			},
		}

		const data = await apiFetch(
			`${API_BASE}/liveBroadcasts?part=snippet,contentDetails,status`,
			accessToken,
			{ method: 'POST', body: JSON.stringify(body) },
		)

		return data.id as string
	}

	/**
	 * Bind a liveStream to a liveBroadcast.
	 */
	async bindStream(
		accessToken: string,
		broadcastId: string,
		streamId: string,
	): Promise<void> {
		await apiFetch(
			`${API_BASE}/liveBroadcasts/bind?id=${encodeURIComponent(broadcastId)}&part=id,contentDetails&streamId=${encodeURIComponent(streamId)}`,
			accessToken,
			{ method: 'POST', body: '{}' },
		)
	}

	/**
	 * Transition a broadcast to a new status.
	 * Use `'complete'` to end the broadcast after OBS stops streaming.
	 */
	async transitionBroadcast(
		accessToken: string,
		broadcastId: string,
		broadcastStatus: 'testing' | 'live' | 'complete',
	): Promise<void> {
		await apiFetch(
			`${API_BASE}/liveBroadcasts/transition?broadcastStatus=${broadcastStatus}&id=${encodeURIComponent(broadcastId)}&part=id,status`,
			accessToken,
			{ method: 'POST', body: '{}' },
		)
	}

	/**
	 * Fetch the stream key for a given liveStream resource id.
	 * Used when resuming an existing broadcast.
	 */
	async getStreamKey(accessToken: string, streamId: string): Promise<LiveStreamInfo> {
		const data = await apiFetch(
			`${API_BASE}/liveStreams?part=snippet,cdn&id=${encodeURIComponent(streamId)}`,
			accessToken,
		)

		const item = data.items?.[0]
		if (!item) throw new YouTubeApiError('liveStream not found', 404, data)

		return {
			streamId: item.id,
			ingestionAddress: item.cdn.ingestionInfo.ingestionAddress,
			streamKey: item.cdn.ingestionInfo.streamName,
		}
	}

	/**
	 * Check for broadcasts that are currently `active` or in `testing` state.
	 * Deduplicated by broadcastId. Returns up to 20 combined results.
	 *
	 * Note: `broadcastStatus=upcoming` is the correct list-filter for broadcasts
	 * whose lifeCycleStatus is `created`, `ready`, or `testing`.
	 * There is no `testing` filter value on the list endpoint.
	 */
	async checkForExistingBroadcasts(accessToken: string): Promise<LiveBroadcastInfo[]> {
		const [activeData, upcomingData] = await Promise.all([
			apiFetch(
				`${API_BASE}/liveBroadcasts?part=snippet,status,contentDetails&broadcastStatus=active&maxResults=10`,
				accessToken,
			),
			apiFetch(
				`${API_BASE}/liveBroadcasts?part=snippet,status,contentDetails&broadcastStatus=upcoming&maxResults=10`,
				accessToken,
			),
		])

		const seen = new Set<string>()
		const results: LiveBroadcastInfo[] = []

		for (const item of [...(activeData.items ?? []), ...(upcomingData.items ?? [])]) {
			if (seen.has(item.id)) continue
			seen.add(item.id)
			results.push({
				broadcastId: item.id,
				title: item.snippet?.title ?? '',
				scheduledStartTime: item.snippet?.scheduledStartTime ?? '',
				lifeCycleStatus: item.status?.lifeCycleStatus ?? '',
				boundStreamId: item.contentDetails?.boundStreamId ?? null,
			})
		}

		return results
	}

	/**
	 * Fetch latest status for a single broadcast (used for live polling).
	 */
	async getBroadcastStatus(
		accessToken: string,
		broadcastId: string,
	): Promise<{ lifeCycleStatus: string; concurrentViewers: number | null }> {
		const data = await apiFetch(
			`${API_BASE}/liveBroadcasts?part=snippet,statistics,status&id=${encodeURIComponent(broadcastId)}`,
			accessToken,
		)

		const item = data.items?.[0]
		if (!item) throw new YouTubeApiError('broadcast not found', 404, data)

		return {
			lifeCycleStatus: item.status?.lifeCycleStatus ?? '',
			concurrentViewers: item.statistics?.concurrentViewers != null
				? Number(item.statistics.concurrentViewers)
				: null,
		}
	}
}
