/**
 * ROCKTOBER — Cloudflare Worker
 *
 * Proxies Spotify search API (hides credentials) and handles
 * song submissions by writing to the GitHub repo via Contents API.
 *
 * Endpoints:
 *   GET  /search?q=<query>         — Search Spotify tracks
 *   POST /submit                   — Submit a song to a round
 *   POST /vote                     — Cast a vote on a submission
 *   GET  /health                   — Health check
 *
 * Secrets (via wrangler secret put):
 *   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, GITHUB_TOKEN, GITHUB_REPO
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(env.CORS_ORIGIN, request);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // Route
      if (url.pathname === '/health') {
        return json({ status: 'ok', timestamp: new Date().toISOString() }, corsHeaders);
      }


      if (url.pathname === '/search' && request.method === 'GET') {
        return await handleSearch(url, env, corsHeaders);
      }

      if (url.pathname === '/auth' && request.method === 'POST') {
        return await handleAuth(request, env, corsHeaders);
      }

      if (url.pathname === '/submit' && request.method === 'POST') {
        return await handleSubmit(request, env, corsHeaders);
      }

      if (url.pathname === '/vote' && request.method === 'POST') {
        return await handleVote(request, env, corsHeaders);
      }

      if (url.pathname === '/comment' && request.method === 'POST') {
        return await handleComment(request, env, corsHeaders);
      }

      if (url.pathname === '/comment' && request.method === 'DELETE') {
        return await handleDeleteComment(request, env, corsHeaders);
      }

      if (url.pathname === '/react' && request.method === 'POST') {
        return await handleReact(request, env, corsHeaders);
      }

      // --- Phase 0.5: Dogfood Infrastructure ---

      if (url.pathname === '/competition/create' && request.method === 'POST') {
        return await handleCreateCompetition(request, env, corsHeaders);
      }

      if (url.pathname === '/competition/reset' && request.method === 'POST') {
        return await handleResetCompetition(request, env, corsHeaders);
      }

      if (url.pathname === '/competition/advance-phase' && request.method === 'POST') {
        return await handleAdvancePhase(request, env, corsHeaders);
      }

      if (url.pathname === '/competition/members' && request.method === 'POST') {
        return await handleManageMembers(request, env, corsHeaders);
      }

      // --- Phase 2: Settings & Config ---

      if (url.pathname === '/config/update' && request.method === 'POST') {
        return await handleConfigUpdate(request, env, corsHeaders);
      }

      // --- Phase 2C: Spotify User OAuth + Playlist ---

      if (url.pathname === '/auth/spotify' && request.method === 'GET') {
        return handleSpotifyOAuthRedirect(url, env, corsHeaders);
      }

      if (url.pathname === '/auth/spotify/callback' && request.method === 'GET') {
        return await handleSpotifyOAuthCallback(url, env, corsHeaders);
      }

      if (url.pathname === '/playlist/create' && request.method === 'POST') {
        return await handlePlaylistCreate(request, env, corsHeaders);
      }

      // --- Phase 1B/1C: OAuth ---

      if (url.pathname === '/auth/github' && request.method === 'GET') {
        return handleGitHubOAuthRedirect(url, env, corsHeaders);
      }

      if (url.pathname === '/auth/github/callback' && request.method === 'GET') {
        return await handleGitHubOAuthCallback(url, env, corsHeaders);
      }

      if (url.pathname === '/auth/microsoft' && request.method === 'GET') {
        return handleMicrosoftOAuthRedirect(url, env, corsHeaders);
      }

      if (url.pathname === '/auth/microsoft/callback' && request.method === 'GET') {
        return await handleMicrosoftOAuthCallback(url, env, corsHeaders);
      }

      return json({ error: 'Not found' }, corsHeaders, 404);

    } catch (err) {
      console.error('Worker error:', err);
      return json({ error: 'Internal server error', detail: err.message }, corsHeaders, 500);
    }
  },
};

// ---------------------
// CORS
// ---------------------

function getCorsHeaders(allowedOrigin, request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin === '*' ? '*' : origin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// ---------------------
// Helpers
// ---------------------

function json(data, corsHeaders, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// ---------------------
// Auth & Session Tokens
// ---------------------

/**
 * Generate a simple HMAC-based session token.
 * Token = base64(name:competition:timestamp:hmac)
 */
async function generateToken(name, competition, secret) {
  const payload = `${name}:${competition}:${Date.now()}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const sigHex = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(`${payload}:${sigHex}`);
}

/**
 * Validate a session token. Returns the member name or null.
 */
async function validateToken(token, secret) {
  try {
    const decoded = atob(token);
    const parts = decoded.split(':');
    if (parts.length < 4) return null;
    const name = parts[0];
    const competition = parts[1];
    const timestamp = parts[2];
    const providedSig = parts.slice(3).join(':');

    // Token expires after 30 days
    const age = Date.now() - parseInt(timestamp, 10);
    if (age > 30 * 24 * 60 * 60 * 1000) return null;

    // Verify HMAC
    const payload = `${name}:${competition}:${timestamp}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSig = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');

    if (providedSig !== expectedSig) return null;
    return { name, competition };
  } catch {
    return null;
  }
}

/**
 * Parse invite codes from the INVITE_CODES secret.
 * Format: JSON object { "CODE1": "Kerry", "CODE2": "Marcus", ... }
 * Or per-competition: { "comp-slug": { "CODE1": "Kerry" }, ... }
 */
function parseInviteCodes(env) {
  if (!env.INVITE_CODES) return null;
  try {
    return JSON.parse(env.INVITE_CODES);
  } catch {
    return null;
  }
}

// ---------------------
// POST /auth
// ---------------------

async function handleAuth(request, env, corsHeaders) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return json({ error: 'Invalid JSON body' }, corsHeaders, 400);
  }

  const { competition, code } = body;
  if (!competition || !code) {
    return json({ error: 'Missing required fields: competition, code' }, corsHeaders, 400);
  }

  const codes = parseInviteCodes(env);
  if (!codes) {
    // No invite codes configured — fall back to open access
    // Validate that the code matches a member name (case-insensitive)
    const repo = env.GITHUB_REPO;
    const token = env.GITHUB_TOKEN;
    const configPath = `competitions/${competition}/config.json`;
    const { content: configData } = await readGitHubFile(repo, configPath, token);

    if (!configData) {
      return json({ error: 'Competition not found' }, corsHeaders, 404);
    }

    const memberNames = (configData.members || []).map(m => m.name);
    const matchedName = memberNames.find(
      n => n.toUpperCase() === code.toUpperCase()
    );

    if (!matchedName) {
      return json({ error: 'Invalid code. Enter your member name to join.' }, corsHeaders, 403);
    }

    const secret = env.AUTH_SECRET || 'rocktober-default-secret';
    const sessionToken = await generateToken(matchedName, competition, secret);

    return json({
      name: matchedName,
      token: sessionToken,
      competition,
    }, corsHeaders);
  }

  // Invite codes configured — look up by competition then by code
  let codeMap = codes;
  if (codes[competition] && typeof codes[competition] === 'object') {
    codeMap = codes[competition];
  }

  const normalizedCode = code.toUpperCase();
  const memberName = codeMap[normalizedCode];

  if (!memberName) {
    return json({ error: 'Invalid invite code' }, corsHeaders, 403);
  }

  const secret = env.AUTH_SECRET || 'rocktober-default-secret';
  const sessionToken = await generateToken(memberName, competition, secret);

  return json({
    name: memberName,
    token: sessionToken,
    competition,
  }, corsHeaders);
}

// ---------------------
// Spotify Token Cache
// ---------------------

let spotifyToken = null;
let spotifyTokenExpiry = 0;

/**
 * Get a Spotify access token via client credentials flow.
 * Caches the token in module-level variables (survives across requests in the same Worker instance).
 */
async function getSpotifyToken(env) {
  if (spotifyToken && Date.now() < spotifyTokenExpiry) {
    return spotifyToken;
  }

  const clientId = env.SPOTIFY_CLIENT_ID;
  const clientSecret = env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify token request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  spotifyToken = data.access_token;
  // Expire 5 minutes early to avoid edge cases
  spotifyTokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
  return spotifyToken;
}

// ---------------------
// GET /search (Spotify Web API)
// ---------------------

async function handleSearch(url, env, corsHeaders) {
  const query = url.searchParams.get('q');
  if (!query || query.trim().length === 0) {
    return json({ error: 'Missing query parameter "q"' }, corsHeaders, 400);
  }

  // Get Spotify access token (client credentials — no user auth needed for search)
  let token;
  try {
    token = await getSpotifyToken(env);
  } catch (err) {
    // Fallback to iTunes if Spotify creds aren't configured
    return await handleSearchiTunes(url, corsHeaders);
  }

  const spotifyUrl = new URL('https://api.spotify.com/v1/search');
  spotifyUrl.searchParams.set('q', query.trim());
  spotifyUrl.searchParams.set('type', 'track');
  spotifyUrl.searchParams.set('limit', '10');
  spotifyUrl.searchParams.set('market', 'US');

  const res = await fetch(spotifyUrl.toString(), {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    // If token expired mid-flight, clear cache and fallback
    if (res.status === 401) {
      spotifyToken = null;
      spotifyTokenExpiry = 0;
    }
    const text = await res.text();
    throw new Error(`Spotify search failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  const tracks = (data.tracks?.items || []).map(track => ({
    trackId: track.id,
    title: track.name || 'Unknown',
    artist: (track.artists || []).map(a => a.name).join(', ') || 'Unknown Artist',
    album: track.album?.name || '',
    albumArt: track.album?.images?.[0]?.url || '',
    duration: track.duration_ms || 0,
    previewUrl: track.preview_url || null,
    spotifyUri: track.uri,
    spotifyUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
  }));

  return json({ tracks, provider: 'spotify' }, corsHeaders);
}

/**
 * iTunes Search fallback — used when Spotify credentials aren't configured.
 */
async function handleSearchiTunes(url, corsHeaders) {
  const query = url.searchParams.get('q');
  const itunesUrl = new URL('https://itunes.apple.com/search');
  itunesUrl.searchParams.set('term', query.trim());
  itunesUrl.searchParams.set('media', 'music');
  itunesUrl.searchParams.set('entity', 'song');
  itunesUrl.searchParams.set('limit', '10');
  itunesUrl.searchParams.set('country', 'US');

  const res = await fetch(itunesUrl.toString());

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`iTunes search failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  const tracks = (data.results || []).map(track => ({
    trackId: String(track.trackId),
    title: track.trackName || 'Unknown',
    artist: track.artistName || 'Unknown Artist',
    album: track.collectionName || '',
    albumArt: (track.artworkUrl100 || '').replace('100x100', '300x300'),
    duration: track.trackTimeMillis || 0,
    previewUrl: track.previewUrl || null,
    spotifySearch: `https://open.spotify.com/search/${encodeURIComponent(`${track.trackName} ${track.artistName}`)}`,
  }));

  return json({ tracks, provider: 'itunes' }, corsHeaders);
}

// ---------------------
// POST /submit
// ---------------------

async function handleSubmit(request, env, corsHeaders) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return json({ error: 'Invalid JSON body' }, corsHeaders, 400);
  }

  const { competition, day, submitter, track } = body;

  // Validate required fields
  if (!competition || !day || !submitter || !track) {
    return json({
      error: 'Missing required fields: competition, day, submitter, track',
    }, corsHeaders, 400);
  }

  if (!track.trackId || !track.title || !track.artist) {
    return json({
      error: 'Track must include trackId, title, and artist',
    }, corsHeaders, 400);
  }

  const repo = env.GITHUB_REPO;
  const token = env.GITHUB_TOKEN;

  if (!repo || !token) {
    return json({ error: 'Server misconfigured: missing GITHUB_REPO or GITHUB_TOKEN' }, corsHeaders, 500);
  }

  // 1. Read the current round JSON from GitHub
  const paddedDay = String(day).padStart(2, '0');
  const filePath = `competitions/${competition}/rounds/day-${paddedDay}.json`;
  const { content: roundData, sha } = await readGitHubFile(repo, filePath, token);

  if (!roundData) {
    return json({ error: `Round file not found: ${filePath}` }, corsHeaders, 404);
  }

  // 2. Validate phase
  if (roundData.phase !== 'submission') {
    return json({
      error: `Round is in "${roundData.phase}" phase — submissions are closed`,
    }, corsHeaders, 409);
  }

  // 3. Validate submitter is a member (read config)
  const configPath = `competitions/${competition}/config.json`;
  const { content: configData } = await readGitHubFile(repo, configPath, token);

  if (configData) {
    const memberNames = (configData.members || []).map(m => m.name);
    if (!memberNames.includes(submitter)) {
      return json({ error: `"${submitter}" is not a member of this competition` }, corsHeaders, 403);
    }
  }

  // 4. Check one-per-member — replace if exists
  const submissions = roundData.submissions || [];
  const existingIndex = submissions.findIndex(s => s.submitter === submitter);

  const newSubmission = {
    submitter,
    title: track.title,
    artist: track.artist,
    albumArt: track.albumArt || '',
    trackId: track.trackId,
    votes: 0,
  };

  let replaced = false;
  if (existingIndex >= 0) {
    submissions[existingIndex] = newSubmission;
    replaced = true;
  } else {
    submissions.push(newSubmission);
  }

  roundData.submissions = submissions;

  // 5. Write updated round JSON back to GitHub
  await writeGitHubFile(
    repo,
    filePath,
    roundData,
    sha,
    `${replaced ? 'Replace' : 'Add'} submission: ${submitter} — ${track.title}`,
    token
  );

  return json({
    success: true,
    replaced,
    submission: newSubmission,
    totalSubmissions: submissions.length,
  }, corsHeaders);
}

// ---------------------
// POST /vote
// ---------------------

async function handleVote(request, env, corsHeaders) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return json({ error: 'Invalid JSON body' }, corsHeaders, 400);
  }

  const { competition, day, voter, trackId } = body;

  // Validate required fields
  if (!competition || !day || !voter || !trackId) {
    return json({
      error: 'Missing required fields: competition, day, voter, trackId',
    }, corsHeaders, 400);
  }

  const repo = env.GITHUB_REPO;
  const token = env.GITHUB_TOKEN;

  if (!repo || !token) {
    return json({ error: 'Server misconfigured: missing GITHUB_REPO or GITHUB_TOKEN' }, corsHeaders, 500);
  }

  // 1. Read the current round JSON from GitHub
  const paddedDay = String(day).padStart(2, '0');
  const filePath = `competitions/${competition}/rounds/day-${paddedDay}.json`;
  const { content: roundData, sha } = await readGitHubFile(repo, filePath, token);

  if (!roundData) {
    return json({ error: `Round file not found: ${filePath}` }, corsHeaders, 404);
  }

  // 2. Validate phase is "voting"
  if (roundData.phase !== 'voting') {
    return json({
      error: `Round is in "${roundData.phase}" phase — voting is not open`,
    }, corsHeaders, 409);
  }

  // 3. Validate voter is a member (read config)
  const configPath = `competitions/${competition}/config.json`;
  const { content: configData } = await readGitHubFile(repo, configPath, token);

  if (configData) {
    const memberNames = (configData.members || []).map(m => m.name);
    if (!memberNames.includes(voter)) {
      return json({ error: `"${voter}" is not a member of this competition` }, corsHeaders, 403);
    }
  }

  // 4. Find the submission being voted for
  const submissions = roundData.submissions || [];
  const targetSub = submissions.find(s => s.trackId === trackId);
  if (!targetSub) {
    return json({ error: 'Submission not found for given trackId' }, corsHeaders, 404);
  }

  // 5. Self-vote check (configurable)
  const selfVoteAllowed = configData?.selfVoteAllowed ?? false;
  if (!selfVoteAllowed && targetSub.submitter === voter) {
    return json({ error: 'Self-voting is not allowed' }, corsHeaders, 403);
  }

  // 6. Handle vote change — remove previous vote if exists
  const existingVotes = roundData.votes || [];
  const previousVoteIdx = existingVotes.findIndex(v => v.voter === voter);
  if (previousVoteIdx >= 0) {
    const previousTrackId = existingVotes[previousVoteIdx].trackId;
    // Decrement old submission's vote count
    const prevSub = (roundData.submissions || []).find(s => s.trackId === previousTrackId);
    if (prevSub) prevSub.votes = Math.max(0, (prevSub.votes || 0) - 1);
    existingVotes.splice(previousVoteIdx, 1);
  }

  // 7. Record vote: add to votes array AND increment sub.votes
  existingVotes.push({ voter, trackId });
  roundData.votes = existingVotes;
  targetSub.votes = (targetSub.votes || 0) + 1;

  // 8. Write updated round JSON back to GitHub
  await writeGitHubFile(
    repo,
    filePath,
    roundData,
    sha,
    `Vote: ${voter} → ${targetSub.title} by ${targetSub.submitter}`,
    token
  );

  return json({
    success: true,
    voter,
    votedFor: { submitter: targetSub.submitter, title: targetSub.title },
    totalVotes: existingVotes.length,
  }, corsHeaders);
}

// ---------------------
// POST /comment
// ---------------------

async function handleComment(request, env, corsHeaders) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Invalid JSON body' }, corsHeaders, 400);

  const { competition, day, author, text } = body;
  if (!competition || !day || !author || !text) {
    return json({ error: 'Missing required fields: competition, day, author, text' }, corsHeaders, 400);
  }

  if (text.length > 280) {
    return json({ error: 'Comment too long (max 280 characters)' }, corsHeaders, 400);
  }

  const repo = env.GITHUB_REPO;
  const token = env.GITHUB_TOKEN;

  const paddedDay = String(day).padStart(2, '0');
  const filePath = `competitions/${competition}/rounds/day-${paddedDay}.json`;
  const { content: roundData, sha } = await readGitHubFile(repo, filePath, token);

  if (!roundData) return json({ error: 'Round not found' }, corsHeaders, 404);

  if (!roundData.comments) roundData.comments = [];
  const comment = {
    id: `c${Date.now()}`,
    author,
    text: text.trim(),
    timestamp: new Date().toISOString(),
  };
  roundData.comments.push(comment);

  await writeGitHubFile(repo, filePath, roundData, sha, `Comment: ${author} on round ${day}`, token);

  return json({ success: true, comment, totalComments: roundData.comments.length }, corsHeaders);
}

// ---------------------
// DELETE /comment
// ---------------------

async function handleDeleteComment(request, env, corsHeaders) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Invalid JSON body' }, corsHeaders, 400);

  const { competition, day, commentId, user } = body;
  if (!competition || !day || !commentId || !user) {
    return json({ error: 'Missing required fields' }, corsHeaders, 400);
  }

  const repo = env.GITHUB_REPO;
  const token = env.GITHUB_TOKEN;

  const paddedDay = String(day).padStart(2, '0');
  const filePath = `competitions/${competition}/rounds/day-${paddedDay}.json`;
  const { content: roundData, sha } = await readGitHubFile(repo, filePath, token);

  if (!roundData) return json({ error: 'Round not found' }, corsHeaders, 404);

  const comments = roundData.comments || [];
  const idx = comments.findIndex(c => c.id === commentId);
  if (idx < 0) return json({ error: 'Comment not found' }, corsHeaders, 404);

  // Only the author can delete their own comment
  // (Admin delete can be added later by checking a config flag)
  if (comments[idx].author !== user) {
    return json({ error: 'You can only delete your own comments' }, corsHeaders, 403);
  }

  comments.splice(idx, 1);
  roundData.comments = comments;

  await writeGitHubFile(repo, filePath, roundData, sha, `Delete comment by ${user} on round ${day}`, token);

  return json({ success: true }, corsHeaders);
}

// ---------------------
// POST /react
// ---------------------

async function handleReact(request, env, corsHeaders) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Invalid JSON body' }, corsHeaders, 400);

  const { competition, day, user, trackId, emoji } = body;
  if (!competition || !day || !user || !trackId || !emoji) {
    return json({ error: 'Missing required fields' }, corsHeaders, 400);
  }

  const repo = env.GITHUB_REPO;
  const token = env.GITHUB_TOKEN;

  const paddedDay = String(day).padStart(2, '0');
  const filePath = `competitions/${competition}/rounds/day-${paddedDay}.json`;
  const { content: roundData, sha } = await readGitHubFile(repo, filePath, token);

  if (!roundData) return json({ error: 'Round not found' }, corsHeaders, 404);

  const sub = (roundData.submissions || []).find(s => s.trackId === trackId);
  if (!sub) return json({ error: 'Submission not found' }, corsHeaders, 404);

  if (!sub.reactions) sub.reactions = {};
  if (!sub.reactions[emoji]) sub.reactions[emoji] = [];

  const idx = sub.reactions[emoji].indexOf(user);
  if (idx >= 0) {
    sub.reactions[emoji].splice(idx, 1); // Toggle off
  } else {
    sub.reactions[emoji].push(user); // Toggle on
  }

  await writeGitHubFile(repo, filePath, roundData, sha, `React: ${user} ${emoji} on ${sub.title}`, token);

  return json({ success: true, reactions: sub.reactions }, corsHeaders);
}

// ---------------------
// GitHub Contents API
// ---------------------

/**
 * Read a JSON file from the GitHub repo.
 * Returns { content: <parsed JSON>, sha: <string> } or { content: null, sha: null }.
 */
async function readGitHubFile(repo, path, token) {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Rocktober-Worker',
    },
  });

  if (!res.ok) {
    if (res.status === 404) return { content: null, sha: null };
    const text = await res.text();
    throw new Error(`GitHub read failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const decoded = atob(data.content.replace(/\n/g, ''));
  return { content: JSON.parse(decoded), sha: data.sha };
}

/**
 * Write (create or update) a JSON file in the GitHub repo.
 */
async function writeGitHubFile(repo, path, content, sha, message, token) {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  // Use TextEncoder for safe base64 encoding (btoa fails on non-Latin1 in Workers)
  const jsonStr = JSON.stringify(content, null, 2);
  const bytes = new TextEncoder().encode(jsonStr);
  const binStr = Array.from(bytes, b => String.fromCharCode(b)).join('');
  const encoded = btoa(binStr);

  const body = {
    message,
    content: encoded,
    ...(sha ? { sha } : {}),
  };

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Rocktober-Worker',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub write failed (${res.status}): ${text}`);
  }

  return res.json();
}

// ---------------------
// Admin Auth
// ---------------------

/**
 * Validate admin access. Checks:
 * 1. ADMIN_TOKEN secret matches Authorization header, OR
 * 2. Session token belongs to a user listed in config.admins[]
 */
async function validateAdmin(request, env, competition) {
  const authHeader = request.headers.get('Authorization') || '';

  // Method 1: Admin token (simplest — for CLI/testing)
  if (env.ADMIN_TOKEN && authHeader === `Bearer ${env.ADMIN_TOKEN}`) {
    return { authorized: true, method: 'admin-token' };
  }

  // Method 2: Session token for a user in config.admins
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const secret = env.AUTH_SECRET || 'rocktober-default-secret';
    const session = await validateToken(token, secret);
    if (session && session.competition === competition) {
      const repo = env.GITHUB_REPO;
      const ghToken = env.GITHUB_TOKEN;
      const configPath = `competitions/${competition}/config.json`;
      const { content: configData } = await readGitHubFile(repo, configPath, ghToken);
      if (configData) {
        const admins = configData.admins || [];
        if (admins.includes(session.name)) {
          return { authorized: true, method: 'session-admin', name: session.name };
        }
      }
    }
  }

  return { authorized: false };
}

// ---------------------
// POST /competition/create
// ---------------------

async function handleCreateCompetition(request, env, corsHeaders) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Invalid JSON body' }, corsHeaders, 400);

  const { name, slug, startDate, endDate, timezone, competitionDays, members, themes, admins } = body;

  // Validate required fields
  if (!name || !slug || !startDate || !endDate) {
    return json({ error: 'Missing required fields: name, slug, startDate, endDate' }, corsHeaders, 400);
  }

  // Validate slug format (kebab-case, no spaces)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return json({ error: 'Slug must be kebab-case (lowercase letters, numbers, hyphens)' }, corsHeaders, 400);
  }

  // Validate dates
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return json({ error: 'Dates must be ISO format: YYYY-MM-DD' }, corsHeaders, 400);
  }

  if (startDate > endDate) {
    return json({ error: 'startDate must be before endDate' }, corsHeaders, 400);
  }

  // Admin auth: require ADMIN_TOKEN for creation (no config to check admins against yet)
  const authHeader = request.headers.get('Authorization') || '';
  if (!env.ADMIN_TOKEN || authHeader !== `Bearer ${env.ADMIN_TOKEN}`) {
    return json({ error: 'Admin authorization required' }, corsHeaders, 403);
  }

  const repo = env.GITHUB_REPO;
  const token = env.GITHUB_TOKEN;

  // Check if competition already exists
  const configPath = `competitions/${slug}/config.json`;
  const { content: existing } = await readGitHubFile(repo, configPath, token);
  if (existing) {
    return json({ error: `Competition "${slug}" already exists` }, corsHeaders, 409);
  }

  // Calculate total rounds
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const activeDays = competitionDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  let totalRounds = 0;
  const roundDates = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (activeDays.includes(dayNames[d.getDay()])) {
      totalRounds++;
      roundDates.push(d.toISOString().slice(0, 10));
    }
  }

  // Build config
  const configData = {
    name,
    slug,
    schemaVersion: 1,
    startDate,
    endDate,
    totalRounds,
    themeMode: 'round-robin',
    selfVoteAllowed: false,
    schedule: {
      timezone: timezone || 'America/Indiana/Indianapolis',
      submissionOpen: '08:00',
      submissionClose: '15:00',
      votingOpen: '15:00',
      votingClose: '16:30',
      resultsReveal: '16:30',
    },
    competitionDays: activeDays,
    admins: admins || [],
    members: (members || []).map((m, i) => ({
      name: typeof m === 'string' ? m : m.name,
      order: i + 1,
    })),
    themes: themes || [],
  };

  // Write config.json (creates the directory implicitly via GitHub Contents API)
  await writeGitHubFile(repo, configPath, configData, null, `Create competition: ${name}`, token);

  // Write empty leaderboard
  const leaderboardPath = `competitions/${slug}/leaderboard.json`;
  const leaderboardData = {
    competition: slug,
    standings: (configData.members || []).map(m => ({
      name: m.name,
      wins: 0,
      totalVotes: 0,
    })),
    lastUpdated: new Date().toISOString(),
  };
  await writeGitHubFile(repo, leaderboardPath, leaderboardData, null, `Initialize leaderboard: ${name}`, token);

  // Create round files for each competition day
  for (let i = 0; i < roundDates.length; i++) {
    const dayNum = String(i + 1).padStart(2, '0');
    const roundPath = `competitions/${slug}/rounds/day-${dayNum}.json`;
    const roundData = {
      day: i + 1,
      date: roundDates[i],
      theme: (themes && themes[i]) || `Round ${i + 1}`,
      themePicker: configData.members[i % configData.members.length]?.name || null,
      phase: 'submission',
      submissions: [],
      votes: [],
      comments: [],
      winner: null,
    };
    await writeGitHubFile(repo, roundPath, roundData, null, `Create round ${dayNum}: ${roundData.theme}`, token);
  }

  // Update registry.json
  const registryPath = 'competitions/registry.json';
  const { content: registryData, sha: registrySha } = await readGitHubFile(repo, registryPath, token);

  const registryEntry = {
    slug,
    name,
    startDate,
    endDate,
    status: 'active',
    memberCount: configData.members.length,
    totalRounds,
    description: `${name} — ${totalRounds} rounds`,
  };

  if (registryData) {
    registryData.competitions = registryData.competitions || [];
    registryData.competitions.push(registryEntry);
    await writeGitHubFile(repo, registryPath, registryData, registrySha, `Add to registry: ${name}`, token);
  } else {
    const newRegistry = { schemaVersion: 1, competitions: [registryEntry] };
    await writeGitHubFile(repo, registryPath, newRegistry, null, `Create registry with: ${name}`, token);
  }

  return json({
    success: true,
    competition: configData,
    totalRounds,
    roundDates,
  }, corsHeaders, 201);
}

// ---------------------
// POST /competition/reset
// ---------------------

async function handleResetCompetition(request, env, corsHeaders) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Invalid JSON body' }, corsHeaders, 400);

  const { competition } = body;
  if (!competition) return json({ error: 'Missing required field: competition' }, corsHeaders, 400);

  // Admin auth
  const admin = await validateAdmin(request, env, competition);
  if (!admin.authorized) return json({ error: 'Admin authorization required' }, corsHeaders, 403);

  const repo = env.GITHUB_REPO;
  const token = env.GITHUB_TOKEN;

  // Read config to get round count
  const configPath = `competitions/${competition}/config.json`;
  const { content: configData } = await readGitHubFile(repo, configPath, token);
  if (!configData) return json({ error: 'Competition not found' }, corsHeaders, 404);

  let roundsReset = 0;

  // Reset each round file: clear submissions, votes, comments, winner; reset phase
  for (let i = 1; i <= (configData.totalRounds || 31); i++) {
    const dayNum = String(i).padStart(2, '0');
    const roundPath = `competitions/${competition}/rounds/day-${dayNum}.json`;
    const { content: roundData, sha } = await readGitHubFile(repo, roundPath, token);
    if (!roundData) continue;

    roundData.submissions = [];
    roundData.votes = [];
    roundData.comments = [];
    roundData.winner = null;
    roundData.phase = 'submission';

    await writeGitHubFile(repo, roundPath, roundData, sha, `Reset round ${dayNum}`, token);
    roundsReset++;
  }

  // Reset leaderboard
  const lbPath = `competitions/${competition}/leaderboard.json`;
  const { content: lbData, sha: lbSha } = await readGitHubFile(repo, lbPath, token);
  if (lbData) {
    lbData.standings = (lbData.standings || []).map(s => ({
      ...s,
      wins: 0,
      totalVotes: 0,
    }));
    lbData.lastUpdated = new Date().toISOString();
    await writeGitHubFile(repo, lbPath, lbData, lbSha, `Reset leaderboard: ${competition}`, token);
  }

  return json({
    success: true,
    competition,
    roundsReset,
  }, corsHeaders);
}

// ---------------------
// POST /competition/advance-phase
// ---------------------

async function handleAdvancePhase(request, env, corsHeaders) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Invalid JSON body' }, corsHeaders, 400);

  const { competition, day, targetPhase } = body;
  if (!competition || !day) {
    return json({ error: 'Missing required fields: competition, day' }, corsHeaders, 400);
  }

  // Admin auth
  const admin = await validateAdmin(request, env, competition);
  if (!admin.authorized) return json({ error: 'Admin authorization required' }, corsHeaders, 403);

  const repo = env.GITHUB_REPO;
  const token = env.GITHUB_TOKEN;

  const paddedDay = String(day).padStart(2, '0');
  const filePath = `competitions/${competition}/rounds/day-${paddedDay}.json`;
  const { content: roundData, sha } = await readGitHubFile(repo, filePath, token);

  if (!roundData) return json({ error: `Round ${day} not found` }, corsHeaders, 404);

  // Determine target phase
  const phaseOrder = ['submission', 'voting', 'results'];
  const currentIdx = phaseOrder.indexOf(roundData.phase);

  let newPhase;
  if (targetPhase) {
    if (!phaseOrder.includes(targetPhase)) {
      return json({ error: `Invalid phase: ${targetPhase}. Must be: ${phaseOrder.join(', ')}` }, corsHeaders, 400);
    }
    newPhase = targetPhase;
  } else {
    // Auto-advance to next phase
    if (currentIdx >= phaseOrder.length - 1) {
      return json({ error: `Round is already in "${roundData.phase}" phase — cannot advance further` }, corsHeaders, 409);
    }
    newPhase = phaseOrder[currentIdx + 1];
  }

  const oldPhase = roundData.phase;
  roundData.phase = newPhase;

  // If advancing to results, tally the winner
  if (newPhase === 'results' && !roundData.winner) {
    const submissions = roundData.submissions || [];
    if (submissions.length > 0) {
      const sorted = [...submissions].sort((a, b) => (b.votes || 0) - (a.votes || 0));
      roundData.winner = {
        submitter: sorted[0].submitter,
        title: sorted[0].title,
        artist: sorted[0].artist,
        albumArt: sorted[0].albumArt,
        trackId: sorted[0].trackId,
        votes: sorted[0].votes || 0,
      };

      // Update leaderboard
      const lbPath = `competitions/${competition}/leaderboard.json`;
      const { content: lbData, sha: lbSha } = await readGitHubFile(repo, lbPath, token);
      if (lbData) {
        const winner = lbData.standings.find(s => s.name === sorted[0].submitter);
        if (winner) {
          winner.wins = (winner.wins || 0) + 1;
        }
        lbData.lastUpdated = new Date().toISOString();
        await writeGitHubFile(repo, lbPath, lbData, lbSha, `Update leaderboard: round ${day} winner`, token);
      }
    }
  }

  await writeGitHubFile(repo, filePath, roundData, sha, `Advance round ${day}: ${oldPhase} → ${newPhase}`, token);

  return json({
    success: true,
    competition,
    day: parseInt(day),
    previousPhase: oldPhase,
    newPhase,
    winner: roundData.winner || null,
  }, corsHeaders);
}

// ---------------------
// POST /competition/members
// ---------------------

async function handleManageMembers(request, env, corsHeaders) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Invalid JSON body' }, corsHeaders, 400);

  const { competition, action, members: memberList } = body;
  if (!competition || !action || !memberList) {
    return json({ error: 'Missing required fields: competition, action, members' }, corsHeaders, 400);
  }

  if (!['add', 'remove'].includes(action)) {
    return json({ error: 'Action must be "add" or "remove"' }, corsHeaders, 400);
  }

  if (!Array.isArray(memberList) || memberList.length === 0) {
    return json({ error: 'Members must be a non-empty array' }, corsHeaders, 400);
  }

  // Admin auth
  const admin = await validateAdmin(request, env, competition);
  if (!admin.authorized) return json({ error: 'Admin authorization required' }, corsHeaders, 403);

  const repo = env.GITHUB_REPO;
  const token = env.GITHUB_TOKEN;

  const configPath = `competitions/${competition}/config.json`;
  const { content: configData, sha } = await readGitHubFile(repo, configPath, token);
  if (!configData) return json({ error: 'Competition not found' }, corsHeaders, 404);

  const existingMembers = configData.members || [];
  const existingNames = existingMembers.map(m => m.name);
  let changed = [];

  if (action === 'add') {
    const maxOrder = existingMembers.reduce((max, m) => Math.max(max, m.order || 0), 0);
    let nextOrder = maxOrder + 1;
    for (const member of memberList) {
      const name = typeof member === 'string' ? member : member.name;
      if (!existingNames.includes(name)) {
        existingMembers.push({ name, order: nextOrder++ });
        changed.push(name);
      }
    }
  } else {
    // remove
    const toRemove = memberList.map(m => typeof m === 'string' ? m : m.name);
    configData.members = existingMembers.filter(m => {
      if (toRemove.includes(m.name)) {
        changed.push(m.name);
        return false;
      }
      return true;
    });
  }

  if (changed.length === 0) {
    return json({
      success: true,
      message: 'No changes — members already in desired state',
      members: (configData.members || []).map(m => m.name),
    }, corsHeaders);
  }

  // Update config
  await writeGitHubFile(repo, configPath, configData, sha,
    `${action === 'add' ? 'Add' : 'Remove'} members: ${changed.join(', ')}`, token);

  // If adding members, also add them to the leaderboard
  if (action === 'add') {
    const lbPath = `competitions/${competition}/leaderboard.json`;
    const { content: lbData, sha: lbSha } = await readGitHubFile(repo, lbPath, token);
    if (lbData) {
      const existingLbNames = (lbData.standings || []).map(s => s.name);
      for (const name of changed) {
        if (!existingLbNames.includes(name)) {
          lbData.standings.push({ name, wins: 0, totalVotes: 0 });
        }
      }
      lbData.lastUpdated = new Date().toISOString();
      await writeGitHubFile(repo, lbPath, lbData, lbSha, `Add members to leaderboard: ${changed.join(', ')}`, token);
    }
  }

  return json({
    success: true,
    action,
    changed,
    members: (configData.members || []).map(m => m.name),
  }, corsHeaders);
}

// ---------------------
// POST /config/update
// ---------------------

async function handleConfigUpdate(request, env, corsHeaders) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Invalid JSON body' }, corsHeaders, 400);

  const { competition, config: updates } = body;
  if (!competition || !updates) {
    return json({ error: 'Missing required fields: competition, config' }, corsHeaders, 400);
  }

  // Admin auth
  const admin = await validateAdmin(request, env, competition);
  if (!admin.authorized) return json({ error: 'Admin authorization required' }, corsHeaders, 403);

  const repo = env.GITHUB_REPO;
  const token = env.GITHUB_TOKEN;

  const configPath = `competitions/${competition}/config.json`;
  const { content: configData, sha } = await readGitHubFile(repo, configPath, token);
  if (!configData) return json({ error: 'Competition not found' }, corsHeaders, 404);

  // Deep merge updates into existing config
  for (const [key, value] of Object.entries(updates)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && typeof configData[key] === 'object') {
      configData[key] = { ...configData[key], ...value };
    } else {
      configData[key] = value;
    }
  }

  await writeGitHubFile(repo, configPath, configData, sha, `Update config: ${competition}`, token);

  return json({ success: true, config: configData }, corsHeaders);
}

// ---------------------
// OAuth Helpers
// ---------------------

/**
 * Sign a state parameter for OAuth flows.
 * State = base64(slug:nonce:hmac)
 */
async function signOAuthState(slug, secret) {
  const nonce = crypto.randomUUID();
  const payload = `${slug}:${nonce}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const sigHex = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(`${payload}:${sigHex}`);
}

/**
 * Verify and decode an OAuth state parameter.
 * Returns { slug } or null if invalid.
 */
async function verifyOAuthState(state, secret) {
  try {
    const decoded = atob(state);
    const parts = decoded.split(':');
    if (parts.length < 3) return null;
    const slug = parts[0];
    const nonce = parts[1];
    const providedSig = parts.slice(2).join(':');

    const payload = `${slug}:${nonce}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSig = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');

    if (providedSig !== expectedSig) return null;
    return { slug };
  } catch {
    return null;
  }
}

/**
 * Look up a member by email using the OAUTH_MAPPINGS secret.
 * OAUTH_MAPPINGS format: JSON { "email@example.com": "MemberName", ... }
 * or per-competition: { "comp-slug": { "email@example.com": "MemberName" }, ... }
 */
function lookupMemberByEmail(email, competition, env) {
  if (!env.OAUTH_MAPPINGS) return null;
  try {
    const mappings = JSON.parse(env.OAUTH_MAPPINGS);
    // Per-competition mappings
    if (mappings[competition] && typeof mappings[competition] === 'object') {
      const name = mappings[competition][email.toLowerCase()];
      if (name) return name;
    }
    // Global mappings
    const name = mappings[email.toLowerCase()];
    if (name && typeof name === 'string') return name;
    return null;
  } catch {
    return null;
  }
}

/**
 * Build the frontend redirect URL after successful OAuth.
 */
function buildFrontendRedirect(env, slug, token, name) {
  const origin = env.CORS_ORIGIN || 'https://narehk.github.io/Rocktober';
  // Strip trailing path components to get the base URL
  const base = origin.endsWith('/') ? origin.slice(0, -1) : origin;
  return `${base}/index.html#competition=${encodeURIComponent(slug)}&token=${encodeURIComponent(token)}&name=${encodeURIComponent(name)}`;
}

// ---------------------
// GET /auth/spotify — Redirect to Spotify User OAuth (for playlist creation)
// ---------------------

function handleSpotifyOAuthRedirect(url, env, corsHeaders) {
  const competition = url.searchParams.get('competition');
  if (!competition) return json({ error: 'Missing competition parameter' }, corsHeaders, 400);

  const clientId = env.SPOTIFY_CLIENT_ID;
  if (!clientId) return json({ error: 'Spotify not configured' }, corsHeaders, 501);

  const callbackUrl = `${url.origin}/auth/spotify/callback`;
  const state = btoa(`${competition}:${Date.now()}`);

  const spotifyUrl = new URL('https://accounts.spotify.com/authorize');
  spotifyUrl.searchParams.set('client_id', clientId);
  spotifyUrl.searchParams.set('response_type', 'code');
  spotifyUrl.searchParams.set('redirect_uri', callbackUrl);
  spotifyUrl.searchParams.set('scope', 'playlist-modify-public playlist-modify-private');
  spotifyUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: { 'Location': spotifyUrl.toString(), ...corsHeaders },
  });
}

// ---------------------
// GET /auth/spotify/callback
// ---------------------

async function handleSpotifyOAuthCallback(url, env, corsHeaders) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) return new Response(`Spotify OAuth error: ${error}`, { status: 400 });
  if (!code || !state) return new Response('Missing code or state', { status: 400 });

  let competition;
  try { competition = atob(state).split(':')[0]; } catch { return new Response('Invalid state', { status: 400 }); }

  const callbackUrl = `${url.origin}/auth/spotify/callback`;

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl,
      client_id: env.SPOTIFY_CLIENT_ID,
      client_secret: env.SPOTIFY_CLIENT_SECRET,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return new Response(`Spotify token exchange failed: ${text}`, { status: 502 });
  }

  const tokenData = await tokenRes.json();
  const origin = env.CORS_ORIGIN || 'https://narehk.github.io/Rocktober';

  // Redirect back with Spotify tokens in fragment
  const redirect = `${origin}/index.html#competition=${encodeURIComponent(competition)}&spotify_token=${encodeURIComponent(tokenData.access_token)}&spotify_refresh=${encodeURIComponent(tokenData.refresh_token || '')}`;
  return new Response(null, { status: 302, headers: { 'Location': redirect } });
}

// ---------------------
// POST /playlist/create
// ---------------------

async function handlePlaylistCreate(request, env, corsHeaders) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Invalid JSON body' }, corsHeaders, 400);

  const { competition, type, roundNum, spotifyToken, name, includeAll } = body;
  if (!competition || !type || !spotifyToken) {
    return json({ error: 'Missing required fields: competition, type, spotifyToken' }, corsHeaders, 400);
  }

  if (!['round', 'season'].includes(type)) {
    return json({ error: 'Type must be "round" or "season"' }, corsHeaders, 400);
  }

  const repo = env.GITHUB_REPO;
  const token = env.GITHUB_TOKEN;

  // Gather track IDs
  let trackUris = [];
  let playlistName = name;

  if (type === 'round') {
    if (!roundNum) return json({ error: 'roundNum required for round playlists' }, corsHeaders, 400);
    const paddedDay = String(roundNum).padStart(2, '0');
    const roundPath = `competitions/${competition}/rounds/day-${paddedDay}.json`;
    const { content: roundData } = await readGitHubFile(repo, roundPath, token);
    if (!roundData) return json({ error: 'Round not found' }, corsHeaders, 404);

    const subs = roundData.submissions || [];
    trackUris = subs.filter(s => s.trackId).map(s => `spotify:track:${s.trackId}`);
    if (!playlistName) playlistName = `${competition} — Round ${roundNum}: ${roundData.theme || ''}`.trim();
  } else {
    // Season playlist — gather all rounds
    const configPath = `competitions/${competition}/config.json`;
    const { content: configData } = await readGitHubFile(repo, configPath, token);
    if (!configData) return json({ error: 'Competition not found' }, corsHeaders, 404);

    for (let i = 1; i <= (configData.totalRounds || 31); i++) {
      const dayNum = String(i).padStart(2, '0');
      const roundPath = `competitions/${competition}/rounds/day-${dayNum}.json`;
      const { content: roundData } = await readGitHubFile(repo, roundPath, token);
      if (!roundData) continue;

      const subs = roundData.submissions || [];
      if (includeAll) {
        trackUris.push(...subs.filter(s => s.trackId).map(s => `spotify:track:${s.trackId}`));
      } else {
        // Winners only
        if (roundData.winner?.trackId) {
          trackUris.push(`spotify:track:${roundData.winner.trackId}`);
        }
      }
    }
    if (!playlistName) playlistName = `${configData.name || competition} — Full Season`;
  }

  if (trackUris.length === 0) {
    return json({ error: 'No tracks found to add to playlist' }, corsHeaders, 400);
  }

  // Get Spotify user ID
  const meRes = await fetch('https://api.spotify.com/v1/me', {
    headers: { 'Authorization': `Bearer ${spotifyToken}` },
  });
  if (!meRes.ok) return json({ error: 'Invalid Spotify token — please reconnect' }, corsHeaders, 401);
  const me = await meRes.json();

  // Create playlist
  const createRes = await fetch(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${spotifyToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: playlistName,
      description: `Created by Rocktober — ${type === 'season' ? 'Full season' : `Round ${roundNum}`} playlist`,
      public: false,
    }),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    return json({ error: `Failed to create playlist: ${text}` }, corsHeaders, 502);
  }

  const playlist = await createRes.json();

  // Add tracks (max 100 per request)
  for (let i = 0; i < trackUris.length; i += 100) {
    const chunk = trackUris.slice(i, i + 100);
    await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${spotifyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: chunk }),
    });
  }

  return json({
    success: true,
    playlistId: playlist.id,
    playlistUrl: playlist.external_urls?.spotify || `https://open.spotify.com/playlist/${playlist.id}`,
    trackCount: trackUris.length,
    name: playlistName,
  }, corsHeaders);
}

// ---------------------
// GET /auth/github — Redirect to GitHub OAuth
// ---------------------

function handleGitHubOAuthRedirect(url, env, corsHeaders) {
  const competition = url.searchParams.get('competition');
  if (!competition) {
    return json({ error: 'Missing competition parameter' }, corsHeaders, 400);
  }

  const clientId = env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) {
    return json({ error: 'GitHub OAuth not configured' }, corsHeaders, 501);
  }

  // Build the callback URL from the Worker's own URL
  const callbackUrl = `${url.origin}/auth/github/callback`;

  // State includes competition slug signed with HMAC
  // We'll generate it synchronously using a simpler approach for the redirect
  const state = btoa(`${competition}:${Date.now()}`);

  const githubUrl = new URL('https://github.com/login/oauth/authorize');
  githubUrl.searchParams.set('client_id', clientId);
  githubUrl.searchParams.set('redirect_uri', callbackUrl);
  githubUrl.searchParams.set('scope', 'user:email');
  githubUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: { 'Location': githubUrl.toString(), ...corsHeaders },
  });
}

// ---------------------
// GET /auth/github/callback — Exchange code for token
// ---------------------

async function handleGitHubOAuthCallback(url, env, corsHeaders) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return new Response('Missing code or state parameter', { status: 400 });
  }

  // Decode state to get competition slug
  let competition;
  try {
    const decoded = atob(state);
    competition = decoded.split(':')[0];
  } catch {
    return new Response('Invalid state parameter', { status: 400 });
  }

  if (!competition) {
    return new Response('Invalid state — missing competition', { status: 400 });
  }

  // Exchange code for access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return new Response('GitHub token exchange failed', { status: 502 });
  }

  const tokenData = await tokenRes.json();
  if (tokenData.error) {
    return new Response(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`, { status: 400 });
  }

  const ghAccessToken = tokenData.access_token;

  // Get user's verified email
  const emailRes = await fetch('https://api.github.com/user/emails', {
    headers: {
      'Authorization': `token ${ghAccessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Rocktober-Worker',
    },
  });

  if (!emailRes.ok) {
    return new Response('Failed to fetch GitHub emails', { status: 502 });
  }

  const emails = await emailRes.json();
  const primaryEmail = emails.find(e => e.primary && e.verified)?.email
    || emails.find(e => e.verified)?.email;

  if (!primaryEmail) {
    return new Response('No verified email found on GitHub account', { status: 403 });
  }

  // Also get display name from profile
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `token ${ghAccessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Rocktober-Worker',
    },
  });
  const userData = userRes.ok ? await userRes.json() : {};

  // Look up member by email
  let memberName = lookupMemberByEmail(primaryEmail, competition, env);

  // If no mapping, try matching against config members by name
  if (!memberName) {
    const repo = env.GITHUB_REPO;
    const ghToken = env.GITHUB_TOKEN;
    const configPath = `competitions/${competition}/config.json`;
    const { content: configData } = await readGitHubFile(repo, configPath, ghToken);
    if (configData) {
      // Try to match GitHub username or display name against member names
      const ghName = userData.name || userData.login || '';
      const ghLogin = userData.login || '';
      const memberNames = (configData.members || []).map(m => m.name);
      memberName = memberNames.find(n =>
        n.toLowerCase() === ghName.toLowerCase() ||
        n.toLowerCase() === ghLogin.toLowerCase() ||
        n.toLowerCase() === primaryEmail.split('@')[0].toLowerCase()
      );
    }
  }

  if (!memberName) {
    // Can't map this GitHub user to a competition member
    const origin = env.CORS_ORIGIN || 'https://narehk.github.io/Rocktober';
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${origin}/index.html#competition=${encodeURIComponent(competition)}&auth_error=${encodeURIComponent('No matching member found for ' + primaryEmail)}`,
      },
    });
  }

  // Generate session token
  const secret = env.AUTH_SECRET || 'rocktober-default-secret';
  const sessionToken = await generateToken(memberName, competition, secret);

  // Redirect to frontend with token
  const redirectUrl = buildFrontendRedirect(env, competition, sessionToken, memberName);
  return new Response(null, {
    status: 302,
    headers: { 'Location': redirectUrl },
  });
}

// ---------------------
// GET /auth/microsoft — Redirect to Microsoft OAuth
// ---------------------

function handleMicrosoftOAuthRedirect(url, env, corsHeaders) {
  const competition = url.searchParams.get('competition');
  if (!competition) {
    return json({ error: 'Missing competition parameter' }, corsHeaders, 400);
  }

  const clientId = env.MICROSOFT_OAUTH_CLIENT_ID;
  if (!clientId) {
    return json({ error: 'Microsoft OAuth not configured' }, corsHeaders, 501);
  }

  const callbackUrl = `${url.origin}/auth/microsoft/callback`;
  const state = btoa(`${competition}:${Date.now()}`);

  const msUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  msUrl.searchParams.set('client_id', clientId);
  msUrl.searchParams.set('response_type', 'code');
  msUrl.searchParams.set('redirect_uri', callbackUrl);
  msUrl.searchParams.set('scope', 'openid profile email');
  msUrl.searchParams.set('state', state);
  msUrl.searchParams.set('response_mode', 'query');

  return new Response(null, {
    status: 302,
    headers: { 'Location': msUrl.toString(), ...corsHeaders },
  });
}

// ---------------------
// GET /auth/microsoft/callback — Exchange code for token
// ---------------------

async function handleMicrosoftOAuthCallback(url, env, corsHeaders) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    const desc = url.searchParams.get('error_description') || error;
    return new Response(`Microsoft OAuth error: ${desc}`, { status: 400 });
  }

  if (!code || !state) {
    return new Response('Missing code or state parameter', { status: 400 });
  }

  let competition;
  try {
    const decoded = atob(state);
    competition = decoded.split(':')[0];
  } catch {
    return new Response('Invalid state parameter', { status: 400 });
  }

  if (!competition) {
    return new Response('Invalid state — missing competition', { status: 400 });
  }

  const callbackUrl = `${url.origin}/auth/microsoft/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.MICROSOFT_OAUTH_CLIENT_ID,
      client_secret: env.MICROSOFT_OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: callbackUrl,
      grant_type: 'authorization_code',
      scope: 'openid profile email',
    }).toString(),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return new Response(`Microsoft token exchange failed: ${text}`, { status: 502 });
  }

  const tokenData = await tokenRes.json();

  // Decode id_token to get email (base64 decode the payload — no signature check needed,
  // we just received it from Microsoft over TLS)
  let email, displayName;
  try {
    const idToken = tokenData.id_token;
    const payload = JSON.parse(atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    email = payload.email || payload.preferred_username || payload.upn;
    displayName = payload.name;
  } catch {
    return new Response('Failed to decode Microsoft id_token', { status: 502 });
  }

  if (!email) {
    return new Response('No email found in Microsoft token', { status: 403 });
  }

  // Look up member by email
  let memberName = lookupMemberByEmail(email, competition, env);

  // If no mapping, try matching against config members
  if (!memberName) {
    const repo = env.GITHUB_REPO;
    const ghToken = env.GITHUB_TOKEN;
    const configPath = `competitions/${competition}/config.json`;
    const { content: configData } = await readGitHubFile(repo, configPath, ghToken);
    if (configData) {
      const memberNames = (configData.members || []).map(m => m.name);
      memberName = memberNames.find(n =>
        n.toLowerCase() === (displayName || '').toLowerCase() ||
        n.toLowerCase() === email.split('@')[0].toLowerCase()
      );
    }
  }

  if (!memberName) {
    const origin = env.CORS_ORIGIN || 'https://narehk.github.io/Rocktober';
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${origin}/index.html#competition=${encodeURIComponent(competition)}&auth_error=${encodeURIComponent('No matching member found for ' + email)}`,
      },
    });
  }

  const secret = env.AUTH_SECRET || 'rocktober-default-secret';
  const sessionToken = await generateToken(memberName, competition, secret);

  const redirectUrl = buildFrontendRedirect(env, competition, sessionToken, memberName);
  return new Response(null, {
    status: 302,
    headers: { 'Location': redirectUrl },
  });
}
