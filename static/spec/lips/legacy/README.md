# Legacy LIP anchor proofs

This directory holds the OpenTimestamps proofs that were produced for LIP files prior to the 2026-04-26 platform migration from Mintlify to Hugo.

## What these proofs anchor

Each `.mdx.ots` file in this directory anchors the byte-exact content of the corresponding `.mdx` LIP file at the time it was originally stamped:

- `lip-0001.mdx.ots` anchors the bytes of `spec/lips/lip-0001.mdx` as of the original anchor date.
- `lip-0003.mdx.ots` anchors the bytes of `spec/lips/lip-0003.mdx` as of the original anchor date.

The anchored bytes include the original Mintlify-style frontmatter (with `sidebarTitle:`, no `date:` field) and the `.mdx` source as it existed before the migration.

## When they were anchored

Original anchoring date: 2026-04-22, per the changelog and the LIP transitions logs. The proofs were `pending` (calendar attestation only, awaiting Bitcoin block inclusion) at the time of the migration.

## Why they live here now

On 2026-04-26 the LLMO project migrated from Mintlify (`.mdx`) to Hugo (`.md`). Two changes broke verification of the original proofs against working-tree files:

1. The rename `spec/lips/lip-NNNN.mdx` → `content/spec/lips/lip-NNNN.md` moved the source file out from under the verifier scripts.
2. Frontmatter normalization (renamed `sidebarTitle:` → `linkTitle:`, added `date:`) changed the file bytes the proofs were stamped against.

These proofs are preserved as historical record, not as currently-verifiable artifacts against the current working tree.

## Verifying these proofs

Verifying a legacy proof requires the original `.mdx` byte content, which is preserved in git history:

```
git show <pre-migration-commit>:spec/lips/lip-0001.mdx > /tmp/lip-0001.mdx
ots verify --use-original /tmp/lip-0001.mdx static/spec/lips/legacy/lip-0001.mdx.ots
```

The pre-migration commit is the parent of the migration commit on the `static-hugo` branch.

## Current proofs

Current `.md` files were re-anchored on 2026-04-26. Their proofs live alongside the `.md` files at `content/spec/lips/lip-NNNN.md.ots`. Use `scripts/verify-lip-anchor.sh content/spec/lips/lip-NNNN.md` to verify them.
