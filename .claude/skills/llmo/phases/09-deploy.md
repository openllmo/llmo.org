# Phase 09: Deploy

## Goal

Serve the signed `llmo-signed.json` (as `llmo.json`) and the public `llmo-keys.json` at `/.well-known/` on the publisher's domain over HTTPS, with correct content types and cache headers. Confirm both URLs resolve before exiting the phase.

## Inputs

- `llmo-signed.json` (from phase 08), to be served at `https://<primary_domain>/.well-known/llmo.json`.
- `llmo-keys.json` (from phase 07), to be served at `https://<primary_domain>/.well-known/llmo-keys.json`.
- Publisher's hosting platform (Vercel, Netlify, Cloudflare Pages, GitHub Pages, AWS S3+CloudFront, custom Nginx/Apache, or other).

## Outputs

- `https://<primary_domain>/.well-known/llmo.json` returns the signed document with HTTP 200.
- `https://<primary_domain>/.well-known/llmo-keys.json` returns the JWKS with HTTP 200.
- Both URLs serve over HTTPS only (HTTP redirects to HTTPS).
- Content-Type headers match spec §2.2 (`application/llmo+json` preferred, `application/json` as fallback).
- `Cache-Control` on the JWKS is `max-age <= 86400` per spec X3.

## Recipe

1. Ask the publisher which hosting platform serves their domain. Branch by platform:

   **Vercel / Next.js:**
   1. Place the two files in `public/.well-known/` in the project repo: `public/.well-known/llmo.json`, `public/.well-known/llmo-keys.json`.
   2. Add response headers in `vercel.json`:
      ```json
      {
        "headers": [
          { "source": "/.well-known/llmo.json", "headers": [
            { "key": "Content-Type", "value": "application/llmo+json" },
            { "key": "Cache-Control", "value": "max-age=3600" },
            { "key": "Access-Control-Allow-Origin", "value": "*" }
          ] },
          { "source": "/.well-known/llmo-keys.json", "headers": [
            { "key": "Content-Type", "value": "application/json" },
            { "key": "Cache-Control", "value": "max-age=86400" },
            { "key": "Access-Control-Allow-Origin", "value": "*" }
          ] }
        ]
      }
      ```
   3. Commit, push, deploy.

   **Netlify:**
   1. Place files in `static/.well-known/` (for Hugo / static-site generators) or `public/.well-known/` (for builds that output there).
   2. Add to `netlify.toml`:
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
   3. Commit, push, deploy.

   **Cloudflare Pages:**
   1. Place files in the project's static output directory (varies by framework — Hugo: `static/.well-known/`, Astro: `public/.well-known/`, etc.).
   2. Add `_headers` file at the project root or in the output dir:
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
   3. Commit, push, deploy (or upload to Pages via Wrangler).

   **GitHub Pages:**
   1. Place files in the published branch's `.well-known/` directory. Note GitHub Pages doesn't allow custom response headers; content type is inferred from the file extension. The `.json` extension yields `Content-Type: application/json` (acceptable per §2.2 fallback). `Cache-Control` is not customizable here; consumers will rely on their own caching semantics.
   2. Commit, push. GitHub Pages auto-deploys.

   **AWS S3 + CloudFront:**
   1. Upload both files to the S3 bucket at `.well-known/llmo.json` and `.well-known/llmo-keys.json`.
   2. Set object metadata: `Content-Type: application/llmo+json` (or `application/json`) and `Cache-Control: max-age=3600` (or `86400` for the JWKS).
   3. Invalidate the CloudFront distribution's cache: `/.well-known/llmo.json` and `/.well-known/llmo-keys.json`.

   **Custom Nginx:**
   ```nginx
   location = /.well-known/llmo.json {
     add_header Content-Type application/llmo+json;
     add_header Cache-Control "max-age=3600";
     add_header Access-Control-Allow-Origin *;
     alias /var/www/llmo/llmo.json;
   }
   location = /.well-known/llmo-keys.json {
     add_header Content-Type application/json;
     add_header Cache-Control "max-age=86400";
     add_header Access-Control-Allow-Origin *;
     alias /var/www/llmo/llmo-keys.json;
   }
   ```

   **Custom Apache:**
   Equivalent `.htaccess` rules with `Header set Content-Type` and `Header set Cache-Control` directives in a `<Location>` block.

   **Other / unknown:** Generic instructions — place files at `/.well-known/llmo.json` and `/.well-known/llmo-keys.json` served over HTTPS; configure response headers per spec §2.2 (Content-Type) and §5.3 X3 (Cache-Control on JWKS).

2. After the publisher deploys, smoke-test both URLs with `curl`:
   ```
   curl -i https://<primary_domain>/.well-known/llmo.json
   curl -i https://<primary_domain>/.well-known/llmo-keys.json
   ```
   Confirm HTTP 200 on both, correct Content-Type, Cache-Control within spec.

3. If the publisher opted into phase 06 (`dns_corroboration`), confirm the TXT record propagation:
   ```
   dig +short TXT _llmo-corroboration.<primary_domain>
   ```
   Confirm the value matches what was published in phase 08.

4. Proceed to phase 10.

## CLI calls

- `curl -i <url>` for HTTP smoke testing.
- `dig +short TXT <record>` for DNS verification (if phase 06).
- The `llmo` CLI's `doctor` subcommand may also be useful as a holistic deploy check.

## Defaults

- HTTPS required. HTTP-only hosting is non-conforming (spec §2.3) and the skill should refuse to proceed.
- Content-Type for `llmo.json`: `application/llmo+json` preferred, `application/json` acceptable (the IANA-registered media type is a v0.2-milestone item; current hosts often don't recognize `application/llmo+json`).
- Cache-Control for `llmo.json`: 3600 seconds default (publishers can choose; spec doesn't mandate). For `llmo-keys.json`: 86400 seconds upper bound per X3.
- `Access-Control-Allow-Origin: *`: recommended so browser-based consumers (like the validator at https://llmo.org/validator/) can fetch the doc.

## Decisions

- **HTTP-only hosting.** Refuse to proceed. The publisher must add HTTPS first (Let's Encrypt + their hosting platform is usually the path).
- **Redirects.** Cross-origin redirects (one domain to another) are non-conforming (spec §2.3). Within-domain redirects (`/llmo.json` → `/.well-known/llmo.json`) are permitted but not recommended; serve at the well-known path directly.
- **Compression.** Gzip/Brotli transport compression is fine (it's reversed before parsing); content-level transformation (CDN minification, key reordering) breaks signatures and must be disabled. The skill warns the publisher about this if their hosting is known to do content transformation (some CDNs do).

## Failure modes

- **Publisher's hosting platform isn't covered above.** Provide generic Nginx-style instructions and recommend they consult their platform's documentation for setting `Content-Type` and `Cache-Control` response headers at the `/.well-known/` paths.
- **Files deploy but URLs return 404.** Most common cause: hosting platform doesn't serve files under `.well-known/` because of dot-prefix conventions. Confirm the platform allows dot-directories (Vercel, Netlify, Cloudflare Pages all do; some older configurations may not).
- **HTTPS works but Cache-Control header missing.** Some platforms (GitHub Pages, some CDN edge configs) ignore custom headers. Note in the publisher's report that X3 will fail on the live validator; suggest a hosting move if Strict tier matters.
- **Content-Type returns `text/plain` or `application/octet-stream`.** Platform-specific config issue. Walk through the platform's docs to set the correct MIME type.
