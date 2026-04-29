# Security Policy

LLMO takes security seriously. This document describes how to report security vulnerabilities in the LLMO protocol, its reference implementations, and its supporting infrastructure.

## Scope

This policy covers security vulnerabilities in:

- **The LLMO protocol specification**, where a flaw in the specification enables attacks against conformant implementations or against publishers whose documents conform to the specification.
- **The reference validator** at https://llmo.org/validator/, source in this repository under `static/js/validator.js` and `layouts/validator/`.
- **The OpenTimestamps anchoring scripts** at github.com/openllmo/llmo.org in the scripts/ directory.
- **CI workflows and automation** in either repository that, if compromised, could enable supply-chain attacks against the specification or validator.
- **DNS and infrastructure configuration** for llmo.org (including the redirect from validate.llmo.org), where misconfiguration enables attacks against users.

The following are explicitly out of scope for this policy:

- **Abuse of LLMO by third parties.** Reports that a specific organization is publishing false, misleading, or forged `llmo.json` documents are not security vulnerabilities in LLMO; they are abuse of the protocol by that organization. Abuse reports are handled separately and are not covered by the commitments in this document.
- **Vulnerabilities in dependencies** (Node.js, Cloudflare Pages, GitHub, Google Workspace, and so on) unless the vulnerability is exploitable specifically because of how LLMO integrates with the dependency. General dependency issues should be reported to the dependency's maintainer.
- **Social engineering, phishing, or physical attacks** against the project maintainers or contributors.

## Reporting a vulnerability

Please use one of the following channels, in order of preference:

### GitHub Private Vulnerability Reporting (preferred)

The fastest path. Navigate to the Security tab of the affected repository and click "Report a vulnerability":

- [openllmo/llmo.org](https://github.com/openllmo/llmo.org/security/advisories/new)
- [openllmo/llmo-validator](https://github.com/openllmo/llmo-validator/security/advisories/new)

This creates a private report visible only to repository maintainers. No account linking or email setup is required beyond a standard GitHub account.

### Encrypted email

Send an encrypted email to **security@llmo.org** using the PGP key below.

- **Key fingerprint:** `25127EC793A7870FA0FFC65BC8AD7EA3CB61C85B`
- **Public key:** [llmo.org/security/llmo-security.asc](https://llmo.org/security/llmo-security.asc) and on the keys.openpgp.org keyserver.

### Plain email (fallback)

If you cannot use GitHub PVR or PGP, send a plain email to **security@llmo.org** describing the vulnerability. Be aware that plain email is not end-to-end encrypted; avoid including exploitation details in the message body. We will respond with a secure channel for follow-up.

## What to include in a report

To help us triage and fix the issue quickly, please include:

- A description of the vulnerability and its impact.
- Steps to reproduce, including any proof-of-concept code or payloads.
- The affected component and version (specification version, validator commit SHA, and so on).
- Your preferred acknowledgment name or pseudonym for the eventual advisory, or a request for anonymity.

## Our commitments

When you report a vulnerability in scope through one of the channels above:

- **Acknowledgment within 5 business days.** You will receive confirmation that the report has been received and assigned for triage.
- **Triage update within 10 business days.** A substantive response on whether the report is confirmed, under investigation, or out of scope.
- **Resolution or coordinated disclosure within 90 days.** Complex issues may take longer; we will communicate timeline revisions proactively if so.
- **Credit in the resolution advisory** under your preferred name or pseudonym, or anonymously if you prefer.

## Safe harbor

LLMO considers security research conducted in good faith under this policy to be authorized activity. If you follow this policy, we commit to:

- Not pursuing or supporting legal action against you for your research.
- Not reporting you to law enforcement for your research.
- Working with you to understand and resolve the issue, including potentially providing credit or acknowledgment.
- Not treating your research as a breach of the LLMO project's terms or contributor agreements.

This safe harbor extends to good-faith security research that:

- Stays within the scope defined above.
- Does not compromise the privacy, availability, or data integrity of real publishers, their documents, or end users of the validator.
- Does not extract or exfiltrate data beyond what is necessary to demonstrate the vulnerability.
- Provides a reasonable time window for resolution before public disclosure.

Research that involves attacks against production systems handling real traffic, exploitation of vulnerabilities beyond what is necessary to confirm them, or public disclosure before the coordinated timeline is not covered by this safe harbor and may be treated as abuse.

## Out-of-scope disclosures

Issues that fall outside this policy's scope are not covered by the commitments or safe harbor above. Examples:

- **Bugs that are not security vulnerabilities:** please file a standard issue using the spec-bug issue template.
- **Proposed changes to the specification:** please file using the core-claim-proposal template or follow the [LIP process](https://llmo.org/spec/lips).
- **Abuse of LLMO by a specific publisher:** not currently covered by a formal policy. Contact the project author at spec@llmo.org and we will address it case by case.

## Contact

- **GitHub PVR:** preferred path above
- **Security email:** security@llmo.org (PGP-encrypted or plain)
- **Project author for non-security matters:** spec@llmo.org

## Policy version

This policy is effective 2026-04-22 and applies to all vulnerabilities reported after this date. Changes to this policy will be noted in the repository commit history.
