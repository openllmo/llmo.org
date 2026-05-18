#!/usr/bin/env python3
"""Generate the public /updates/ entry for an ISO week.

Consolidates spec releases that landed during the period by extracting
new ## [X.Y.Z] section headers from content/spec/changelog.md whose
header date falls within the period. The output is a Hugo content page
at content/updates/YYYY-Wnn.md.

Defaults: previous ISO week (Mon 00:00 UTC through Sun 23:59:59 UTC),
computed relative to the current UTC date. Pass START_DATE and END_DATE
(YYYY-MM-DD, both inclusive) as positional arguments to override.

Skips writing if no new ## [X.Y.Z] sections landed during the period
(see ADR-0008: most weeks have no spec releases; an empty entry would
add noise, not signal). Caller checks whether a file was produced by
inspecting git status of content/updates/ after running.

The auto-generated page is a verbatim mirror of changelog content for
the period plus a header pointing at the canonical changelog. /updates/
is bot-authored; /blog/ (planned) is the human-curated long-form surface.

Run from the repo root.
"""

from __future__ import annotations

import re
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path


CHANGELOG = Path("content/spec/changelog.md")
OUTPUT_DIR = Path("content/updates")
VERSION_HEADER_RE = re.compile(r"^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})$")
NEXT_SECTION_RE = re.compile(r"^## \[")


def previous_iso_week(today: date) -> tuple[date, date]:
    """Return (start, end) for the ISO week immediately prior to today.

    "Previous ISO week" is the most recent fully-completed Monday-through-Sunday
    interval. If today is Monday, the prior week is the seven days ending
    yesterday (Sunday). If today is Wednesday, the prior week is the same
    seven days ending the most recent Sunday.
    """
    start_of_current = today - timedelta(days=today.isoweekday() - 1)
    end_of_prev = start_of_current - timedelta(days=1)
    start_of_prev = end_of_prev - timedelta(days=6)
    return start_of_prev, end_of_prev


def iso_year_and_week(d: date) -> tuple[int, int]:
    iso = d.isocalendar()
    return iso.year, iso.week


def parse_range_args() -> tuple[date, date]:
    if len(sys.argv) == 3:
        try:
            start = datetime.strptime(sys.argv[1], "%Y-%m-%d").date()
            end = datetime.strptime(sys.argv[2], "%Y-%m-%d").date()
        except ValueError as exc:
            sys.exit(f"ERROR: invalid date format ({exc}). Expected YYYY-MM-DD.")
        if start > end:
            sys.exit(f"ERROR: start ({start}) is after end ({end})")
        return start, end
    if len(sys.argv) != 1:
        sys.exit(
            "Usage: generate-update.py [START_DATE END_DATE]\n"
            "  dates are YYYY-MM-DD, both inclusive.\n"
            "  Omit both args to use the previous ISO week relative to today (UTC)."
        )
    today = datetime.now(timezone.utc).date()
    return previous_iso_week(today)


def extract_versions_in_range(start: date, end: date) -> list[tuple[str, str, str]]:
    """Return [(version, date_str, body_markdown), ...] for ## [X.Y.Z] sections
    whose header date falls within [start, end] inclusive."""
    text = CHANGELOG.read_text()
    lines = text.splitlines(keepends=True)

    versions: list[tuple[str, str, str]] = []
    i = 0
    while i < len(lines):
        m = VERSION_HEADER_RE.match(lines[i].rstrip("\n"))
        if m:
            version = m.group(1)
            date_str = m.group(2)
            d = datetime.strptime(date_str, "%Y-%m-%d").date()
            j = i + 1
            while j < len(lines) and not NEXT_SECTION_RE.match(lines[j]):
                j += 1
            body = "".join(lines[i:j]).rstrip() + "\n"
            if start <= d <= end:
                versions.append((version, date_str, body))
            i = j
        else:
            i += 1
    return versions


def write_update(
    start: date, end: date, versions: list[tuple[str, str, str]]
) -> Path | None:
    """Write the /updates/ entry for the period. Returns the path written,
    or None if no entry was needed (no versions in range)."""
    if not versions:
        print(
            f"No spec releases in {start.isoformat()} to {end.isoformat()}; "
            "skipping /updates/ entry per ADR-0008."
        )
        return None

    year, week = iso_year_and_week(start)
    iso_label = f"{year}-W{week:02d}"
    out_path = OUTPUT_DIR / f"{iso_label}.md"

    title_versions = ", ".join(f"v{v}" for v, _, _ in versions)
    title = f"ISO Week {week} of {year}: {title_versions}"
    link_title = f"Week {week} of {year}"
    description = (
        f"Auto-generated mirror of spec releases that landed in ISO week {week} of {year} "
        f"({start.isoformat()} to {end.isoformat()}): {title_versions}. "
        "See the canonical changelog for the full record."
    )

    # Frontmatter date uses the period START (Monday of the ISO week), not the
    # END. Hugo skips future-dated pages by default; for the cron's normal run
    # ("previous ISO week"), both dates are in the past, but for a one-shot
    # workflow_dispatch covering the current week the end would be future and
    # the page would not render. Using start avoids that class of bug.
    frontmatter = (
        "---\n"
        f'title: "{title}"\n'
        f'linkTitle: "{link_title}"\n'
        f'description: "{description}"\n'
        f"date: {start.isoformat()}\n"
        "use_lastmod: true\n"
        # Hugo lowercases the URL slug; alias the uppercase form so links
        # written with the canonical ISO-week label (`W20`) also resolve.
        f'aliases: ["/updates/{iso_label}/"]\n'
        "---\n\n"
    )

    intro = (
        f"This page mirrors spec releases that landed in ISO week {week} of {year} "
        f"({start.isoformat()} to {end.isoformat()}), consolidated from the "
        "[canonical changelog](/spec/changelog/). The changelog is the source of "
        "truth; this page is the periodic public surface that surfaces what shipped "
        "without requiring a reader to scan the full changelog.\n\n"
        "Per [ADR-0008](/adr/0008-updates-as-auto-consolidation/): `/updates/` is "
        "auto-generated from changelog releases; human-curated long-form lives at "
        "`blog.llmo.org` (planned).\n\n"
    )

    body_sections = "\n".join(v[2] for v in versions)
    page = frontmatter + intro + body_sections.rstrip() + "\n"

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path.write_text(page)
    print(
        f"Wrote {out_path}: {len(versions)} version section(s) for {iso_label} "
        f"covering {start.isoformat()} to {end.isoformat()}."
    )
    return out_path


def main() -> int:
    start, end = parse_range_args()
    if not CHANGELOG.exists():
        sys.exit(f"ERROR: {CHANGELOG} not found. Run from repo root.")
    versions = extract_versions_in_range(start, end)
    write_update(start, end, versions)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
