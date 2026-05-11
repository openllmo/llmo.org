#!/usr/bin/env node
// Schema validation pass for the v0.1 test vector set. Uses AJV against the
// CANONICAL schema (static/spec/v0.1/schema.json), not the CLI's vendored copy
// (which may lag behind canonical between vendor passes).
//
// Each vector is annotated with its expected schema-validity outcome. Exits
// non-zero if any vector deviates.

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// Resolve ajv via the CLI's node_modules (already installed for the project).
const Ajv2020 = require('/Users/nsc/projects/llmo-cli/node_modules/ajv/dist/2020.js').default;
const addFormats = require('/Users/nsc/projects/llmo-cli/node_modules/ajv-formats').default;

const __dirname = dirname(fileURLToPath(import.meta.url));
const VECTORS_DIR = resolve(__dirname, '../../static/spec/v0.1/test-vectors');
const SCHEMA_PATH = resolve(__dirname, '../../static/spec/v0.1/schema.json');

const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

// expectValid: true if document should pass schema validation, false if it should fail.
// Vectors that test minimal/standard/strict tier rules but have valid schema get expectValid: true.
const VECTORS = [
  // Existing positives (schema-valid).
  { file: 'unsigned-minimal.json', expectValid: true },
  { file: 'unsigned-standard.json', expectValid: true },
  { file: 'signed-strict.json', expectValid: true },
  { file: 'signed-strict-es384.json', expectValid: true },
  { file: 'signed-strict-eddsa.json', expectValid: true },

  // Negatives that target tier rules but are schema-valid.
  { file: 'negative-s1-missing-canonical-urls.json', expectValid: true },
  { file: 'negative-s2-missing-official-channels.json', expectValid: true },
  { file: 'negative-s4-third-party-canonical-url.json', expectValid: true },
  { file: 'negative-s4-third-party-product-url.json', expectValid: true },
  { file: 'negative-s4-third-party-supersedes-url.json', expectValid: true },
  { file: 'negative-s5-window-181-days.json', expectValid: true },
  { file: 'negative-x1-bad-alg.json', expectValid: true },
  { file: 'negative-x1-missing-kid.json', expectValid: true },
  { file: 'negative-x1-malformed-protected.json', expectValid: true },
  { file: 'negative-x1-detached-payload-b64-false.json', expectValid: true },
  { file: 'negative-x1-crit-non-empty.json', expectValid: true },
  { file: 'negative-x4-no-owned-canonical-url.json', expectValid: true },
  { file: 'negative-x5-corrupted-signature.json', expectValid: true },
  { file: 'negative-x6-bad-claim-signature.json', expectValid: true },
  { file: 'negative-s6-disavowal-third-party.json', expectValid: true },

  // Schema-failure vectors (must fail canonical schema).
  { file: 'negative-schema-malformed-claim-type.json', expectValid: false, why: 'claim.type "noNamespace" matches neither core enum nor namespaced pattern' },
  { file: 'negative-schema-malformed-founded.json', expectValid: false, why: 'founded "yesterday" violates date pattern from v0.1.4' },
  { file: 'negative-schema-bad-llmo-version.json', expectValid: false, why: 'llmo_version must be "0.1" const' },
  // negative-m5-window-over-365.json: schema has no length cap (M5 is enforced by validator/CLI, not schema).
  { file: 'negative-m5-window-over-365.json', expectValid: true, note: 'window cap is a tier rule, not a schema constraint' },

  // Warnings (schema-valid).
  { file: 'warning-w1-200-day-window.json', expectValid: true },
  { file: 'warning-w2-spokesperson-no-verification.json', expectValid: true },

  // Edge cases.
  { file: 'edge-validity-365-days.json', expectValid: true },
  { file: 'edge-validity-366-days.json', expectValid: true, note: '366 > 365 fails M5 in tier check; schema does not constrain' },
  { file: 'edge-claim-type-namespaced.json', expectValid: true, note: 'namespaced extension type matches second oneOf branch' },
  { file: 'edge-disavowal-impersonation-defense.json', expectValid: true },
  { file: 'edge-spokesperson-with-verification.json', expectValid: true },

  // v0.1.8 positive vectors. One per new core claim type plus a comprehensive vector
  // exercising entity.name array form, structured external_ids with irs_ein,
  // provenance_markers, all five new top-level fields, and the canonical_urls /
  // product_facts / identity extensions.
  { file: 'unsigned-contact-points.json', expectValid: true, note: 'v0.1.8 contact_points with one verified and one unverified entry' },
  { file: 'unsigned-categories.json', expectValid: true, note: 'v0.1.8 categories with schema.org primary, secondary, NAICS' },
  { file: 'unsigned-locations.json', expectValid: true, note: 'v0.1.8 locations with postal_address, WGS84 coordinates, radius service_area' },
  { file: 'unsigned-hours.json', expectValid: true, note: 'v0.1.8 hours with split shifts, 24:00 close, overnight period, exception, alternate brunch sub-schedule' },
  { file: 'unsigned-attributes.json', expectValid: true, note: 'v0.1.8 attributes with bool/enum/array values plus namespaced extension' },
  { file: 'unsigned-operational-status.json', expectValid: true, note: 'v0.1.8 operational_status opening_soon with effective_date' },
  { file: 'unsigned-v0.1.8-comprehensive.json', expectValid: true, note: 'v0.1.8 comprehensive: entity.name array with primary, structured external_ids including irs_ein, provenance_markers, all 5 new top-level fields, canonical_urls/product_facts/identity v0.1.8 extensions' },

  // v0.1.8 schema-failure vectors. Each exercises one conditional constraint
  // encoded in the schema via if/then or contains/minContains/maxContains.
  { file: 'negative-schema-contact-points-verified-no-proof.json', expectValid: false, why: 'contact_points entry with verification_status: verified but missing verification_proof' },
  { file: 'negative-schema-contact-points-verified-no-timestamp.json', expectValid: false, why: 'contact_points entry with verification_status: verified but missing verified_at' },
  { file: 'negative-schema-operational-status-no-effective-date.json', expectValid: false, why: 'operational_status with non-open status (permanently_closed) missing effective_date' },
  { file: 'negative-schema-entity-name-no-primary.json', expectValid: false, why: 'entity.name array form with zero primary:true entries (minContains: 1)' },
  { file: 'negative-schema-entity-name-two-primary.json', expectValid: false, why: 'entity.name array form with two primary:true entries (maxContains: 1)' },
  { file: 'negative-schema-external-id-bad-wikidata-pattern.json', expectValid: false, why: 'external_ids.wikidata structured form with value that does not match ^Q[0-9]+$' },
  { file: 'negative-schema-external-id-verified-no-proof.json', expectValid: false, why: 'external_ids.irs_ein structured with verification_method != none and missing verification_proof + verified_at' },
  { file: 'negative-schema-categories-no-primary.json', expectValid: false, why: 'categories claim missing the required primary field' },
  { file: 'negative-schema-hours-malformed-time.json', expectValid: false, why: 'hours regular monday open: "25:00" violates the HH:MM pattern' },
  { file: 'negative-schema-attributes-bad-value-type.json', expectValid: false, why: 'attributes value is a number; the open map permits boolean, string, or array of strings only' },
];

let failed = 0;
console.log('Schema validation pass against', basename(SCHEMA_PATH));
console.log('');
const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
console.log(pad('VECTOR', 56), pad('VALID', 8), 'STATUS');
for (const v of VECTORS) {
  const path = resolve(VECTORS_DIR, v.file);
  const doc = JSON.parse(readFileSync(path, 'utf8'));
  const valid = validate(doc);
  const ok = valid === v.expectValid;
  const note = !ok
    ? `FAIL (want ${v.expectValid ? 'valid' : 'invalid'}; got ${valid ? 'valid' : 'invalid: ' + JSON.stringify(validate.errors[0])})`
    : v.note ? `OK  (${v.note})` : 'OK';
  console.log(pad(v.file, 56), pad(valid ? 'valid' : 'invalid', 8), note);
  if (!ok) failed++;
}
console.log('');
console.log(`${VECTORS.length - failed}/${VECTORS.length} schema outcomes match expected.`);
if (failed > 0) {
  console.error(`${failed} schema mismatch(es) above. Investigate.`);
  process.exit(1);
}
