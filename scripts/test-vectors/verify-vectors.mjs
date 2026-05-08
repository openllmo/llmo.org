#!/usr/bin/env node
// Validation harness for the v0.1 test vector set against the LLMO CLI.
//
// Two LLMO reference implementations exist: the in-browser validator at
// static/js/validator.js (used by /validator/) and the CLI at
// ../llmo-cli (used in CI and operator workflows). The two diverge on
// rule coverage; see content/spec/v0.1/test-vectors.md for the per-rule
// matrix. This harness asserts CLI behavior only. Browser-validator
// behavior is documented per-vector in the page text and verified
// manually in-browser; a headless harness for that is a deferred
// BACKLOG item.
//
// Usage: node scripts/test-vectors/verify-vectors.mjs [--cli <path>]

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VECTORS_DIR = resolve(__dirname, '../../static/spec/v0.1/test-vectors');

const cliFlagIdx = process.argv.indexOf('--cli');
const CLI = cliFlagIdx >= 0
  ? resolve(process.argv[cliFlagIdx + 1])
  : resolve(__dirname, '../../../llmo-cli/dist/cli.js');

// Each entry: file, optional jwks, expect block.
// expect.tier matches CLI tier output (paste-mode evaluation: no servingDomain).
// expect.signatureValid (optional) asserts the boolean signatureValid field.
// expect.tierFailureRule (optional) asserts a substring is present in tierFailures[*].rule.
// drift is a human-readable note explaining where CLI behavior diverges
// from the spec (or from validator.js). It does not affect harness pass/fail
// but is printed for documentation.
const VECTORS = [
  // Existing positives.
  { file: 'unsigned-minimal.json', expect: { tier: 'minimal' } },
  { file: 'unsigned-standard.json', expect: { tier: 'standard' } },
  { file: 'signed-strict.json', jwks: 'signed-strict-key.json', expect: { tier: 'strict', signatureValid: true } },
  { file: 'signed-strict-es384.json', jwks: 'signed-strict-es384-key.json', expect: { tier: 'strict', signatureValid: true } },
  { file: 'signed-strict-eddsa.json', jwks: 'signed-strict-eddsa-key.json', expect: { tier: 'strict', signatureValid: true } },

  // S1, S2 - paste-mode-testable.
  { file: 'negative-s1-missing-canonical-urls.json', expect: { tier: 'minimal', tierFailureRule: 'has canonical_urls claim' } },
  { file: 'negative-s2-missing-official-channels.json', expect: { tier: 'minimal', tierFailureRule: 'has official_channels claim' } },

  // S4 - CLI does NOT enforce; validator.js does.
  { file: 'negative-s4-third-party-canonical-url.json', expect: { tier: 'standard' }, drift: 'CLI tier.ts §5.2 URL-scope rule is informational; validator.js enforces. Vector fails S4 in browser validator.' },
  { file: 'negative-s4-third-party-product-url.json', expect: { tier: 'standard' }, drift: 'Same S4 drift; validator.js fails this on product_facts URL.' },
  { file: 'negative-s4-third-party-supersedes-url.json', expect: { tier: 'standard' }, drift: 'Same S4 drift; validator.js fails this on supersedes URL.' },

  // S5 - paste-mode-testable.
  { file: 'negative-s5-window-181-days.json', expect: { tier: 'minimal', tierFailureRule: 'window <= 180 days' } },

  // X1 - CLI collapses structural and cryptographic into a single "signature valid" rule.
  // Validator.js separates X1 (structural) from X5 (cryptographic); see browser column.
  { file: 'negative-x1-bad-alg.json', expect: { tier: 'standard', tierFailureRule: 'signature valid' }, drift: 'CLI does not separate X1 from X5; validator.js reports X1 alg-mismatch specifically.' },
  { file: 'negative-x1-missing-kid.json', expect: { tier: 'standard', tierFailureRule: 'signature valid' }, drift: 'Same X1/X5 collapse.' },
  { file: 'negative-x1-malformed-protected.json', expect: { tier: 'standard', tierFailureRule: 'signature valid' }, drift: 'Same X1/X5 collapse.' },

  // X1 detail rules from §4.3.1: b64:false and crit non-empty. Neither CLI
  // nor validator.js enforces these; both pass at strict if the alg/kid
  // are otherwise valid. Drift documented for §4.3.1.
  { file: 'negative-x1-detached-payload-b64-false.json', expect: { tier: 'standard', tierFailureRule: 'signature valid' }, drift: 'Spec §4.3.1 rejects b64:false; CLI and validator.js do not check, but signature is unverifiable so vector still drops to standard via crypto failure.' },
  { file: 'negative-x1-crit-non-empty.json', expect: { tier: 'standard', tierFailureRule: 'signature valid' }, drift: 'Spec §4.3.1 rejects non-empty crit; same situation as b64:false.' },

  // X4 - CLI does NOT enforce; validator.js does.
  { file: 'negative-x4-no-owned-canonical-url.json', expect: { tier: 'standard', tierFailureRule: 'signature valid' }, drift: 'CLI does not enforce X4; vector still fails because placeholder sig is uncryptographic. Validator.js fails X4 directly.' },

  // Schema (M3).
  { file: 'negative-schema-malformed-claim-type.json', expect: { tier: 'invalid' } },
  { file: 'negative-schema-bad-llmo-version.json', expect: { tier: 'invalid' } },
  // founded pattern: canonical schema enforces; CLI's vendored schema (v0.1.0) does not.
  // CLI returns standard rather than invalid. Drift filed against CLI for re-vendor.
  { file: 'negative-schema-malformed-founded.json', expect: { tier: 'standard' }, drift: 'Canonical schema (v0.1.4) rejects "yesterday" but CLI vendored schema lags; re-vendor needed. Schema validation against canonical schema.json (verify-schema.mjs) does fail this vector.' },

  // M5 - CLI catches via tier.ts window > 365.
  { file: 'negative-m5-window-over-365.json', expect: { tier: 'invalid' } },

  // X5, X6 cryptographic.
  { file: 'negative-x5-corrupted-signature.json', jwks: 'signed-strict-key.json', expect: { tier: 'standard', signatureValid: false, tierFailureRule: 'signature valid' } },
  { file: 'negative-x6-bad-claim-signature.json', jwks: 'negative-x6-bad-claim-signature-key.json', expect: { tier: 'standard', signatureValid: true, tierFailureRule: 'per-claim signatures' } },

  // S6 - validator.js, CLI, neither enforces. Drift documented.
  { file: 'negative-s6-disavowal-third-party.json', expect: { tier: 'standard' }, drift: 'Spec §5.2 S6 not enforced by either CLI or validator.js. Vector exercises spec text alone.' },

  // Warnings (CLI does not emit warnings; validator.js emits W1, W2).
  { file: 'warning-w1-200-day-window.json', expect: { tier: 'minimal', tierFailureRule: 'window <= 180 days' } },
  { file: 'warning-w2-spokesperson-no-verification.json', expect: { tier: 'standard' }, drift: 'CLI does not emit W2; validator.js emits W2 in browser.' },

  // Edges.
  { file: 'edge-validity-365-days.json', expect: { tier: 'minimal', tierFailureRule: 'window <= 180 days' } },
  { file: 'edge-validity-366-days.json', expect: { tier: 'invalid' } },
  { file: 'edge-claim-type-namespaced.json', expect: { tier: 'standard' } },
  { file: 'edge-disavowal-impersonation-defense.json', expect: { tier: 'standard' } },
  { file: 'edge-spokesperson-with-verification.json', expect: { tier: 'standard' } },
];

function run(file, jwks) {
  const args = ['verify', '--json'];
  if (jwks) args.push('--jwks', resolve(VECTORS_DIR, jwks));
  args.push(resolve(VECTORS_DIR, file));
  try {
    const out = execFileSync('node', [CLI, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return JSON.parse(out);
  } catch (e) {
    const stdoutBuf = e.stdout && e.stdout.toString ? e.stdout.toString() : '';
    return JSON.parse(stdoutBuf);
  }
}

const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
console.log(pad('VECTOR', 56), pad('TIER', 10), 'STATUS');
let failed = 0;
for (const v of VECTORS) {
  const actual = run(v.file, v.jwks);
  const checks = [];
  if (actual.tier !== v.expect.tier) {
    checks.push(`tier=${actual.tier} (want ${v.expect.tier})`);
  }
  if (typeof v.expect.signatureValid === 'boolean' && actual.signatureValid !== v.expect.signatureValid) {
    checks.push(`signatureValid=${actual.signatureValid} (want ${v.expect.signatureValid})`);
  }
  if (v.expect.tierFailureRule) {
    const fails = (actual.tierFailures || []).map((f) => f.rule || '').join('; ');
    if (!fails.toLowerCase().includes(v.expect.tierFailureRule.toLowerCase())) {
      checks.push(`tierFailures=[${fails}] (want substring "${v.expect.tierFailureRule}")`);
    }
  }
  const ok = checks.length === 0;
  if (!ok) failed++;
  const status = ok ? 'OK' : `MISMATCH: ${checks.join(', ')}`;
  console.log(pad(v.file, 56), pad(actual.tier || '-', 10), status);
  if (v.drift) console.log(pad('', 56), pad('', 10), `  drift: ${v.drift}`);
}
console.log('');
console.log(`${VECTORS.length - failed}/${VECTORS.length} vectors verified.`);
if (failed > 0) {
  console.error(`${failed} mismatch(es) above. Investigate before continuing.`);
  process.exit(1);
}
