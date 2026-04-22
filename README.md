# LLMO

An open protocol for publishing machine-readable organizational identity artifacts that LLMs and agents can discover, verify, and act on.

## Problem

Language models and autonomous agents increasingly make consequential decisions based on claims about organizations: who operates a domain, when a statement was published, whether a credential is current, which entity a communication came from. Today those claims are scattered across websites, press releases, third-party directories, and social platforms. The formats are inconsistent. The sources are not cryptographically signed. The time-of-assertion is usually unrecoverable. A consumer that needs to verify an organizational claim has no canonical place to look and no canonical format to parse.

## Approach

LLMO defines a canonical publication location, a schema, and a verification model.

Organizations publish a signed JSON document at `/.well-known/llmo.json` on their primary domain. The document contains claims about the organization: identity, operators, endpoints, publication timestamps, and signatures. The schema is versioned and machine-readable. Signatures bind claims to the publisher's control of the domain.

Consumers fetch the document, validate against the schema, verify signatures, and use whichever claims they trust for their purpose. Consumers choose their own trust model. The protocol does not impose a trust authority.

## What exists today

- Specification v0.1 at `/spec/v0.1/`
- JSON schema at `/spec/v0.1/schema/`
- Five test vectors at `/spec/v0.1/test-vectors/` covering valid documents, invalid documents, and edge cases
- Reference validator at https://validate.llmo.org
- LIP governance process with three accepted improvement proposals: LIP-1 (process), LIP-2 (core proposal mechanics, in governance window), LIP-3 (authoring conventions)
- OpenTimestamps anchoring for accepted LIPs, proof files adjacent to source documents at `/spec/lips/`

## For publishers

1. Read the specification at https://llmo.org/spec
2. Construct your `llmo.json` document following the schema at `/spec/v0.1/schema/`
3. Validate your document at https://validate.llmo.org
4. Publish at `https://<your-domain>/.well-known/llmo.json`

## For consumers

1. Given a domain, fetch `https://<domain>/.well-known/llmo.json`
2. Validate against the schema at `/spec/v0.1/schema/`
3. Verify signatures against the publisher's domain control
4. Use claims consistent with your application's trust model

## Repository layout

```
spec/               Specification content
  v0.1/             Versioned spec documents
    schema/         JSON Schema definitions
    test-vectors/   Canonical test cases
  lips/             LLMO Improvement Proposals
  anchoring.mdx     OpenTimestamps anchoring documentation
scripts/            Validator, anchoring, and registry tooling
claims.mdx          Core and extension claim documentation
about/              Project governance, license, contact
.github/workflows/  CI workflows
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
- Reference validator: https://validate.llmo.org
- LIP index: https://llmo.org/spec/lips
- Issues: https://github.com/openllmo/llmo.org/issues
- Contact: spec@llmo.org
