/**
 * Playlist Sync — Update season playlists on Spotify after each round.
 *
 * Runs after tally-winner completes. For competitions with autoUpdate enabled
 * and a season playlist ID configured, updates the playlist with all tracks.
 *
 * Requires secrets: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN
 */
const fs = require('fs');
const path = require('path');
const { loadJSON, saveJSON } = require('./utils');

const COMPETITIONS_DIR = path.join(__dirname, '..', '..', 'competitions');

async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.log('Spotify credentials not configured — skipping playlist sync');
    return null;
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
  });

  if (!res.ok) {
    console.error('Failed to refresh Spotify token:', await res.text());
    return null;
  }

  const data = await res.json();
  return data.access_token;
}

async function syncPlaylist(slug, config, token) {
  const playlistConfig = config.playlist;
  if (!playlistConfig?.seasonPlaylistId || !playlistConfig?.autoUpdate) {
    return false;
  }

  console.log(`Syncing playlist for ${slug}...`);

  // Gather all track URIs from all rounds
  const trackUris = [];
  for (let i = 1; i <= (config.totalRounds || 31); i++) {
    const roundPath = path.join(COMPETITIONS_DIR, slug, 'rounds', `day-${String(i).padStart(2, '0')}.json`);
    const roundData = loadJSON(roundPath);
    if (!roundData) continue;

    const subs = roundData.submissions || [];
    for (const sub of subs) {
      if (sub.trackId) {
        trackUris.push(`spotify:track:${sub.trackId}`);
      }
    }
  }

  if (trackUris.length === 0) {
    console.log(`  No tracks found for ${slug}`);
    return false;
  }

  // Replace all tracks in the playlist
  const playlistId = playlistConfig.seasonPlaylistId;

  // First, clear the playlist
  await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uris: trackUris.slice(0, 100) }),
  });

  // Add remaining tracks in batches of 100
  for (let i = 100; i < trackUris.length; i += 100) {
    const chunk = trackUris.slice(i, i + 100);
    await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: chunk }),
    });
  }

  // Update config with last synced timestamp
  config.playlist.lastSynced = new Date().toISOString();
  const configPath = path.join(COMPETITIONS_DIR, slug, 'config.json');
  saveJSON(configPath, config);

  console.log(`  Synced ${trackUris.length} tracks to playlist ${playlistId}`);
  return true;
}

async function main() {
  const token = await getSpotifyToken();
  if (!token) return;

  // Load registry
  const registryPath = path.join(COMPETITIONS_DIR, 'registry.json');
  const registry = loadJSON(registryPath);
  if (!registry?.competitions) {
    console.log('No competitions found');
    return;
  }

  let synced = 0;
  for (const comp of registry.competitions) {
    if (comp.status !== 'active') continue;

    const configPath = path.join(COMPETITIONS_DIR, comp.slug, 'config.json');
    const config = loadJSON(configPath);
    if (!config) continue;

    const didSync = await syncPlaylist(comp.slug, config, token);
    if (didSync) synced++;
  }

  console.log(`Playlist sync complete: ${synced} playlist(s) updated`);
}

main().catch(err => {
  console.error('Playlist sync failed:', err);
  process.exit(1);
});
