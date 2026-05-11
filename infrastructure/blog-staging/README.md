# blog-staging

Bootstrap content that was hand-written for `/updates/` during the protocol's early weeks, before `/updates/` became auto-generated and before `blog.llmo.org` (the planned human-curated long-form surface) was built.

These four files (`2026-04-27.md`, `2026-05-04.md`, `2026-05-08.md`, `2026-05-11.md`) are narrative summaries of project activity at the time they were written. They do not match the design intent codified in [ADR-0008](/adr/0008-updates-as-auto-consolidation/), which scopes `/updates/` to auto-generated changelog consolidations.

The files are preserved here, gitignored from the Hugo build, until `blog.llmo.org` exists. When the blog repo is bootstrapped, these four entries are intended as initial blog posts (with whatever editorial passes the blog editor wants to apply).

This directory is not built by Hugo (excluded via `ignoreFiles` in `hugo.toml`). The four entries are private to the repository and not surfaced at any `llmo.org` URL.

The earlier rendered URLs (`/updates/2026-04-27/`, `/updates/2026-05-04/`, `/updates/2026-05-08/`, `/updates/2026-05-11/`) will 404 after this PR merges. Inbound link surface for those URLs was minimal (they were live for one week and never linked from any other production page); the 404 cost was judged acceptable against the design-coherence benefit.
