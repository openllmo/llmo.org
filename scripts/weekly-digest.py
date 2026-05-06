#!/usr/bin/env python3
"""Generate a weekly digest of repo activity.

Default range: the previous full ISO week (Mon 00:00 UTC through Sun 23:59:59 UTC),
computed relative to the current UTC date. Pass START_DATE and END_DATE
(YYYY-MM-DD, both inclusive) to override.

Output: infrastructure/weekly-digest/YYYY-WNN.md, where YYYY-WNN is the ISO
year and ISO week number of the start date.

Categorization is path-based:
- Spec changes:        content/spec/v0.1/**, content/spec/changelog.md
- LIP activity:        content/spec/lips/**, static/spec/lips/**
- ADR activity:        content/adr/**
- BACKLOG transitions: infrastructure/BACKLOG.md
- Infra and tooling:   .github/**, scripts/**, infrastructure/** (excluding BACKLOG.md)
- Other:               anything else

A commit appears in every category whose paths it touches; commits that
touch nothing in any category land in Other.
"""

from __future__ import annotations

import subprocess
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path


CATEGORIES = [
    ("Spec changes", "spec"),
    ("LIP activity", "lip"),
    ("ADR activity", "adr"),
    ("BACKLOG transitions", "backlog"),
    ("Infrastructure and tooling", "infra"),
    ("Other", "other"),
]


def classify(path: str) -> list[str]:
    cats: list[str] = []
    if path.startswith("content/spec/v0.1/") or path == "content/spec/changelog.md":
        cats.append("spec")
    if path.startswith("content/spec/lips/") or path.startswith("static/spec/lips/"):
        cats.append("lip")
    if path.startswith("content/adr/"):
        cats.append("adr")
    if path == "infrastructure/BACKLOG.md":
        cats.append("backlog")
    if (
        path.startswith(".github/")
        or path.startswith("scripts/")
        or (path.startswith("infrastructure/") and path != "infrastructure/BACKLOG.md")
    ):
        cats.append("infra")
    return cats


def previous_iso_week(today: date) -> tuple[date, date]:
    """Return (Mon, Sun) of the ISO week immediately preceding `today`'s week."""
    monday_this_week = today - timedelta(days=today.weekday())
    last_sunday = monday_this_week - timedelta(days=1)
    last_monday = last_sunday - timedelta(days=6)
    return last_monday, last_sunday


def parse_args(argv: list[str]) -> tuple[date, date]:
    if len(argv) == 1:
        return previous_iso_week(datetime.now(timezone.utc).date())
    if len(argv) == 3:
        start = date.fromisoformat(argv[1])
        end = date.fromisoformat(argv[2])
        if end < start:
            print(f"END_DATE {end} precedes START_DATE {start}", file=sys.stderr)
            sys.exit(2)
        return start, end
    print("Usage: weekly-digest.py [START_DATE END_DATE]", file=sys.stderr)
    sys.exit(2)


def git_commits(start: date, end: date) -> list[dict]:
    """Return commits whose author date falls in [start 00:00, end 23:59:59] UTC."""
    since = f"{start.isoformat()}T00:00:00+00:00"
    until = f"{end.isoformat()}T23:59:59+00:00"
    sep = "\x1e"
    fmt = f"%H{sep}%h{sep}%aI{sep}%an{sep}%s"
    out = subprocess.check_output(
        [
            "git",
            "log",
            f"--since={since}",
            f"--until={until}",
            "--reverse",
            f"--pretty=format:{fmt}",
            "--name-only",
        ],
        text=True,
    )
    commits: list[dict] = []
    cur: dict | None = None
    for line in out.split("\n"):
        if sep in line:
            if cur is not None:
                commits.append(cur)
            sha, short, iso, author, subject = line.split(sep, 4)
            cur = {
                "sha": sha,
                "short": short,
                "iso": iso,
                "author": author,
                "subject": subject,
                "files": [],
            }
        elif line.strip():
            if cur is not None:
                cur["files"].append(line.strip())
    if cur is not None:
        commits.append(cur)
    return commits


def render(start: date, end: date, commits: list[dict]) -> str:
    iso_year, iso_week, _ = start.isocalendar()
    title = f"Week {iso_week:02d} of {iso_year} ({start.isoformat()} to {end.isoformat()})"

    buckets: dict[str, list[dict]] = {key: [] for _, key in CATEGORIES}
    for c in commits:
        cats = set()
        for f in c["files"]:
            cats.update(classify(f))
        if not cats:
            cats.add("other")
        for k in cats:
            buckets[k].append(c)

    lines = [f"# {title}", ""]
    if not commits:
        lines += ["No commits in this range.", ""]
    else:
        for label, key in CATEGORIES:
            entries = buckets[key]
            lines.append(f"## {label}")
            lines.append("")
            if not entries:
                lines.append("_None._")
            else:
                for c in entries:
                    lines.append(f"- `{c['short']}` {c['subject']} ({c['author']})")
            lines.append("")

        total = len(commits)
        authors = sorted({c["author"] for c in commits})
        files_touched = sorted({f for c in commits for f in c["files"]})
        lines.append("## Summary statistics")
        lines.append("")
        lines.append(f"- Commits: {total}")
        lines.append(f"- Authors: {', '.join(authors) if authors else '(none)'}")
        lines.append(f"- Files touched: {len(files_touched)}")
        lines.append("")

    return "\n".join(lines)


def main() -> int:
    start, end = parse_args(sys.argv)
    iso_year, iso_week, _ = start.isocalendar()
    repo_root = Path(
        subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"], text=True
        ).strip()
    )
    out_dir = repo_root / "infrastructure" / "weekly-digest"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{iso_year}-W{iso_week:02d}.md"

    commits = git_commits(start, end)
    out_path.write_text(render(start, end, commits))
    print(f"Wrote {out_path.relative_to(repo_root)} ({len(commits)} commits)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
