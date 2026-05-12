---
title: "ADR-0010: Operating the llmo.org Key Transparency registry"
linkTitle: ADR-0010
description: Operational decisions for running the LLMO Key Transparency (KT) registry specified by LIP-4. Records the storage backend, write-path architecture, snapshot signing infrastructure, signing-key custody, availability posture, scaling trigger from flat append-only log to Merkle tree, and the v0.2 federation roadmap.
author: Nic Chavez <spec@llmo.org>
date: 2026-05-12
status: Accepted
---

## Status

Accepted. Records the operational decisions for running the LLMO Key Transparency registry whose protocol-level specification is defined in [LIP-4](/spec/lips/lip-0004/). LIP-4 is in Draft status at the time this ADR is accepted; the registry can be operationalized while the LIP is still in Draft per the editorial discretion noted in LIP-4's transitions log.

## Context

[LIP-4](/spec/lips/lip-0004/) introduces a public, append-only Key Transparency registry as a normative component of the LLMO protocol. The LIP specifies the protocol layer: the JWS-signed entry format, the registry API (`/kt/v1/`), the SHA-384 hash function choice, the X7 conformance rule, the consumer-side verification flow, and the failure-mode semantics.

The LIP intentionally does not specify the operational layer: where the log is stored, how writes are accepted, where the registry's signing key lives, what the availability commitments are, how snapshots are produced, and when the flat append-only structure migrates to a Merkle tree. Those are operational decisions that may evolve independently of the protocol-layer specification. This ADR records them as of LIP-4 Draft acceptance.

The forces in tension:

- **Operational simplicity.** The registry must be runnable by a single steward (Diverse.org) at v0.1.x scale without dedicated infrastructure engineering. Anything that requires standing up a database cluster, on-call rotation, or specialized operations expertise is out of scope.
- **Cryptographic seriousness.** The registry's signed snapshots are cryptographic commitments. The signing key custody, the snapshot signing pipeline, and the append-only enforcement mechanism all carry the trust property of the registry. Operational shortcuts that erode those properties are not acceptable.
- **Cost discipline.** Diverse.org operates on donations and grants. Recurring infrastructure cost should be at most modest. Free-tier infrastructure is preferred where it does not compromise the trust properties.
- **Future federation.** v0.2 anticipates multiple registry operators (LIP-4 §7.2). The v0.1.x operational architecture should not foreclose a federated deployment; choices that bake llmo.org-specific assumptions deeply into the wire format or the snapshot signing pipeline are penalized.

## Decision

### 1. Storage backend

The registry's log is stored as a flat JSONL file in the `openllmo/llmo.org` Hugo repository at `static/.well-known/kt/v1/log.jsonl` and served as a static asset by Cloudflare Pages. Each line of the file is the compact JWS of one accepted entry. Entries are appended in monotonic order by append timestamp. The file's commit history in git is the secondary audit trail of append events.

The write path is decoupled from the read path. Writes flow through a Cloudflare Worker fronting a Cloudflare D1 database (serverless SQL). Periodically (every 60 minutes), a scheduled Worker rolls the D1 contents into a JSONL file and commits the update to the repository through the GitHub API using a dedicated commit identity (`llmo-kt-bot[bot]`, a GitHub App parallel in design to the existing `llmo-workflow-bot` per [ADR-0004](/adr/0004-github-app-workflow-auth/)).

Read endpoints are served as follows:

- `GET /kt/v1/log.jsonl`: static file from the Hugo build. Cacheable. Cloudflare CDN-edged. The canonical bulk-download surface.
- `GET /kt/v1/entries?domain=<domain>`: Worker route that queries D1 directly. Sub-100ms median latency expected.
- `GET /kt/v1/entries/{entry_id}`: same.
- `GET /kt/v1/snapshot/latest`: Worker route that fetches the most recent signed snapshot from Workers KV.
- `GET /kt/v1/snapshot/{snapshot_id}`: Worker route that fetches a historical snapshot from KV.

The hybrid static-file-plus-Worker architecture lets the read-heavy bulk surface ride Cloudflare's edge cache at near-zero marginal cost, while keeping the dynamic surfaces (entry lookup, snapshot fetch) close to the underlying data without ever exposing a database connection to the public internet.

### 2. Write-path architecture

`POST /kt/v1/entries` is served by a Cloudflare Worker at `kt.llmo.org` (subdomain or path under llmo.org; the routing detail is deployment configuration, not architectural commitment). The Worker:

1. Parses the request body as a compact JWS per the specification in LIP-4 §3.2.
2. Validates the JWS signature against the JWK whose thumbprint is recorded in the payload (closes the LIP-4 loop: only the holder of the private key can produce a valid entry).
3. Validates the payload fields per LIP-4 §3.2 (domain format, RFC 3339 timestamp, etc.).
4. Inserts the entry into D1 with an auto-incrementing `entry_id`.
5. Returns the receipt JWS per LIP-4 §3.3.

The Worker does NOT validate that the publisher's deployed `/.well-known/llmo.json` actually references the JWK whose thumbprint is being registered. The publisher MAY register a thumbprint before deploying the corresponding document (e.g., during the `/llmo` skill's phase 10b, the registration happens after sign but the publisher may not have deployed yet). The registration is an attestation by the key holder; subsequent X7 evaluation by consumers cross-checks the registration against the deployed JWKS at fetch time.

The Worker enforces rate limits per source IP (no more than 100 entries per hour per IP) to prevent log spam. Legitimate publishers register approximately once per publish operation; an IP exceeding this rate is presumed adversarial.

### 3. Snapshot signing infrastructure

Snapshots are produced by a scheduled Cloudflare Worker triggered every 24 hours at 02:00 UTC (selected to fall during the operational quiet period and after typical North American business hours). The Worker:

1. Fetches the current canonical log from `static/.well-known/kt/v1/log.jsonl` (i.e., after the most recent flush from D1 to git).
2. Computes `log_hash = base64url(SHA-384(log_file_bytes))`.
3. Builds the snapshot payload per LIP-4 §3.3: `snapshot_id`, `log_size`, `log_hash`, `snapshot_at`, `previous_snapshot_id`, `previous_log_hash`.
4. Signs the payload with the registry signing key (see §4 below) using ES384.
5. Stores the signed snapshot in Workers KV under both `snapshot:latest` and `snapshot:<snapshot_id>`.

Historical snapshots remain in KV indefinitely. KV's eviction policy is "no eviction" for the registry namespace; the storage cost is negligible at v0.1.x scale.

If a scheduled snapshot fails (Worker error, KV write error, signing-key access error), an alert fires to the editor's email (registered as an alert destination in Cloudflare Notifications). The next scheduled snapshot at +24h re-attempts. A sustained snapshot outage (greater than 72 hours without a successful snapshot) is escalated to a public incident posted to llmo.org/incidents/ (a surface that exists in skeleton at the time of this ADR, formalized as part of public-launch posture).

### 4. Registry signing key custody

The registry signing key is an ES384 keypair generated at the time the registry is first operationalized. The private key is held in two locations:

1. **Active signing copy**: stored as a Cloudflare Workers Secret named `LLMO_KT_SIGNING_KEY`, scoped only to the snapshot-signing Worker. The Worker reads the secret at execution time; no other code path has access. Workers Secrets are encrypted at rest by Cloudflare and not visible in any logs or telemetry.

2. **Sealed backup**: stored as a 1Password secure note titled `LLMO KT registry signing key (<kid>)`, in the editor's personal 1Password vault. The backup is the disaster-recovery primitive: if the Workers Secret is lost (account compromise, accidental deletion, Cloudflare service-level failure), the editor can restore from the 1Password copy.

The public key is published at `/.well-known/llmo-keys.json` on llmo.org as a normal LLMO JWKS entry alongside any other llmo.org signing keys. Consumers verifying a snapshot fetch this JWKS, identify the registry signing key by `kid`, and verify the snapshot's JWS signature.

Rotation cadence is annual. The new key is generated, added to the JWKS (alongside the previous key for a 90-day window per spec §4.2), the new Workers Secret is staged, and a final snapshot is signed with both keys (or two consecutive snapshots, one with each key) to commit the transition to the log. The previous key's JWK remains in the JWKS for at least 90 days to allow consumers to verify snapshots signed before the transition.

Compromise response: if the active key is compromised, the editor revokes the Workers Secret immediately, generates a new keypair, publishes a signed advisory at llmo.org/incidents/, and signs a "transition snapshot" with the new key that explicitly references the compromised previous key's `kid`. Consumers seeing the transition snapshot treat snapshots signed by the compromised key as untrusted for any commitment they did not also see signed by the new key. This is operationally similar to a Certificate Transparency log's "split" event.

### 5. Availability commitments

The read endpoints inherit Cloudflare Pages SLA (target 99.9% monthly uptime, no formal SLA at the free tier but operationally observed at 99.95%+ over the past year). The write endpoint inherits Cloudflare Workers SLA (same).

Consumers MUST handle registry unavailability gracefully per LIP-4 §3.8 (transient failure: provisional cache for 24 hours; sustained failure: degrade to Standard tier with `kt_unevaluable_sustained`). The protocol does not require any specific availability target from the registry operator; the operator is responsible for documenting the target they aim for.

Diverse.org's commitment for the v0.1.x registry: best-effort 99.5% monthly availability on read endpoints, best-effort 99.0% on the write endpoint. These are not contractual; they are operational targets. Public outage logs are published at llmo.org/incidents/.

### 6. Scaling trigger from flat append-only log to Merkle tree

The flat append-only log is operationally adequate while the log size remains below 10 MB compressed (approximately 50,000 entries at the v0.1.x entry size of ~200 bytes JWS-compact). Above that threshold, the bulk-download surface at `/kt/v1/log.jsonl` becomes slow enough that consumer-side full-log verification (download, recompute hash, compare to snapshot) imposes meaningful latency on the X7 check.

The migration trigger is one of:

- Compressed log file exceeds 10 MB at a scheduled snapshot.
- Median consumer-side full-log download time exceeds 5 seconds over a 30-day window.
- Federation work for v0.2 reaches the point where Merkle-tree inclusion / consistency proofs are required for cross-witness signing.

When any trigger fires, the editor commits to a Merkle migration. The migration adds a new endpoint `GET /kt/v1/proof/{entry_id}` (inclusion proof) and a new field on snapshots (`merkle_root`) without removing or modifying the existing endpoints. Consumers using the flat-log surface remain functional; consumers wishing to use inclusion proofs adopt the new endpoint. The migration is a software change to the registry, not a wire-format change to the entry JWS or the snapshot JWS.

### 7. v0.2 federation roadmap

Federation is the long-term shape of the KT registry. v0.1.x is single-operator (Diverse.org). v0.2 anticipates multiple independent operators, each running their own log with their own signing key. The federation model under consideration is:

- Each operator signs the others' snapshot roots on a regular cadence (cross-witness).
- Consumers evaluating X7 query at least N of M conforming logs; an entry must appear in at least K of N for the check to pass.
- Specific N, M, K values are protocol parameters chosen in the v0.2 LIP.

This ADR commits Diverse.org to participating as one of the federation operators in v0.2 and to not exercising any special privilege over other operators. The v0.1.x registry at llmo.org/kt/v1 is the bootstrap; v0.2 makes it one of many.

This ADR does not commit any specific party to running the second log. That is recruitment work for v0.2.

### 8. Cost posture

At v0.1.x scale, the registry's recurring infrastructure cost is expected to be at or near zero:

- Cloudflare Workers free tier: 100,000 invocations per day. Estimated v0.1.x traffic is well below this (each new publisher registration is one write; each consumer X7 check is one read; even at 1,000 publishers and 100 daily verifications per publisher = 100,000 reads per day, fits in the free tier).
- Cloudflare D1 free tier: 5 million row reads, 100,000 row writes per day. Negligible relative to traffic.
- Cloudflare Workers KV free tier: 100,000 reads, 1,000 writes, 1 GB storage per day. The snapshot pipeline writes once per day; reads scale with consumer fetches.
- GitHub API rate limit for the `llmo-kt-bot[bot]` commit identity: 5,000 requests per hour authenticated. The flush schedule (one commit per hour) uses ~24 commits per day, well below the limit.

If v0.1.x traffic outgrows the free tiers, Cloudflare's paid Workers and D1 plans are documented at single-digit-dollar monthly cost levels. The cost model is reviewed annually as part of the registry signing key rotation cadence.

### 9. Observability

The Worker emits structured logs to Cloudflare Logpush. Logs are retained for 30 days at Cloudflare and (when economically warranted in a future ADR) forwarded to a longer-term observability sink.

Metrics tracked:

- Write rate per hour (entries appended)
- Read rate per hour by endpoint
- Write-path validation failures (signature did not verify, payload malformed, rate limit exceeded)
- Snapshot signing success / failure
- D1 query latency p50 / p99
- GitHub API commit latency

Alerts:

- Snapshot signing failure: email to editor
- Write-path 5xx rate > 1% over 5 minutes: email to editor
- Sustained snapshot outage (>72h since last successful snapshot): email to editor + public incident page update

## Alternatives considered

### Self-hosted on a VPS or bare metal

Considered as the dedicated-infrastructure path. Rejected on three grounds:

1. **Operational burden.** Bare-metal hosting requires capacity planning, OS patching, monitoring, log rotation, and on-call response. Diverse.org's volunteer steward cannot guarantee that response capacity.
2. **Cost.** Recurring monthly VPS cost ($5-$50/month depending on tier) on a nonprofit operating budget is a small but recurring drag.
3. **Geographic distribution.** A single-region VPS provides worse availability for global consumers than Cloudflare's edge-cached static surface.

### Run on a different cloud (AWS, GCP, Fly.io, etc.)

Considered. Rejected because:

1. Cloudflare's free-tier limits are unusually generous for the workload profile (mostly reads, low write rate). AWS Lambda's free tier is comparable for compute but DynamoDB or S3 charges accumulate at scale; GCP Cloud Run's free tier is comparable but Firestore charges similarly.
2. The llmo.org site is already on Cloudflare Pages. Adding Workers under the same account simplifies the operational surface (one set of credentials, one billing entity, one dashboard).
3. Cloudflare's commitment to free-tier durability has been credible over several years. Migration cost to another provider, if needed, is bounded by the JSONL bulk-download surface remaining vendor-neutral.

### Use Rekor (sigstore's transparency log) directly

Considered as the zero-infrastructure option: post entries to Rekor, rely on sigstore's existing log and signing infrastructure. Rejected because:

1. **Trust delegation.** Rekor's trust root is sigstore's; relying on Rekor delegates the snapshot signing and log integrity to a third party. LLMO's design intent (per LIP-4) is that Diverse.org operates the v0.1.x registry directly.
2. **Schema mismatch.** Rekor entries are typed for sigstore's use cases (signed commits, signed artifacts). Adapting Rekor entry types to LLMO KT semantics is engineering work without clear win over running our own log at this scale.
3. **Future federation.** v0.2's federation roadmap assumes Diverse.org is one operator among many. Starting with Rekor would mean the first operator is sigstore, which is not the intended trust topology.

If a future Diverse.org steward inherits this registry and wants to migrate to Rekor (or a successor), the entry JWS format is portable; the migration cost is real but bounded.

### Run the registry as a static Hugo build with manual append commits

Considered. The maximally-minimal option: writes are commits to the repo, no Worker, no D1. Rejected because:

1. **Latency.** Publishers cannot register and then publish their llmo.json in the same operation if the registration requires waiting for a human merge review.
2. **Authentication.** Without a Worker validating the JWS at write time, anyone could submit a PR to the log file containing entries forged under any domain's key. The validation has to happen at the entry's append time, server-side.
3. **Process load on the editor.** Each registration would require a human merge. At even modest scale, this swamps the editor's capacity for actual editorial work.

## Consequences

**Positive.**

- The registry is operationally tractable for a single steward at v0.1.x scale, without dedicated infrastructure engineering or paid services.
- The static bulk-download surface at `/kt/v1/log.jsonl` is portable: any future migration to a different operator, a Merkle log, or a federated topology preserves the bulk-download surface for consumers who don't want to depend on Worker availability.
- Cloudflare's edge cache absorbs the read-heavy workload at near-zero marginal cost. The operational story scales from 100 publishers to 100,000 publishers without changing the architecture.
- The signing key custody (Workers Secrets active + 1Password backup) is operationally defensible and recoverable.
- The annual rotation cadence matches the publisher rotation cadence and keeps the operational rhythm coherent across the protocol.

**Negative.**

- The registry is single-operator for v0.1.x. Trust concentrates in Diverse.org's operational discipline. The v0.2 federation roadmap is the long-term mitigation; until then, this is a known concentration of trust.
- Cloudflare is a single vendor. A Cloudflare-scale outage or account-level failure affects the registry. The Workers Secret + 1Password backup mitigates account-level failure for the signing key, but the read endpoints' availability is bound to Cloudflare's. Vendor diversification is a v0.2 federation consideration.
- The Worker code is a piece of operational software that needs maintenance: dependency updates, occasional Cloudflare API breaking changes, etc. The maintenance burden is small but real.
- D1 is a relatively new Cloudflare product (general availability 2024). If it changes pricing or capabilities significantly, the architecture may need to shift. The flat JSONL file in the repo is the durable record; D1 is a query accelerator that could be replaced with another store without changing the wire format or the trust properties.

**Neutral.**

- The registry's operational surface is documented publicly at llmo.org/kt/v1 (the API) and at this ADR (the architecture). External reviewers can verify the trust properties without needing access to Diverse.org's Cloudflare account.
- The snapshot signing pipeline produces a daily commitment to log state. Consumers and external auditors who retain snapshots can detect retroactive modification independently of any access to the registry's operational backend.

## References

- [LIP-4](/spec/lips/lip-0004/): the protocol-level specification this ADR operationalizes.
- [ADR-0001](/adr/0001-two-entity-firewall/): the two-entity firewall placing the registry on the Diverse.org side.
- [ADR-0004](/adr/0004-github-app-workflow-auth/): GitHub App identity pattern reused for the `llmo-kt-bot[bot]` commit identity.
- [ADR-0009](/adr/0009-llmo-skill-scope/): the `/llmo` skill's scope ceiling, which places registry interaction inside scope (the skill's phase 10b registers the publisher).
- RFC 6962 (Certificate Transparency) and RFC 9162 (CT v2.0): prior art for the log + snapshot + cross-witness pattern.
