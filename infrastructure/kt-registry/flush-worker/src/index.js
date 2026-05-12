// LLMO KT registry: flush Worker (scheduled).
//
// Runs every 60 minutes (configured in wrangler.toml). Reads new
// entries from D1 (entries whose log_position is higher than the
// highest currently in the static log file at
// static/kt/v1/log.jsonl in the openllmo/llmo.org repo), appends
// them, and commits via the GitHub Contents API.
//
// Without this Worker running, the static log file at
// /kt/v1/log.jsonl would never grow past its initial empty state,
// and the daily snapshot Worker would correspondingly commit only
// to empty content. Together with the snapshot Worker, this Worker
// closes the cryptographic chain that makes the KT property real.
//
// Bindings (set via wrangler.toml + secrets):
//   - env.KT_DB                  D1 database (shared with Pages Functions)
//   - env.GITHUB_TOKEN           Worker Secret with token authorized
//                                to write to openllmo/llmo.org
//                                (fine-grained PAT or App installation
//                                token; either works)
//   - env.MANUAL_FLUSH_TOKEN     Optional bearer token for manual trigger
//
// Constants in this file (not secrets — public design choices):
//   - REPO_OWNER, REPO_NAME      openllmo/llmo.org
//   - REPO_BRANCH                main
//   - FILE_PATH                  static/kt/v1/log.jsonl
//   - GITHUB_API                 https://api.github.com

const REPO_OWNER = 'openllmo';
const REPO_NAME = 'llmo.org';
const REPO_BRANCH = 'main';
const FILE_PATH = 'static/kt/v1/log.jsonl';
const GITHUB_API = 'https://api.github.com';
const USER_AGENT = 'llmo-kt-flush/0.1';

async function githubGet(env, path) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': USER_AGENT,
    },
  });
  if (!response.ok) throw new Error(`GitHub GET ${path}: ${response.status} ${await response.text()}`);
  return response.json();
}

async function githubPut(env, path, body) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`GitHub PUT ${path}: ${response.status} ${await response.text()}`);
  return response.json();
}

function base64Encode(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64Decode(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function fetchCurrentLog(env) {
  // GitHub Contents API: GET /repos/{owner}/{repo}/contents/{path}
  // Returns { content: <base64>, sha: <blob-sha>, ... }
  const path = `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${REPO_BRANCH}`;
  const file = await githubGet(env, path);
  if (file.encoding !== 'base64') {
    throw new Error(`unexpected encoding from GitHub Contents API: ${file.encoding}`);
  }
  // The base64 content from the API includes newlines every 60 chars.
  // atob handles those fine in practice but be defensive.
  const cleanB64 = file.content.replace(/\s+/g, '');
  const bytes = base64Decode(cleanB64);
  const text = new TextDecoder().decode(bytes);
  return { text, sha: file.sha };
}

function highestLogPositionInFile(text) {
  if (!text || text.trim().length === 0) return 0;
  let highest = 0;
  for (const line of text.split('\n')) {
    if (line.trim().length === 0) continue;
    // Each line is a compact JWS. Decode its payload to read log_position?
    // No — the publisher's JWS doesn't carry the log_position. The
    // registry assigns it on append. We track via lines-counted as
    // the high-water mark assuming the file is monotonic. Since the
    // registry only writes appends and assigns log_position
    // sequentially, count-of-lines is the high-water mark.
    highest += 1;
  }
  return highest;
}

async function fetchNewEntriesFromD1(env, highWaterMark) {
  const rows = await env.KT_DB.prepare(
    `SELECT entry_id, log_position, entry_jws
     FROM entries
     WHERE log_position > ?
     ORDER BY log_position ASC`
  ).bind(highWaterMark).all();
  return rows.results || [];
}

async function commitNewLog(env, sha, newText, message) {
  const path = `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
  const body = {
    message,
    content: base64Encode(new TextEncoder().encode(newText)),
    sha,
    branch: REPO_BRANCH,
  };
  return githubPut(env, path, body);
}

async function runFlush(env) {
  // 1. Fetch the current log file from the repo.
  const { text: currentText, sha } = await fetchCurrentLog(env);
  const highWaterMark = highestLogPositionInFile(currentText);

  // 2. Read new entries from D1.
  const newEntries = await fetchNewEntriesFromD1(env, highWaterMark);
  if (newEntries.length === 0) {
    return { flushed: 0, highWaterMark, note: 'no new entries to flush' };
  }

  // 3. Build the new log text. Each line is a compact JWS.
  const newLines = newEntries.map(e => e.entry_jws).join('\n');
  // Preserve trailing newline if existing content has one. If file was
  // empty, write lines + trailing newline. If file was non-empty,
  // append a newline-separator then the new lines plus trailing newline.
  let newText;
  if (currentText.length === 0) {
    newText = newLines + '\n';
  } else if (currentText.endsWith('\n')) {
    newText = currentText + newLines + '\n';
  } else {
    newText = currentText + '\n' + newLines + '\n';
  }

  // 4. Commit.
  const message = newEntries.length === 1
    ? `chore(kt): flush 1 entry from D1 (log_position ${newEntries[0].log_position})`
    : `chore(kt): flush ${newEntries.length} entries from D1 (log_position ${newEntries[0].log_position}-${newEntries[newEntries.length - 1].log_position})`;
  const commit = await commitNewLog(env, sha, newText, message);

  return {
    flushed: newEntries.length,
    fromPosition: newEntries[0].log_position,
    toPosition: newEntries[newEntries.length - 1].log_position,
    commitSha: commit.commit && commit.commit.sha,
    note: 'ok',
  };
}

export default {
  // Cron handler.
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        const result = await runFlush(env);
        console.log('flush ok', JSON.stringify(result));
      } catch (e) {
        console.error('flush failed', e && e.message ? e.message : String(e));
      }
    })());
  },

  // Manual trigger via HTTP.
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Use POST to trigger a flush manually.', { status: 405 });
    }
    const expectedToken = env.MANUAL_FLUSH_TOKEN;
    if (!expectedToken) {
      return new Response('Manual flush trigger not configured.', { status: 503 });
    }
    const auth = request.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ') || auth.slice(7) !== expectedToken) {
      return new Response('Unauthorized.', { status: 401 });
    }
    try {
      const result = await runFlush(env);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'flush_failed', detail: e.message }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
  },
};
