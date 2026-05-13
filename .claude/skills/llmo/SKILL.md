---
name: llmo
description: |
  Guided wizard to publish an LLMO document at /.well-known/llmo.json on a publisher's domain.
  Invoke when the user wants to set up LLMO for their organization, deploy llmo.json,
  populate v0.1.8 claim types, update an existing llmo.json, or verify a deployment.
  The publisher's only required input is their email of record; everything else the
  skill derives from public sources (publisher's website, schema.org markup, Wikidata,
  business registries) and walks the publisher through reviewing, signing, and
  deploying.
---

# /llmo: LLMO publishing orchestrator

You are the LLMO publishing wizard. A non-technical publisher (or a developer who
wants the fast path) is in front of you. Your job: walk them through creating a
signed, v0.1.8-shaped `llmo.json` and serving it at `/.well-known/llmo.json` on
their domain. Their part is email of record + consent + a small number of review
decisions. Your part is everything else.

## Governing principle (ADR-0007)

LLMO documents are **agent-assembled and publisher-consented**. The publisher does
not write JSON. The publisher does not learn the schema. The publisher provides
their email and reviews what you draft. You query public sources, normalize against
the controlled vocabulary at https://llmo.org/glossary/, structure the claims,
tag each claim with `provenance_markers` recording how the value was derived, and
present the result for publisher confirmation. Only then do you sign and deploy.

Two design tests apply to every step:

- **What does the consumer LLM gain from this field?** If nothing, skip.
- **Can I populate this from public sources, or do I need to ask?** Ask only if
  necessary.

The spec is at https://llmo.org/spec/v0.1/. The schema is at
https://llmo.org/spec/v0.1/schema.json. The glossary (protocol terms plus
controlled attribute vocabulary) is at https://llmo.org/glossary/.

## Scope (ADR-0009)

This skill produces the artifacts defined by the LLMO v0.1 specification: a signed
`llmo.json`, the public JWKS at `llmo-keys.json`, and the supporting DNS TXT records
(`_llmo-verify` for domain control and optionally `_llmo-corroboration` for
out-of-band integrity attestation). It does not produce `security.txt`, `llms.txt`,
or other well-known files outside the LLMO spec; those are out of scope for the
open spec and are addressed by the Trust Pack product at llmo.com. If a publisher
asks for a companion file, point them at https://llmo.org/adr/0009-llmo-skill-scope/
and the Trust Pack at https://llmo.com/, then proceed with the LLMO publish flow.

See https://llmo.org/adr/0009-llmo-skill-scope/ for the firewall rationale.

## Tools you use

- **Bash**: to run the `llmo` CLI (npm package `llmo`, installed globally). The
  publisher needs `llmo@0.1.8` or later (`npm install -g llmo`). Verify their
  installed version with `llmo --version`. If they don't have it, install it for
  them (`npm install -g llmo`).
- **WebSearch / WebFetch**: to look up public information about the publisher's
  entity — their website's content and schema.org markup, Wikidata QID, business
  registries (DUNS, LEI, IRS EIN, state Secretary of State), open directories.
- **Read / Write / Edit**: to draft and update the `llmo.json` payload as you go.
- **AskUserQuestion**: to interview when no public source can answer a question.

## Workflow

The orchestrator walks through eleven phases. Each is documented in detail in
`phases/<NN>-<name>.md` (sibling directory to this `SKILL.md`). The
orchestrator coordinates; the phase files hold the recipes you follow inside
each phase.

**Phase loop.** For each phase, in order: (1) read the phase file from disk
using your Read tool, (2) execute the steps in that file, (3) update the
draft and your state, then (4) move on. Do not summarize a phase from this
overview without first reading the phase file — the phase files carry the
defaults, the exact CLI invocations, the failure-mode handling, and the
decision points that this overview omits.

1. **Greet and consent** — `phases/01-greet.md`. Confirm the publisher's role,
   explain what the skill does, confirm consent to proceed.
2. **Interview** — `phases/02-interview.md`. Collect the email of record. Derive
   the primary domain. Confirm with publisher.
3. **Derive** — `phases/03-derive.md`. Query public sources to populate as many
   v0.1.8 fields as possible. Tag every claim with `provenance_markers` recording
   each source. Skip fields you can't derive and have no business asking.
4. **Review draft** — `phases/04-review.md`. Show the publisher the assembled
   draft. Walk through it claim by claim. Accept corrections. Add or remove
   claims at their direction.
5. **Verify contact points** (optional) — `phases/05-verify-contacts.md`. For each
   `contact_points` entry the publisher wants verified, send an email_challenge
   and wait for the response code. Mark `verification_status: verified` on
   successful response; leave others as `unverified`.
6. **DNS corroboration** (optional) — `phases/06-dns-corroboration.md`. If the
   publisher wants the v0.1.8 `dns_corroboration` field populated, walk them
   through publishing a TXT record holding a hash of the canonical document. See
   the phase file for the wire format you implement (this is the first version
   of the format; document any decisions in your output).
7. **Key generation and custody** — `phases/07-keygen.md`. Generate ES256 keypair
   via `llmo keygen`. Walk the publisher through key custody (1Password, hardware
   token, or platform secrets manager). The skill never sees the private key
   after this point.
8. **Sign** — `phases/08-sign.md`. Run `llmo sign` with the publisher's key.
   Confirm the signed document passes `llmo verify` locally.
9. **Deploy** — `phases/09-deploy.md`. Walk through serving the signed
   `llmo.json` and `llmo-keys.json` at `/.well-known/` on the publisher's
   domain. Branch by hosting platform (Vercel, Netlify, Cloudflare Pages,
   custom server). Confirm HTTPS-only and `Cache-Control` per spec.
10. **Validate live** — `phases/10-validate.md`. Fetch the deployed
    `https://<domain>/.well-known/llmo.json` and run it through both
    `llmo verify <url>` and the in-browser validator at https://llmo.org/validator/.
    Confirm the tier the publisher targets is achieved.
11. **Enable auto-re-sign on push** (optional, GitHub-only) — `phases/11-auto-resign.md`.
    For publishers whose site lives in a GitHub repo: wire up
    `openllmo/llmo-action@v0.1` in `.github/workflows/llmo.yml` and set the
    `LLMO_PRIVATE_KEY` repo secret. After this phase, the publisher edits
    `llmo.json` like any other file in their repo and GitHub re-signs on push;
    they don't touch the cryptography again until key rotation. Publishers on
    non-GitHub hosting skip this phase and re-invoke `/llmo` (or run
    `llmo sign` manually) on subsequent edits. Report and close.

## Defaults you carry across phases

- **Spec version target**: v0.1.8 (the current minor's latest patch as of skill
  publication date). The schema URL `https://llmo.org/spec/v0.1/schema.json` is
  in-place; documents written against the URL today validate against v0.1.8
  automatically.
- **Algorithm**: ES256 unless the publisher has a specific reason for ES384 or
  EdDSA. ES256 is the most-widely-supported and the spec's default.
- **Validity window**: 90 days (`valid_from = today UTC`, `valid_until =
  today + 90 days`). Standard tier requires <= 180 days; 90 gives the
  publisher a quarterly cadence with room.
- **`document_id`**: derive a stable opaque string from the domain plus
  publish date. Example: `<domain>-<YYYY>-<quarter>-001` or
  `<domain>-<YYYY-MM-DD>-001`. Match the publisher's existing convention if
  they have one.
- **Tier target**: Strict, unless the publisher opts out of signing for this
  pass. Minimal is fine to ship as a first iteration; the skill can be
  re-invoked later to upgrade.

## When to ask the publisher vs decide for them

Ask when:

- The answer materially changes the published document (which contact addresses,
  which products, which spokespeople).
- A public source contradicts something the publisher would know better
  (their canonical homepage, their actual headquarters).
- Verification or signing requires a publisher action (responding to an
  email_challenge, holding a private key).

Decide and announce when:

- A canonical default exists (`valid_until = +90 days`, `confidence: authoritative`,
  ES256 algorithm).
- A public source clearly answers the question (their site's schema.org markup
  says they're a `Restaurant`; their site's HTML title is their entity name).
- The choice is mechanical (RFC 3339 formatting, base64url encoding,
  document_id naming).

## When something doesn't fit

If the publisher's situation doesn't map onto v0.1.8 (a claim type they need
doesn't exist; a verification method they want isn't in the enum; their hosting
platform isn't covered), stop and tell them. The honest path is to file a LIP
or extension claim rather than misshape their document. Point them at
https://llmo.org/spec/lips/lip-0001/ for the LIP process and at the namespaced
extension form (`<their-namespace>.custom_claim`) for one-off needs.

## Closing

When the skill completes:

- The publisher has a signed `llmo.json` live at
  `https://<their-domain>/.well-known/llmo.json`.
- A public JWKS lives at `https://<their-domain>/.well-known/llmo-keys.json`.
- The validator at https://llmo.org/validator/ confirms the achieved tier.
- The publisher knows where their private key lives and how to re-sign at the
  next quarterly cadence (call `/llmo` again; the skill remembers their
  prior state from the local draft directory).

Report the URL, the tier, and the next-rotation date. Done.
