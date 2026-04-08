# TODO list

## YouTube Live

- **Multi-channel support**: The YouTube Data API scopes `refresh_token` to a channel at OAuth time — there's no mid-session channel-switch API. To stream to multiple YouTube channels (e.g. Brand Accounts), the correct approach is to support multiple named YouTube account configurations (mirroring the named `connections` pattern for OBS), each independently authorised. The `YouTubeLiveTile` config would then include an optional `youtubeAccount` selector. This requires restructuring `YouTubeConfig` in `types.ts`, the Settings UI, and `YouTubeLiveProvider` to hold a map of account instances.

