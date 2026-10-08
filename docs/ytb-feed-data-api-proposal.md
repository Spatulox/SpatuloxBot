# Proposal: Replace the YouTube RSS feed with the YouTube Data API v3

## Context

`src/module/YTB/YTBFeed.ts` polls `https://www.youtube.com/feeds/videos.xml?channel_id=<id>` with `rss-parser`.

On 2026-10-08 this endpoint returned **404 for every channel**, including channels that have never moved (e.g. Google Developers, `UC_x5XG1OV2P6uZZ5FSM9Ttw`). The channel pages themselves still answered 200. The `playlist_id=UU...` feed variant also returned 404.

This is not the first time. The RSS endpoint is undocumented and has had intermittent outages before. Other projects have hit the same problem:

- [iv-org/invidious#6074](https://github.com/iv-org/invidious/issues/6074): every channel feed returns 404
- [Google AI Dev Forum](https://discuss.ai.google.dev/t/youtube-rss-feed-endpoint-returns-404-errors/113379): earlier intermittent 404s

The feed gives no guarantee and no status page. The Data API is official, versioned and documented.

## Proposal

Fetch each channel's **uploads playlist** with `playlistItems.list`.

Every channel has an uploads playlist whose ID is the channel ID with the `UC` prefix replaced by `UU`:

```
UCIVSqoHCUN1XdEpiVItxfoQ  ->  UUIVSqoHCUN1XdEpiVItxfoQ
```

Request:

```
GET https://www.googleapis.com/youtube/v3/playlistItems
    ?part=snippet
    &playlistId=UU<rest of channel id>
    &maxResults=15
    &key=<YOUTUBE_API_KEY>
```

Fields used from each item:

| Current (RSS)   | Data API                                   |
|-----------------|--------------------------------------------|
| `entry.id` → split `yt:video:ID` | `item.snippet.resourceId.videoId` |
| `entry.title`   | `item.snippet.title`                       |
| `entry.pubDate` | `item.snippet.publishedAt`                 |

Items come back newest first, like the RSS feed, so the existing `.reverse()` still applies.

## Quota / cost

- `playlistItems.list` costs **1 unit** per call.
- The free quota is **10,000 units/day** per Google Cloud project.
- 11 channels polled every 5 minutes = 11 × 288 = **3,168 units/day**. That fits comfortably.
- No billing account is required for this quota.

Avoid `search.list` (100 units per call). It would exhaust the quota quickly.

## Setup

1. Create a project in the Google Cloud Console.
2. Enable **YouTube Data API v3**.
3. Create an **API key** (restrict it to YouTube Data API v3).
4. Add it to `.env` / docker-compose:
   ```
   YOUTUBE_API_KEY=...
   ```
5. Expose it next to `MUSIC_PATH` in `src/utils/SpatuloxBotEnv.ts`.

## Implementation sketch

Replace the `parser.parseURL(...)` block in `checkYoutubeFeed`. Node 18+ has `fetch` built in, so no new dependency is needed.

```ts
interface PlaylistItem {
    snippet: {
        title: string;
        publishedAt: string;
        resourceId: { videoId: string };
    };
}

private async fetchUploads(channelId: string): Promise<{ id: string; title: string; pubDate: string }[]> {
    const playlistId = 'UU' + channelId.slice(2);
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('playlistId', playlistId);
    url.searchParams.set('maxResults', '15');
    url.searchParams.set('key', SpatuloxBotEnv.youtubeApiKey);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status code ${res.status}`);
    const body = await res.json() as { items: PlaylistItem[] };

    return body.items.map(i => ({
        id: i.snippet.resourceId.videoId,
        title: i.snippet.title,
        pubDate: i.snippet.publishedAt,
    }));
}
```

The rest of `checkYoutubeFeed` (comparing against `videosId`, posting the message, writing the JSON file) stays the same.

## Fallback option

To keep things working with no API key configured, use the Data API when `YOUTUBE_API_KEY` is set and fall back to the current RSS feed otherwise. If one source fails, the other can be tried.

## Trade-offs

| | RSS (current) | Data API v3 |
|---|---|---|
| Official / documented | No | Yes |
| Requires API key | No | Yes |
| Quota | None (but rate-limited / flaky) | 10,000 units/day |
| Extra dependency | `rss-parser` | None (`fetch`) |
| Outage risk | Has had global 404 outages | Official, monitored API (no formal SLA) |

## Recommendation

Implement the Data API with RSS as a fallback. It's a small change of about 40 lines, confined to `YTBFeed.ts` and `SpatuloxBotEnv.ts`.
