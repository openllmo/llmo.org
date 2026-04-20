# DNS and Hosting Infrastructure

This document records the DNS and hosting configuration for llmo.org and related services, for future maintainers. Last verified: 2026-04-20.

## Domain registrar

llmo.org is registered at GoDaddy. Registrar account owned by Diverse.org. Do not transfer the registration to a different registrar without the editor's explicit authorization; registrar transfers require 60-day post-creation wait periods and can disrupt TLS certificate issuance if mistimed.

A future migration to Cloudflare Registrar is under consideration. It would consolidate DNS and registration under a single account (team@diverse.org Cloudflare account) and eliminate GoDaddy as a dependency.

## DNS

DNS is served by Cloudflare. The `llmo.org` zone is under the Cloudflare account owned by `team@diverse.org` (account ID `5d9418e9813fd14854487fc005ff07c1`).

Cloudflare-assigned nameservers:
- `liv.ns.cloudflare.com`
- `noah.ns.cloudflare.com`

Verify the current authoritative nameservers with:

    dig llmo.org NS +short

To change DNS records, use the Cloudflare dashboard (https://dash.cloudflare.com) or a scoped API token (see "API access" below). The wrangler OAuth flow grants only `zone:read`; record edits require a custom API token with `Zone → DNS → Edit` on the llmo.org zone.

## Records (as of 2026-04-20, post-migration)

| Type  | Name                         | Content                                                       | Prio | Proxy |
|-------|------------------------------|---------------------------------------------------------------|------|-------|
| A     | llmo.org                     | 76.76.21.21 (Vercel/Mintlify apex)                            | -    | off   |
| CNAME | www.llmo.org                 | llmo.org                                                      | -    | off   |
| MX    | llmo.org                     | aspmx.l.google.com                                            | 1    | -     |
| MX    | llmo.org                     | alt1.aspmx.l.google.com                                       | 5    | -     |
| MX    | llmo.org                     | alt2.aspmx.l.google.com                                       | 5    | -     |
| MX    | llmo.org                     | alt3.aspmx.l.google.com                                       | 10   | -     |
| MX    | llmo.org                     | alt4.aspmx.l.google.com                                       | 10   | -     |
| TXT   | llmo.org                     | `v=spf1 include:_spf.google.com ~all`                         | -    | -     |
| TXT   | llmo.org                     | `google-site-verification=9cVPMzmjnWRIRKeJn0LS8moNN7AsN2ezxuBRcPD_aG0` | - | - |
| TXT   | _dmarc.llmo.org              | `v=DMARC1; p=none; rua=mailto:dmarc@llmo.org;`                | -    | -     |
| TXT   | google._domainkey.llmo.org   | RSA 2048-bit DKIM public key                                  | -    | -     |

Notes on the records:

- The apex `A` record points at Vercel/Mintlify's shared edge IP. Cloudflare proxying is deliberately OFF (grey cloud). Mintlify and Vercel manage their own TLS termination; proxying through Cloudflare can interact poorly with their edge.
- The `www` CNAME is a plain alias to the apex. Proxy off for the same reason.
- Mail is handled by Google Workspace. All five standard Google MX records are present with correct priorities.
- SPF was migrated from a GoDaddy-specific two-hop flattener (`_spfm.llmo.org` indirection) to a direct single-hop record on migration day.
- DMARC is currently report-only (`p=none`). Moving to `p=quarantine` or `p=reject` requires first monitoring aggregate reports for a period to confirm no legitimate mail will be affected. Deferred.
- No AAAA records (Mintlify/Vercel apex is IPv4 only). Revisit after the site migrates off Mintlify.
- No CAA records yet. Adding CAA restrictions to specific certificate authorities is a defensive hardening step queued for a follow-up.

## Hosting

**Specification site (`llmo.org`):** Mintlify. Mintlify builds from the GitHub repository `openllmo/llmo.org` on pushes to `main`. Mintlify is expected to be replaced for specific interactive surfaces (such as the validator) by self-controlled infrastructure. See `infrastructure/VALIDATOR.md` (Phase 2) for validator hosting.

**Mail (`@llmo.org`):** Google Workspace, delivered via the MX records above. The editor's address `spec@llmo.org` is functional.

## API access

The wrangler OAuth flow on `team@diverse.org` grants these scopes relevant to DNS:

- `zone:read` (can list records)
- (no `dns_records:edit` or `zone:edit`)

To make record changes programmatically, mint a Custom API Token from the Cloudflare dashboard with the following scopes:

- `Zone → DNS → Edit` on specific zone `llmo.org`
- `Account → Cloudflare Pages → Edit` on account `5d9418e9813fd14854487fc005ff07c1` (needed for Phase 2: validator hosting)

Export the token as `CLOUDFLARE_API_TOKEN` in the environment for API calls.

Do not commit the token to the repo. Do not paste it into PR descriptions. Tokens are personal credentials equivalent to a password; store them in a password manager under the Diverse.org Cloudflare account entry.

## Migration log

**2026-04-20:** DNS migrated from GoDaddy nameservers (`ns45.domaincontrol.com`, `ns46.domaincontrol.com`) to Cloudflare (`liv.ns.cloudflare.com`, `noah.ns.cloudflare.com`). SPF rewritten from GoDaddy-specific two-hop flattener to direct single-hop include of `_spf.google.com`. All other records carried over unchanged. Nameserver change completed at registrar at approximately 2026-04-20T18:15 UTC; full propagation across major public resolvers within 35 minutes, with residual caching on Google's `8.8.8.8` clearing within the hour. Site and mail remained functional throughout the cutover; no downtime observed.

## Contact

- General issues: GitHub Issues on `openllmo/llmo.org`
- Editor: `spec@llmo.org`
- Operational infrastructure access: `team@diverse.org` Cloudflare account. Recovery codes and 2FA configured.
