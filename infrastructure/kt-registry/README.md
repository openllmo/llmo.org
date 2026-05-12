# LLMO KT Registry: deployment guide

This directory holds the operational artifacts for the LLMO Key Transparency registry per [ADR-0010](/adr/0010-kt-registry-operations/). The protocol-level spec is [LIP-4](/spec/lips/lip-0004/) and the implementer-facing API contract is at [/spec/v0.1/kt-registry-endpoints/](/spec/v0.1/kt-registry-endpoints/).

The runtime consists of two deployables:

1. **Pages Functions** at `functions/kt/v1/*` in the repo root. Deployed automatically by the existing Cloudflare Pages build that serves llmo.org. Handles `POST /kt/v1/entries`, `GET /kt/v1/entries`, `GET /kt/v1/entries/{id}`, `GET /kt/v1/snapshot/latest`, `GET /kt/v1/snapshot/{id}`.
2. **Snapshot Worker** at `snapshot-worker/` in this directory. Separate Cloudflare Worker project with a cron trigger; runs every day at 02:00 UTC. Computes the SHA-384 hash of the deployed log, signs the snapshot with the registry's ES384 key, writes to KV.

The flat append-only log file at `static/kt/v1/log.jsonl` is served by Cloudflare Pages as a static asset and is the canonical record. D1 is the query accelerator for the dynamic endpoints. A future operator-managed flush (D1 -> commit to the repo) will keep the file in sync with D1; this is documented as a follow-up below.

## First-time provisioning (Cloudflare-side)

Performed once by the operator with Cloudflare account access. The operator needs `wrangler` v3 or later installed locally and authenticated to the openllmo Cloudflare account.

### 1. Generate the registry signing keypair

ES384 keypair, per ADR-0010 §4. Generated using `openssl`:

```bash
mkdir -p /tmp/kt-keygen && cd /tmp/kt-keygen

# Generate ES384 (P-384) private key in PEM
openssl ecparam -name secp384r1 -genkey -noout -out kt-signing-key.pem

# Export as JWK (private)
openssl pkey -in kt-signing-key.pem -text -noout > kt-signing-key.txt
# Manually construct the JWK from the openssl output, or use a tool
# such as `jwx jwk` or `step crypto jwk create` (recommended):
step crypto jwk create kt-signing-key.pub.jwk kt-signing-key.priv.jwk \
  --kty EC --crv P-384 --no-password --insecure
```

Choose a `kid` for the registry. Convention: `llmo-kt-<YYYY>-01`. For 2026: `llmo-kt-2026-01`.

Store the private JWK in two places:

- **Cloudflare Workers Secrets**: see step 4 below.
- **1Password secure note** titled `LLMO KT registry signing key (llmo-kt-2026-01)`, in the editor's personal vault. This is the disaster-recovery primitive.

Publish the public JWK at `static/.well-known/llmo-keys.json` on the llmo.org site (or alongside any existing JWKS entries there). Consumers verify snapshots and receipts against this public JWK.

### 2. Create the D1 database

```bash
wrangler d1 create llmo-kt-registry
```

Record the returned database ID. It looks like:

```
[[d1_databases]]
binding = "KT_DB"
database_name = "llmo-kt-registry"
database_id = "01234567-89ab-cdef-0123-456789abcdef"
```

Apply the schema:

```bash
wrangler d1 execute llmo-kt-registry \
  --file=infrastructure/kt-registry/schema.sql --remote
```

### 3. Create the KV namespace

```bash
wrangler kv:namespace create KT_KV
```

Record the returned namespace ID. It looks like:

```
[[kv_namespaces]]
binding = "KT_KV"
id = "abcdef0123456789abcdef0123456789"
```

### 4. Bind D1 and KV to the Pages project, and provision Workers Secrets

In the Cloudflare dashboard, navigate to the llmo.org Pages project -> Settings -> Functions:

- **D1 database bindings**: add `KT_DB` -> the D1 database created in step 2.
- **KV namespace bindings**: add `KT_KV` -> the KV namespace created in step 3.
- **Environment variables (encrypt)**:
  - `KT_SIGNING_KEY_JWK`: paste the JSON contents of the private JWK file from step 1.
  - `KT_SIGNING_KID`: the kid string (e.g. `llmo-kt-2026-01`).

Save. Trigger a redeploy of the Pages project so the bindings take effect.

### 5. Deploy the snapshot Worker

Edit `snapshot-worker/wrangler.toml` to replace `REPLACE_WITH_KT_KV_NAMESPACE_ID` with the namespace ID from step 3.

Then:

```bash
cd infrastructure/kt-registry/snapshot-worker
wrangler deploy
wrangler secret put KT_SIGNING_KEY_JWK   # paste the same JSON as in step 4
wrangler secret put KT_SIGNING_KID       # paste the same kid string
# Optional: enable manual snapshot trigger
wrangler secret put MANUAL_SNAPSHOT_TOKEN # paste a random secret token
```

The cron trigger (`crons = ["0 2 * * *"]`) is registered automatically on `wrangler deploy`. The Worker will run every day at 02:00 UTC.

### 6. Bootstrap an initial empty log file

To allow the first snapshot to succeed, commit an empty placeholder log file:

```bash
mkdir -p static/kt/v1
touch static/kt/v1/log.jsonl
git add static/kt/v1/log.jsonl
git commit -m "feat(kt): initial empty log placeholder"
```

This ensures the snapshot Worker on its first run finds the file (with zero entries) and can produce a valid initial snapshot.

## Operational notes

### Snapshot manual trigger

If a snapshot is needed off-cycle (e.g., after a publisher batch-registers, or during a compromise response), trigger manually:

```bash
curl -X POST https://llmo-kt-snapshot.<account>.workers.dev \
  -H "Authorization: Bearer <MANUAL_SNAPSHOT_TOKEN>"
```

Returns the new snapshot's metadata as JSON.

### D1-to-log flush (follow-up work)

The current implementation appends entries to D1 but does not auto-flush them to the static `static/kt/v1/log.jsonl` file. Until this flush is implemented, the log file is updated only by manual commit. The pattern intended for the v0.1.x flush:

- A scheduled GitHub Action (or a second Cloudflare Worker with cron trigger every 60 minutes) queries D1 for entries with `log_position > last_committed_log_position`, appends them to the log file, commits via the `llmo-kt-bot[bot]` GitHub App identity.

Tracked as a follow-up implementation task.

### Rate-limit cleanup

D1 does not auto-evict expired rate-limit rows. Operator runs a daily cleanup:

```bash
wrangler d1 execute llmo-kt-registry \
  --command="DELETE FROM rate_limits WHERE window_start < datetime('now', '-24 hours');"
```

This can be wired into the same scheduled GitHub Action that does the D1-to-log flush.

### Snapshot signing-key rotation

Annual cadence per ADR-0010 §4. Procedure:

1. Generate a new ES384 keypair (step 1 above) with a new kid (e.g. `llmo-kt-2027-01`).
2. Publish the new public JWK in the llmo.org JWKS alongside the previous one.
3. Update both the Pages project (step 4) and the snapshot Worker (step 5) Secrets with the new private JWK and kid.
4. Trigger a manual snapshot using the new key. Verify the snapshot signs and verifies.
5. Wait 90 days, then remove the previous public JWK from the JWKS.

## Verification (operator-side)

After provisioning, verify the registry is alive:

```bash
# Should return 200 with empty entries array
curl https://llmo.org/kt/v1/entries?domain=example.com

# After at least one snapshot has run, should return the signed snapshot JWS
curl https://llmo.org/kt/v1/snapshot/latest
```

A canonical end-to-end test (publisher submits a real entry, registry validates, returns receipt, snapshot picks it up next cycle) is the right smoke test once the `llmo register` CLI subcommand ships.

## Compromise response

If the registry's private signing key is compromised:

1. Revoke the Workers Secret immediately in the dashboard (or via `wrangler secret delete`).
2. Generate a new keypair (step 1).
3. Publish the new public JWK in the JWKS and remove the compromised one.
4. Sign a "transition snapshot" with the new key whose payload explicitly references the compromised previous kid.
5. Post a signed advisory at `llmo.org/incidents/`.

Consumers who retained snapshots signed by the compromised key SHOULD treat them as untrusted for any commitment they did not also see signed by the new key.
