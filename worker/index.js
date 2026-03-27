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
        return handleSearch(url, env, corsHeaders);
      }

      if (url.pathname === '/submit' && request.method === 'POST') {
        return handleSubmit(request, env, corsHeaders);
      }

      if (url.pathname === '/vote' && request.method === 'POST') {
        return handleVote(request, env, corsHeaders);
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
// Spotify Auth (Client Credentials)
// ---------------------

/**
 * Get a Spotify access token using client credentials flow.
 * No user account needed — server-to-server auth.
 */
async function getSpotifyToken(env) {
  const credentials = btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`);

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

// ---------------------
// GET /search
// ---------------------

async function handleSearch(url, env, corsHeaders) {
  const query = url.searchParams.get('q');
  if (!query || query.trim().length === 0) {
    return json({ error: 'Missing query parameter "q"' }, corsHeaders, 400);
  }

  const token = await getSpotifyToken(env);

  const spotifyUrl = new URL('https://api.spotify.com/v1/search');
  spotifyUrl.searchParams.set('q', query.trim());
  spotifyUrl.searchParams.set('type', 'track');
  spotifyUrl.searchParams.set('limit', '10');
  spotifyUrl.searchParams.set('market', 'US');

  const res = await fetch(spotifyUrl.toString(), {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify search failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  // Filter to only the fields the frontend needs
  const tracks = (data.tracks?.items || []).map(track => ({
    trackId: track.id,
    title: track.name,
    artist: track.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
    album: track.album?.name || '',
    albumArt: track.album?.images?.[1]?.url  // 300x300
           || track.album?.images?.[0]?.url  // fallback to largest
           || '',
    duration: track.duration_ms,
    previewUrl: track.preview_url || null,
  }));

  return json({ tracks }, corsHeaders);
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

  // 6. Duplicate vote check (server-side — one vote per member per round)
  const existingVotes = roundData.votes || [];
  if (existingVotes.some(v => v.voter === voter)) {
    return json({ error: 'You have already voted in this round' }, corsHeaders, 409);
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
  const encoded = btoa(JSON.stringify(content, null, 2));

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
