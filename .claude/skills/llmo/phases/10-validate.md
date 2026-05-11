# Phase 10: Validate live

## Goal

Fetch the deployed document, run it through both the CLI verifier and the in-browser validator, confirm the publisher achieves the tier they targeted, and produce a closing report including the next-rotation date.

## Inputs

- Live URL: `https://<primary_domain>/.well-known/llmo.json` (deployed in phase 09).
- Live JWKS URL: `https://<primary_domain>/.well-known/llmo-keys.json` (deployed in phase 09).
- The tier target (default: Strict; minimum: Minimal).
- Publisher's working-directory state.

## Outputs

- A pass/fail verdict for the achieved tier.
- A list of any rules that failed.
- A closing report shown to the publisher and saved to `llmo-publish-report-<YYYY-MM-DD>.txt` in the working directory.
- A next-rotation reminder dated 80 days from today (10 days of margin before the `valid_until`).

## Recipe

1. Fetch the live document with `llmo verify`:
   ```
   llmo verify https://<primary_domain>/.well-known/llmo.json
   ```
   The CLI auto-resolves the JWKS from `https://<primary_domain>/.well-known/llmo-keys.json` and produces a per-rule report.

2. Capture the CLI output. Expected for Strict tier:
   - `Tier: STRICT`
   - `Signature: valid`
   - All M1-M6, S1-S6, X1-X6 rules PASS
   - W1 / W2 warnings, if any, surface separately (they don't downgrade tier)
   - `Freshness: in window` (since `valid_from` is today and `valid_until` is +90 days)

3. If the CLI reports a tier below the publisher's target:
   - List the failing rules with their section citations.
   - Common failures and remediation:
     - **X3 (`JWKS Cache-Control max-age > 86400`):** hosting platform's header config. Fix in phase 09 instructions; redeploy.
     - **X2 (`JWKS not retrievable`):** the JWKS path isn't being served. Confirm the file is at `/.well-known/llmo-keys.json` and the CDN/host serves it.
     - **S3 (`primary_domain mismatch`):** `entity.primary_domain` in the document doesn't match the actual serving domain (most often a publisher with multiple subdomains who put the wrong one in the doc).
     - **X5 (`document signature did not verify`):** signature/payload mismatch. The most common cause is content-level transformation by the CDN after signing (e.g., CloudFront minifying JSON). Disable the transformation or sign-after-platform-touch.
   - Walk the publisher through the remediation. Loop back to the relevant earlier phase (phase 09 for hosting; phase 08 for sign issues; phase 04 for payload corrections).

4. Optionally open the in-browser validator for visual confirmation:
   - URL: `https://llmo.org/validator/?url=https://<primary_domain>/.well-known/llmo.json` (the validator accepts a `?url=` parameter to auto-load the document).
   - Confirm visually that the tier badge matches the CLI's verdict.
   - If they disagree, the CLI's verdict is canonical (it uses the same schema and the same JCS implementation as the validator); investigate the discrepancy.

5. If phase 06 was opted in, separately verify the `dns_corroboration` matches:
   ```
   dig +short TXT _llmo-corroboration.<primary_domain>
   ```
   Compare the TXT value's `hash=` field to the hash computed in phase 08. They must match. If they don't, the document and the corroboration are out of sync; re-do the TXT update from phase 08.

6. Produce the closing report. Write to `llmo-publish-report-<YYYY-MM-DD>.txt`:
   ```
   LLMO Publish Report
   ===================
   Domain:             <primary_domain>
   Document URL:       https://<primary_domain>/.well-known/llmo.json
   JWKS URL:           https://<primary_domain>/.well-known/llmo-keys.json
   Document ID:        <document_id>
   Spec version:       v0.1.8
   Tier achieved:      <Strict | Standard | Minimal | invalid>
   Signature:          <valid | invalid | absent>
   Algorithm:          ES256 (or as chosen)
   Key ID:             <kid>
   Valid from:         <YYYY-MM-DD>
   Valid until:        <YYYY-MM-DD>

   Claims published (<count>):
     - identity
     - canonical_urls
     - official_channels
     - categories
     - locations
     - contact_points (<verified count> verified, <total count> total)
     - operational_status: open
     [...]

   Key custody:        <publisher's chosen backend>
   Next rotation:      <today + 80 days, YYYY-MM-DD>
   Re-invoke:          /llmo

   Validator URL:      https://llmo.org/validator/?url=https://<primary_domain>/.well-known/llmo.json
   Spec:               https://llmo.org/spec/v0.1/
   Glossary:           https://llmo.org/glossary/
   ```

7. Show the closing report to the publisher. Explicitly mention the next-rotation date and the `/llmo` re-invocation. Done.

## CLI calls

- `llmo verify https://<primary_domain>/.well-known/llmo.json` (full pipeline test).
- `dig +short TXT _llmo-corroboration.<primary_domain>` (if phase 06).
- `curl -i <url>` for ad-hoc HTTP inspection.

## Defaults

- Tier target: Strict (set in SKILL.md, carried through every phase).
- Next-rotation lead time: 10 days before `valid_until`. Default `valid_until` is +90 days from publish, so rotation reminder is at +80 days.
- Validator URL pattern: `https://llmo.org/validator/?url=<encoded-doc-url>`.

## Decisions

- **CLI vs validator disagreement.** The CLI is canonical (it runs the same schema validation and JCS canonicalization as the in-browser validator; the validator UI is the consumer-facing surface but the CLI is the implementer's source of truth). If they disagree, the bug is in one of them; file a project issue and rely on the CLI in the interim.
- **What counts as success.** The publisher's target tier achieved on the live URL. Anything less is a failed publish from the skill's perspective; do not declare done until the target is met or the publisher explicitly accepts a lower tier.
- **Persistence of working-directory state.** Keep the directory `./llmo-publish-<YYYY-MM-DD>/` intact. The closing report, the unsigned payload, and the public JWKS stay on disk for next-quarter reference. Only the private key was deleted (phase 08).

## Failure modes

- **CLI verify can't reach the URL.** Network issue or DNS not yet propagated. Wait, retry; if still failing after 10 minutes, check the hosting deployment status.
- **Tier achieved is below target with no remediable path** (e.g., publisher's hosting platform can't be configured to set Cache-Control on JWKS, X3 will always fail). Two options: (a) accept Standard tier as the realistic ceiling on this platform and explain the trade-off; (b) recommend a hosting move to a platform that supports the headers. Default to (a) with the trade-off documented in the report.
- **Validator UI shows different result than CLI.** Investigate; do not close the phase. The discrepancy is a real bug somewhere.
- **Publisher closes the skill before completing the report.** The report file is in the working directory; they can re-open it. Re-invoking `/llmo` next quarter picks up state from the same directory.
