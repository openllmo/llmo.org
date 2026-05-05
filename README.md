# LLMO

An open protocol for publishing machine-readable organizational identity artifacts that LLMs and agents can discover, verify, and act on.

## Problem

Language models and autonomous agents increasingly make consequential decisions based on claims about organizations: who operates a domain, when a statement was published, whether a credential is current, which entity a communication came from. Today those claims are scattered across websites, press releases, third-party directories, and social platforms. The formats are inconsistent. The sources are not cryptographically signed. The time-of-assertion is usually unrecoverable. A consumer that needs to verify an organizational claim has no canonical place to look and no canonical format to parse.

## Approach

LLMO defines a canonical publication location, a schema, and a verification model.

Organizations publish a signed JSON document at `/.well-known/llmo.json` on their primary domain. The document contains claims about the organization: identity, operators, endpoints, publication timestamps, and signatures. The schema is versioned and machine-readable. Signatures bind claims to the publisher's control of the domain.

Consumers fetch the document, validate against the schema, verify signatures, and use whichever claims they trust for their purpose. Consumers choose their own trust model. The protocol does not impose a trust authority.

## What exists today

- Specification v0.1.5 at `/spec/v0.1/` (current revision; see `/spec/changelog/` for the patch series v0.1.1 through v0.1.5)
- JSON schema at `/spec/v0.1/schema.json`
- Five test vectors at `/spec/v0.1/test-vectors/` covering valid documents, invalid documents, and edge cases
- Reference validator at `https://llmo.org/validator/` performing schema, conformance tier, and cryptographic signature verification (document-level X5 and per-claim X6 per §5.3)
- Reference CLI tool `llmo` (open source at `github.com/openllmo/cli`) for signing, verifying, and operating on `llmo.json` documents
- LIP governance process with two accepted improvement proposals: LIP-1 (process, Active) and LIP-3 (authoring conventions, Final). LIP-2 is permanently withdrawn (placeholder withdrawn before merge); the registry is append-only and retains its number.
- OpenTimestamps anchoring for accepted LIPs, proof files adjacent to source documents at `/spec/lips/`

## For publishers

1. Read the specification at https://llmo.org/spec
2. Construct your `llmo.json` document following the schema at `/spec/v0.1/schema/`
3. Validate your document at https://llmo.org/validator/
4. Publish at `https://<your-domain>/.well-known/llmo.json`

## For consumers

1. Given a domain, fetch `https://<domain>/.well-known/llmo.json`
2. Validate against the schema at `/spec/v0.1/schema/`
3. Verify signatures against the publisher's domain control
4. Use claims consistent with your application's trust model

## Repository layout

```
content/             Hugo Markdown sources for all rendered pages
  spec/              Specification content
    v0.1/            Versioned spec documents
    lips/            LLMO Improvement Proposals
    changelog.md     Standalone changelog
    anchoring.md     OpenTimestamps anchoring documentation
  claims/            Core and extension claim type catalog
  validator/         Reference validator page (intro)
  deploy/            Publisher deployment guide
  about/             Project governance, license, contact
static/              Static assets served as-is by Hugo
  spec/v0.1/         schema.json and test-vectors/
  js/                Validator JavaScript
  .well-known/       Live llmo.json and llmo-keys.json
layouts/             Hugo layout templates
functions/api/       Cloudflare Pages Functions (JWKS proxy)
infrastructure/      Operational documentation (signing ceremony, etc.)
scripts/             LIP anchoring shell scripts
.github/workflows/   CI workflows
```

## Improvement proposals

Substantive changes to the specification follow the LIP process defined in LIP-1. The LIP index lives at `/spec/lips/`. LIPs that change the normative content of the specification enter a 14-day governance window before merge. LIPs that record process or authoring conventions merge under editorial policy.

## Contributing

See `CONTRIBUTING.md` for the full contribution process. Short version: bug reports and non-substantive improvements follow standard pull request workflow. Substantive changes to the specification follow the LIP process.

## Governance

The LLMO specification is stewarded by Diverse.org, a California 501(c)(3) nonprofit. The specification is vendor-neutral. Governance details and the editor role are documented at https://llmo.org/about.

## License

Specification content is licensed under CC BY 4.0. See `LICENSE`.

Code in this repository is licensed under MIT. See `LICENSE-CODE`.

## Links

- Specification: https://llmo.org
- Reference validator: https://llmo.org/validator/
- LIP index: https://llmo.org/spec/lips
- Issues: https://github.com/openllmo/llmo.org/issues
- Contact: spec@llmo.org
