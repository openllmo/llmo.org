// LLMO KT registry: flush Worker (scheduled).
//
// Runs every hour at :05 UTC. Reads new entries from D1 (entries
// whose log_position is higher than the highest currently in the
// static log file at static/kt/v1/log.jsonl in the
// openllmo/llmo.org repo), opens a PR with the appended content,
// and enables auto-merge so it lands once CI passes.
//
// The PR-and-auto-merge pattern (rather than direct push) preserves
// the main-branch protection model documented in ADR-0002. This
// matches the existing llmo-workflow-bot pattern documented in
// ADR-0004 used by weekly-digest and sunday-audit.
//
// Bindings (set via wrangler.toml + secrets):
//   - env.KT_DB                   D1 database
//   - env.KT_BOT_APP_ID           Worker Secret: GitHub App ID
//   - env.KT_BOT_INSTALLATION_ID  Worker Secret: installation ID for
//                                 the App on openllmo/llmo.org
//   - env.KT_BOT_PRIVATE_KEY      Worker Secret: PKCS#8 PEM private
//                                 key for the GitHub App
//   - env.MANUAL_FLUSH_TOKEN      Optional bearer token for manual trigger

const REPO_OWNER = 'openllmo';
const REPO_NAME = 'llmo.org';
const REPO_BASE_BRANCH = 'main';
const FILE_PATH = 'static/kt/v1/log.jsonl';
const GITHUB_API = 'https://api.github.com';
const USER_AGENT = 'llmo-kt-flush/0.2';

// ----------------------------------------------------------------
// Base64 / encoding helpers
// ----------------------------------------------------------------

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

function base64urlEncode(bytes) {
  return base64Encode(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

// ----------------------------------------------------------------
// GitHub App auth: PEM -> CryptoKey -> JWT -> installation token
// ----------------------------------------------------------------

function pemToDerBytes(pem) {
  const body = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '')
    .replace(/\s+/g, '');
  return base64Decode(body);
}

async function importAppPrivateKey(pem) {
  const der = pemToDerBytes(pem);
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function mintAppJwt(env) {
  const key = await importAppPrivateKey(env.KT_BOT_PRIVATE_KEY);
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iat: nowSec - 60,    // backdate 60s to tolerate clock skew
    exp: nowSec + 540,   // 9 min lifetime (GitHub caps at 10)
    iss: env.KT_BOT_APP_ID,
  };
  const headerB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sigBytes = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, signingInput)
  );
  return `${headerB64}.${payloadB64}.${base64urlEncode(sigBytes)}`;
}

async function getInstallationToken(env) {
  const jwt = await mintAppJwt(env);
  const path = `${GITHUB_API}/app/installations/${env.KT_BOT_INSTALLATION_ID}/access_tokens`;
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new Error(`installation token mint: ${response.status} ${await response.text()}`);
  }
  const body = await response.json();
  return body.token;
}

// ----------------------------------------------------------------
// GitHub REST helpers (using installation token)
// ----------------------------------------------------------------

async function ghRequest(token, method, path, body) {
  const init = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': USER_AGENT,
    },
  };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const response = await fetch(`${GITHUB_API}${path}`, init);
  if (!response.ok) {
    throw new Error(`GitHub ${method} ${path}: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function ghGraphQL(token, query, variables) {
  const response = await fetch(`${GITHUB_API}/graphql`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    throw new Error(`GitHub GraphQL: ${response.status} ${await response.text()}`);
  }
  const body = await response.json();
  if (body.errors) {
    throw new Error(`GitHub GraphQL errors: ${JSON.stringify(body.errors)}`);
  }
  return body.data;
}

// ----------------------------------------------------------------
// Log-file reading and assembly
// ----------------------------------------------------------------

async function fetchCurrentLog(token) {
  const file = await ghRequest(
    token,
    'GET',
    `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${REPO_BASE_BRANCH}`
  );
  if (file.encoding !== 'base64') {
    throw new Error(`unexpected encoding from Contents API: ${file.encoding}`);
  }
  const cleanB64 = file.content.replace(/\s+/g, '');
  const text = new TextDecoder().decode(base64Decode(cleanB64));
  return { text, sha: file.sha };
}

function highestLogPositionInFile(text) {
  if (!text || text.trim().length === 0) return 0;
  let count = 0;
  for (const line of text.split('\n')) {
    if (line.trim().length > 0) count += 1;
  }
  return count;
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

function buildNewLogText(currentText, newEntries) {
  const newLines = newEntries.map(e => e.entry_jws).join('\n');
  if (currentText.length === 0) return newLines + '\n';
  if (currentText.endsWith('\n')) return currentText + newLines + '\n';
  return currentText + '\n' + newLines + '\n';
}

// ----------------------------------------------------------------
// Branch + commit + PR + auto-merge
// ----------------------------------------------------------------

async function getBaseBranchSha(token) {
  const ref = await ghRequest(
    token,
    'GET',
    `/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${REPO_BASE_BRANCH}`
  );
  return ref.object.sha;
}

async function createBranch(token, branchName, baseSha) {
  return ghRequest(
    token,
    'POST',
    `/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`,
    {
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    }
  );
}

async function commitFileToBranch(token, branchName, fileSha, newContent, commitMessage) {
  return ghRequest(
    token,
    'PUT',
    `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
    {
      message: commitMessage,
      content: base64Encode(new TextEncoder().encode(newContent)),
      sha: fileSha,
      branch: branchName,
    }
  );
}

async function openPullRequest(token, branchName, title, body) {
  return ghRequest(
    token,
    'POST',
    `/repos/${REPO_OWNER}/${REPO_NAME}/pulls`,
    {
      title,
      body,
      head: branchName,
      base: REPO_BASE_BRANCH,
    }
  );
}

async function enableAutoMerge(token, pullNodeId) {
  const data = await ghGraphQL(
    token,
    `mutation($id: ID!) {
       enablePullRequestAutoMerge(input: { pullRequestId: $id, mergeMethod: SQUASH }) {
         pullRequest { number autoMergeRequest { mergeMethod enabledAt } }
       }
     }`,
    { id: pullNodeId }
  );
  return data.enablePullRequestAutoMerge.pullRequest;
}

// ----------------------------------------------------------------
// Top-level flush flow
// ----------------------------------------------------------------

async function runFlush(env) {
  const token = await getInstallationToken(env);

  const { text: currentText, sha: fileSha } = await fetchCurrentLog(token);
  const highWaterMark = highestLogPositionInFile(currentText);

  const newEntries = await fetchNewEntriesFromD1(env, highWaterMark);
  if (newEntries.length === 0) {
    return { flushed: 0, highWaterMark, note: 'no new entries to flush' };
  }

  const newText = buildNewLogText(currentText, newEntries);

  const branchName = `kt-flush-${Date.now()}`;
  const baseSha = await getBaseBranchSha(token);
  await createBranch(token, branchName, baseSha);

  const fromPos = newEntries[0].log_position;
  const toPos = newEntries[newEntries.length - 1].log_position;
  const commitMessage = newEntries.length === 1
    ? `chore(kt): flush 1 entry from D1 (log_position ${fromPos})`
    : `chore(kt): flush ${newEntries.length} entries from D1 (log_position ${fromPos}-${toPos})`;

  await commitFileToBranch(token, branchName, fileSha, newText, commitMessage);

  const prBody = [
    'Automated LLMO Key Transparency registry flush.',
    '',
    'Synchronizes entries from the D1 query accelerator to the static log file',
    'that the daily snapshot Worker hashes. See',
    '[LIP-4](https://llmo.org/spec/lips/lip-0004/) and',
    '[ADR-0010](https://llmo.org/adr/0010-kt-registry-operations/).',
    '',
    `Range: log_position ${fromPos} through ${toPos} (${newEntries.length} entries).`,
    '',
    'This PR was opened by `llmo-kt-bot[bot]` and will auto-merge once status',
    'checks pass.',
  ].join('\n');

  const pr = await openPullRequest(token, branchName, commitMessage, prBody);
  const automerge = await enableAutoMerge(token, pr.node_id);

  return {
    flushed: newEntries.length,
    fromPosition: fromPos,
    toPosition: toPos,
    pullNumber: pr.number,
    pullUrl: pr.html_url,
    autoMergeEnabledAt: automerge.autoMergeRequest && automerge.autoMergeRequest.enabledAt,
    note: 'ok',
  };
}

// ----------------------------------------------------------------
// Worker entrypoints
// ----------------------------------------------------------------

export default {
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
