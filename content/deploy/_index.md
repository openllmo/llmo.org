---
title: "Deploy LLMO"
linkTitle: "Deploy"
description: "Publish a signed llmo.json on your domain in less than 3 minutes."
date: 2026-04-29
weight: 5
---

Publish a signed llmo.json on your domain. Most developers get this deployed in less than 3 minutes on Vercel, Netlify, or Cloudflare Pages. This timing probably expands a bit closer to ~10 minutes if you're configuring a custom server or hitting hosting quirks for the first time.

This guide assumes you control a domain and can put files at /.well-known/ on it. If you can deploy a robots.txt, you can deploy a llmo.json.

## What you'll have at the end

- A keypair you own (private key local, public JWKS published).
- A signed `llmo.json` at `https://yourdomain.com/.well-known/llmo.json`
  containing your declared identity, canonical URLs, and any claims
  you choose to make.
- A health check showing your deployment is correct and verifiable.

## Prerequisites

- Node.js 20 or later. Check with `node --version`. If you don't have
  it, install from [nodejs.org](https://nodejs.org).
- A domain you control, with the ability to serve files at
  `/.well-known/` paths over HTTPS.
- A terminal.

## Step 1: Install the CLI

```bash
npm install -g llmo
```

Verify:

```bash
llmo --help
```

You should see five subcommands: `init`, `keygen`, `sign`, `verify`,
`doctor`.

## Step 2: Generate a signing key

```bash
mkdir my-llmo && cd my-llmo
llmo keygen --alg ES256 --kid yourname-2026-01
```

This produces two files:

- `llmo-private-yourname-2026-01.pem`: your private key. **Never
  commit this to git.** Add it to `.gitignore` immediately, store
  the contents in a secrets manager (1Password, AWS Secrets Manager,
  GitHub Actions secrets) for any future automation.
- `llmo-keys.json`: the public JWKS. This gets published, alongside
  the signed document, at `/.well-known/llmo-keys.json` on your domain.

The `--kid` value is a key identifier you choose. The convention
`yourname-YYYY-NN` works fine; the format doesn't matter as long as
it's stable and you don't reuse it.

## Step 3: Scaffold your llmo.json

```bash
llmo init \
  --non-interactive \
  --name "Your Organization Name" \
  --domain yourdomain.com \
  --include-claims canonical_urls,official_channels \
  --validity-days 90
```

Or run `llmo init` with no flags for interactive prompts.

This writes a starter `llmo.json` to the current directory. Open it
in your editor and customize:

- Add your real homepage, docs, and security URLs to the
  `canonical_urls` claim.
- Add your real email domains and social handles to the
  `official_channels` claim.
- Add a `disavowal` claim if there are domains, accounts, or
  attributions you want to publicly repudiate.
- Add a `personnel` claim if you want to declare who's authorized
  to speak for the organization.

See the [specification §3](/spec/v0.1#3-core-schema) for the full
claim type reference.

## Step 4: Sign it

```bash
llmo sign llmo.json \
  --key ./llmo-private-yourname-2026-01.pem \
  --kid yourname-2026-01 \
  --in-place
```

The CLI canonicalizes the document per RFC 8785 (JCS), signs the
canonical bytes with your private key per RFC 7515 (JWS), and
attaches the signature.

The CLI will print a reminder verbatim:

> Sign last. Serve byte-stable. Do not let your CDN, framework, or
> pre-commit hook reformat this file after signing.

This matters. If your hosting platform reformats JSON files (some
do), the signature breaks. More on this in Step 5.

## Step 5: Deploy to your domain

You need to publish two files at well-known paths over HTTPS:

| File | Path on your domain |
|------|---------------------|
| `llmo.json` (signed) | `https://yourdomain.com/.well-known/llmo.json` |
| `llmo-keys.json` | `https://yourdomain.com/.well-known/llmo-keys.json` |

How you do this depends on your hosting. Common patterns:

### Vercel / Next.js

Place the files in `public/.well-known/` in your repo. Vercel serves
them as-is. Add to `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/.well-known/llmo.json",
      "headers": [
        { "key": "Content-Type", "value": "application/llmo+json" },
        { "key": "Cache-Control", "value": "max-age=3600" },
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    },
    {
      "source": "/.well-known/llmo-keys.json",
      "headers": [
        { "key": "Content-Type", "value": "application/json" },
        { "key": "Cache-Control", "value": "max-age=86400" },
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```

Commit, push, deploy.

### Netlify

Place files in `static/.well-known/` (Hugo) or `public/.well-known/`
(other generators). Add to `netlify.toml`:

```toml
[[headers]]
  for = "/.well-known/llmo.json"
  [headers.values]
    Content-Type = "application/llmo+json"
    Cache-Control = "max-age=3600"
    Access-Control-Allow-Origin = "*"

[[headers]]
  for = "/.well-known/llmo-keys.json"
  [headers.values]
    Content-Type = "application/json"
    Cache-Control = "max-age=86400"
    Access-Control-Allow-Origin = "*"
```

### Cloudflare Pages

Same as Netlify: place files in your build output's `.well-known/`
directory. Use a `_headers` file at the root:

```
/.well-known/llmo.json
  Content-Type: application/llmo+json
  Cache-Control: max-age=3600
  Access-Control-Allow-Origin: *

/.well-known/llmo-keys.json
  Content-Type: application/json
  Cache-Control: max-age=86400
  Access-Control-Allow-Origin: *
```

### AWS S3 + CloudFront

Upload via aws CLI. Set Content-Type metadata at upload time:

```bash
aws s3 cp llmo.json s3://yourbucket/.well-known/llmo.json \
  --content-type "application/llmo+json" \
  --cache-control "max-age=3600"

aws s3 cp llmo-keys.json s3://yourbucket/.well-known/llmo-keys.json \
  --content-type "application/json" \
  --cache-control "max-age=86400"
```

Configure CloudFront to add `Access-Control-Allow-Origin: *` via a
response headers policy.

### nginx (raw)

Drop the files into your web root's `.well-known/` directory. Add
to your `server` block:

```nginx
location /.well-known/llmo.json {
  default_type application/llmo+json;
  add_header Cache-Control "max-age=3600";
  add_header Access-Control-Allow-Origin "*";
}

location /.well-known/llmo-keys.json {
  default_type application/json;
  add_header Cache-Control "max-age=86400";
  add_header Access-Control-Allow-Origin "*";
}
```

Reload nginx.

### WordPress / shared hosting

Use FTP or cPanel's file manager to upload to a `.well-known/`
directory at your web root. WordPress doesn't normally serve files
under `/.well-known/`, so check your hosting's `.htaccess` or
equivalent to make sure the path isn't being intercepted by the
WordPress router.

### GitHub Pages

Place files in `.well-known/` at your repo root. GitHub Pages serves
them with reasonable defaults. Custom headers (Content-Type,
Cache-Control) require a build pipeline like Jekyll plugins or a
proxy in front.

### A note on byte stability

Some platforms reformat JSON during deploy: pretty-printing,
re-ordering keys, normalizing whitespace, transcoding encodings. Any
of those breaks the signature. If you're using a build system that
might transform files, deploy `llmo.json` as a static asset that
bypasses transformation, or test with `llmo doctor yourdomain.com`
immediately after deploy to catch byte-instability fast.

## Step 6: Verify your deployment

After your changes are live:

```bash
llmo doctor yourdomain.com --require-tier strict
```

The `doctor` command fetches the deployed file, runs every
consumer-side check, refetches twice with a 2-second gap to catch
CDN reformatting, and prints a checklist. Expected output ends with:

```
Tier: STRICT
Signature: valid
Freshness: in window
```

Common issues and fixes:

| Symptom | Fix |
|---------|-----|
| `Tier: MINIMAL` (not Standard) | Add `canonical_urls` and `official_channels` claims, re-sign, redeploy. |
| `Signature: invalid` | Hosting reformatted the file post-deploy. See "byte stability" above. Re-sign and redeploy with a static-asset path. |
| `Content-Type incorrect` | Configure your hosting to serve `application/llmo+json` or at minimum `application/json`. |
| `JWKS unreachable` | Confirm `llmo-keys.json` is at `/.well-known/llmo-keys.json` on the same domain, with `Cache-Control: max-age <= 86400`. |
| `Cache-Control max-age > 86400` on JWKS | Lower it. The spec caps JWKS cache at 24 hours. |

## Maintenance

Republish your `llmo.json` quarterly or when material changes happen
(new canonical URL, new disavowal, key rotation). The `valid_until`
window is a soft expiration: stale documents are still verifiable
but consumers will weight them lower or refetch.

To rotate keys:

```bash
llmo keygen --alg ES256 --kid yourname-2026-q3
```

The CLI appends the new public JWK to your existing JWKS file
(rather than overwriting), so old signatures continue to verify
during the rotation window. Sign new documents with the new key;
keep the old key's JWK in the JWKS for at least 90 days per
specification §4.2.

## Going further

- Add `llmo doctor yourdomain.com` to your CI as a post-deploy check.
- Wire `llmo sign` into your deploy pipeline so re-signing happens
  automatically on every deploy. The
  [GitHub Actions snippet in the README](https://github.com/openllmo/cli#github-actions-snippet)
  shows the pattern.
- Read the [specification](/spec/v0.1) in full if you want to author
  claim types specific to your domain (the extension namespace
  mechanism in §3.6).
- File issues at the [CLI repo](https://github.com/openllmo/cli/issues)
  or [spec repo](https://github.com/openllmo/llmo.org/issues).

---

You're now publishing verifiable, signed organizational identity at
a well-known location. AI agents and language models that consume
LLMO will read your claims directly rather than synthesizing them
from third-party content.
