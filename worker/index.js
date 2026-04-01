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

      if (url.pathname === '/react' && request.method === 'POST') {
        return await handleReact(request, env, corsHeaders);
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
// GET /search (iTunes Search API — free, no auth)
// ---------------------

async function handleSearch(url, env, corsHeaders) {
  const query = url.searchParams.get('q');
  if (!query || query.trim().length === 0) {
    return json({ error: 'Missing query parameter "q"' }, corsHeaders, 400);
  }

  const itunesUrl = new URL('https://itunes.apple.com/search');
  itunesUrl.searchParams.set('term', query.trim());
  itunesUrl.searchParams.set('media', 'music');
  itunesUrl.searchParams.set('entity', 'song');
  itunesUrl.searchParams.set('limit', '10');
  itunesUrl.searchParams.set('country', 'US');

  const res = await fetch(itunesUrl.toString());

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Search failed (${res.status}): ${text}`);
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
  roundData.comments.push({
    author,
    text: text.trim(),
    timestamp: new Date().toISOString(),
  });

  await writeGitHubFile(repo, filePath, roundData, sha, `Comment: ${author} on round ${day}`, token);

  return json({ success: true, totalComments: roundData.comments.length }, corsHeaders);
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
