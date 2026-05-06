# LLMO.org Theme Notes

Internal working notes for site aesthetic. Not published to the site.

## Status

**SUPERSEDED.** This Pass 2 plan was authored against Mintlify's templating constraints (Mintlify Global CSS, `docs.json` schema limits on color keys). The project migrated to Hugo + Cloudflare Pages on 2026-04-26, and the Mintlify-specific implementation notes below are no longer applicable.

The remaining content is preserved as a historical record of what was once contemplated. When Pass 2 (aesthetic) actually starts, a new design document will be written from current ground truth: Hugo's templating, the `static/css/` structure, and any design intent that survives a fresh review. Do not implement Pass 2 from this document.

## Colors

- Primary / light / dark: `#000000` / `#FFFFFF` / `#000000`.
- Accent: `#A51C30` (Harvard Crimson). Reserved. Not applied in Pass 1 chrome.
  Mintlify v2 `docs.json` schema does not support a fourth color key
  (`additionalProperties: false` on `colors`). The accent must be wired via
  Mintlify Global CSS in Pass 2.

## Reference aesthetic

Target properties, not a specific reference site:

- Predominantly monochrome (black, white, grey). Accent color applied rarely.
- No hero sections on landing or section pages. Start with an H1 and prose.
- No feature-card grids. No testimonial rows. No marketing ornament.
- Left nav grouped by section (not tabs across the top).
- Right rail "on this page" for long pages.
- Monospace for code and headers containing technical identifiers. Clean sans or serif for body prose.
- Standards-body register throughout (RFC editor, IETF, JSON Schema docs as general genre).
- No animations beyond link-hover state.

The specific external reference is removed intentionally. Pass 2 work should be evaluated against the target properties, not against any specific site.

## Out of scope for Pass 1

- No CSS files.
- No component overrides.
- No accent color in any chrome.
- No font changes beyond Mintlify defaults.
- No theme/mode toggling logic.
