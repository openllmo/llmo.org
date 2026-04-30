// Cloudflare Pages Function: JWKS proxy for the LLMO validator.
// Fetches /.well-known/llmo-keys.json from the requested domain
// server-side to bypass browser CORS restrictions.

const FETCH_TIMEOUT_MS = 5000;
const MAX_RESPONSE_BYTES = 100_000;

// Hostname validation: lowercase letters, digits, dots, hyphens.
// No IP literals, no port, no path, no scheme. Must contain at
// least one dot (rule out localhost, intranet hosts).
const HOSTNAME_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
]);

function isLikelyIpLiteral(host) {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (host.includes(':')) return true;
  return false;
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store',
    },
  });
}

export const onRequestGet = async ({ request }) => {
  const url = new URL(request.url);
  const rawDomain = url.searchParams.get('domain');

  if (!rawDomain) {
    return jsonResponse(400, {
      error: 'missing_domain',
      detail: 'Required query parameter "domain" was not provided.',
    });
  }

  const domain = rawDomain.toLowerCase().trim();

  if (domain.length === 0 || domain.length > 253) {
    return jsonResponse(400, {
      error: 'invalid_domain',
      detail: 'Domain length must be between 1 and 253 characters.',
    });
  }

  if (BLOCKED_HOSTS.has(domain) || isLikelyIpLiteral(domain)) {
    return jsonResponse(400, {
      error: 'invalid_domain',
      detail: 'IP literals and internal hostnames are not permitted.',
    });
  }

  if (!HOSTNAME_RE.test(domain)) {
    return jsonResponse(400, {
      error: 'invalid_domain',
      detail: 'Domain must be a valid public hostname.',
    });
  }

  const target = `https://${domain}/.well-known/llmo-keys.json`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let upstream;
  try {
    upstream = await fetch(target, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      cf: { cacheTtl: 0, cacheEverything: false },
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return jsonResponse(504, {
        error: 'upstream_timeout',
        detail: `JWKS fetch from ${domain} exceeded ${FETCH_TIMEOUT_MS}ms.`,
      });
    }
    return jsonResponse(502, {
      error: 'upstream_unreachable',
      detail: `Could not connect to ${domain}.`,
    });
  }
  clearTimeout(timer);

  if (!upstream.ok) {
    return jsonResponse(upstream.status === 404 ? 404 : 502, {
      error: 'upstream_error',
      detail: `Upstream returned status ${upstream.status} for ${target}.`,
      upstream_status: upstream.status,
    });
  }

  const contentLength = parseInt(upstream.headers.get('content-length') || '0', 10);
  if (contentLength > MAX_RESPONSE_BYTES) {
    return jsonResponse(502, {
      error: 'upstream_too_large',
      detail: `JWKS exceeds maximum allowed size of ${MAX_RESPONSE_BYTES} bytes.`,
    });
  }

  const text = await upstream.text();
  if (text.length > MAX_RESPONSE_BYTES) {
    return jsonResponse(502, {
      error: 'upstream_too_large',
      detail: `JWKS body exceeds maximum allowed size of ${MAX_RESPONSE_BYTES} bytes.`,
    });
  }

  try {
    JSON.parse(text);
  } catch {
    return jsonResponse(502, {
      error: 'upstream_invalid_json',
      detail: 'Upstream response was not valid JSON.',
    });
  }

  const upstreamCacheControl = upstream.headers.get('cache-control');

  return new Response(text, {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store',
      ...(upstreamCacheControl ? { 'x-upstream-cache-control': upstreamCacheControl } : {}),
    },
  });
};
