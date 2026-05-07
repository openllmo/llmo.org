#!/usr/bin/env python3
"""Weekly Sunday audit for static-state drift.

Runs six audit classes, each independent:

  1. URL resolution. Every https URL in committed .md/.html resolves: for
     llmo.org-hosted URLs, the path exists in the locally-built Hugo
     output; for external URLs, an HTTP HEAD or GET returns 2xx.
  2. LIP registry consistency. content/spec/lips/lip-NNNN.md frontmatter
     agrees with static/spec/lips/index.json.
  3. ADR registry consistency. content/adr/NNNN-*.md files agree with the
     table in content/adr/_index.md.
  4. Spec section anchor resolution. Internal links to spec sections
     (e.g. /spec/v0.1#4-2-signature-algorithms) resolve to a real heading
     in the rendered Hugo output.
  5. Cross-document reference integrity. References of the form ADR-NNNN,
     LIP-N, or version strings like v0.1.5 in .md files point at things
     that exist.
  6. JWKS publication freshness. The kid in the live llmo.json signature
     header has a matching key in the published JWKS, and valid_until is
     not within 7 days.

Findings are written to two outputs:

  - infrastructure/audit-findings/YYYY-WNN.md (human-readable markdown,
    sectioned by class)
  - <findings.json> (structured records, written next to the markdown
    file, used by the workflow to open GitHub issues)

The script does not mutate git state and does not open issues. Both
side effects are handled by the workflow that wraps it. Rationale: the
script is testable locally without GH credentials, and the workflow
encapsulates all "talks to the world" behavior.

Usage:
  python3 scripts/sunday-audit.py [--no-network] [--out-dir <path>]

  --no-network: skip class 1's external HTTP checks and class 6's live
                fetches. Used when CI lacks egress, or for local fast
                iteration. Local-only checks (classes 2/3/4/5 and class
                1's llmo.org-hosted-URL check) still run.
  --out-dir:    override the output directory. Default is
                infrastructure/audit-findings/ relative to repo root.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, asdict, field
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

LOCAL_HOST = "llmo.org"
USER_AGENT = "Mozilla/5.0 (compatible; llmo-sunday-audit/1.0; +https://llmo.org/)"
HTTP_TIMEOUT = 15
PUBLIC_DIR = "public"

# Files we never want to scan: build outputs, vendored bundles, git internals.
SKIP_DIRS = {".git", "node_modules", "public", "dist", "static/js/vendor", "infrastructure/audit-findings", "infrastructure/weekly-digest"}


@dataclass
class Finding:
    cls: str
    severity: str  # "error" | "warning"
    message: str
    file: str | None = None
    line: int | None = None
    machine_data: dict = field(default_factory=dict)

    def title(self) -> str:
        loc = ""
        if self.file:
            loc = f" in {self.file}"
            if self.line:
                loc = f"{loc}:{self.line}"
        return f"[audit/sunday] {self.cls}: {self.message[:80]}{loc}"


def repo_root() -> Path:
    return Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip())


def iter_files(root: Path, suffixes: tuple[str, ...]) -> list[Path]:
    out: list[Path] = []
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        if p.suffix not in suffixes:
            continue
        rel = p.relative_to(root).as_posix()
        if any(rel == d or rel.startswith(d + "/") for d in SKIP_DIRS):
            continue
        out.append(p)
    return sorted(out)


def http_status(url: str) -> int:
    """Return the HTTP status code for a HEAD-then-GET probe of `url`."""
    for method in ("HEAD", "GET"):
        try:
            req = urllib.request.Request(url, method=method, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
                return resp.status
        except urllib.error.HTTPError as e:
            if method == "GET":
                return e.code
        except Exception:
            if method == "GET":
                return 0
    return 0


# ---- Class 1: URL resolution ----

URL_RE = re.compile(r"https://[^\s<>\"')(\]\[`*]+")
TRAILING_PUNCT = re.compile(r"[`\],.:;)>*]+$")

# RFC 2606 reserved domains plus common documentation-placeholder hosts that
# should never be HTTP-checked. The audit's job is to find broken links readers
# would actually follow; documentation example URLs aren't candidates for
# clicking, so flagging their non-resolution adds noise.
SKIP_HOSTS = {
    "example.com", "example.org", "example.net", "example",
    "test", "invalid", "localhost",
    "yourdomain.com", "your-domain.com",
    # Hosts that consistently return 403/404 to unauthenticated bots even
    # though humans see 200; the audit cannot tell these apart from real
    # breaks, so the conservative move is to skip them.
    "fonts.googleapis.com", "fonts.gstatic.com",
    "dash.cloudflare.com",
    "www.npmjs.com",
}


def is_documentation_placeholder(url: str) -> bool:
    """Skip URLs that are clearly documentation placeholders, not real targets."""
    if "{" in url or "}" in url:
        return True
    if "&lt;" in url or "&gt;" in url or "<" in url or ">" in url:
        return True
    try:
        host = url.split("/")[2].lower()
    except IndexError:
        return True
    if not host:
        return True
    if host in SKIP_HOSTS:
        return True
    # Subdomains of reserved or placeholder hosts.
    for skip in SKIP_HOSTS:
        if host.endswith("." + skip):
            return True
    return False


def is_in_code_fence(lines: list[str], idx: int) -> bool:
    """True if line at index `idx` is inside a fenced code block."""
    in_fence = False
    for i in range(idx):
        line = lines[i].lstrip()
        if line.startswith("```"):
            in_fence = not in_fence
    return in_fence


def extract_urls(text: str) -> list[tuple[int, str]]:
    out: list[tuple[int, str]] = []
    lines = text.splitlines()
    for lineno, line in enumerate(lines, start=1):
        if is_in_code_fence(lines, lineno - 1):
            continue
        for match in URL_RE.finditer(line):
            url = TRAILING_PUNCT.sub("", match.group(0))
            if is_documentation_placeholder(url):
                continue
            out.append((lineno, url))
    return out


def hugo_path_for(url: str, root: Path) -> Path:
    path = url[len(f"https://{LOCAL_HOST}"):] or "/"
    if path.endswith("/"):
        return root / PUBLIC_DIR / path.lstrip("/").rstrip("/") / "index.html" if path != "/" else root / PUBLIC_DIR / "index.html"
    base = path.rsplit("/", 1)[-1]
    if "." in base:
        return root / PUBLIC_DIR / path.lstrip("/")
    return root / PUBLIC_DIR / path.lstrip("/") / "index.html"


def audit_url_resolution(root: Path, *, do_network: bool) -> list[Finding]:
    findings: list[Finding] = []
    files = iter_files(root, (".md", ".html"))
    seen_external: dict[str, int] = {}  # url -> status code, cached across files
    last_fetch: dict[str, float] = {}  # host -> last-fetch unix timestamp, for politeness

    for f in files:
        rel = f.relative_to(root).as_posix()
        text = f.read_text(errors="replace")
        for lineno, url in extract_urls(text):
            if url.startswith(f"https://{LOCAL_HOST}/") or url == f"https://{LOCAL_HOST}":
                target = hugo_path_for(url, root)
                if not target.exists():
                    findings.append(Finding(
                        cls="url-resolution", severity="error",
                        message=f"Local URL has no corresponding file in Hugo output: {url}",
                        file=rel, line=lineno,
                        machine_data={"url": url, "expected_path": str(target.relative_to(root))},
                    ))
                continue
            if not do_network:
                continue
            if url in seen_external:
                code = seen_external[url]
            else:
                # Per-host courtesy delay.
                try:
                    host = url.split("/")[2]
                except IndexError:
                    host = ""
                if host:
                    elapsed = time.time() - last_fetch.get(host, 0)
                    if elapsed < 0.5:
                        time.sleep(0.5 - elapsed)
                    last_fetch[host] = time.time()
                code = http_status(url)
                seen_external[url] = code
            if not (200 <= code < 300):
                findings.append(Finding(
                    cls="url-resolution", severity="error",
                    message=f"External URL returned HTTP {code}: {url}",
                    file=rel, line=lineno,
                    machine_data={"url": url, "status": code},
                ))
    return findings


# ---- Class 2: LIP registry consistency ----

FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---", re.DOTALL)


def parse_frontmatter(path: Path) -> dict:
    text = path.read_text()
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}
    out: dict = {}
    for line in m.group(1).splitlines():
        if ":" in line and not line.strip().startswith("- "):
            k, _, v = line.partition(":")
            out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def audit_lip_registry(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    registry_path = root / "static" / "spec" / "lips" / "index.json"
    lips_dir = root / "content" / "spec" / "lips"
    if not registry_path.exists():
        findings.append(Finding(
            cls="lip-registry", severity="error",
            message="static/spec/lips/index.json does not exist",
        ))
        return findings
    try:
        registry = json.loads(registry_path.read_text())
    except json.JSONDecodeError as e:
        findings.append(Finding(
            cls="lip-registry", severity="error",
            message=f"index.json is not valid JSON: {e}",
            file="static/spec/lips/index.json",
        ))
        return findings

    files = sorted(p for p in lips_dir.glob("lip-*.md") if not p.name.startswith("_"))
    file_by_num: dict[int, Path] = {}
    for f in files:
        m = re.match(r"lip-(\d{4})\.md$", f.name)
        if not m:
            continue
        file_by_num[int(m.group(1))] = f

    entries_by_num: dict[int, dict] = {}
    for entry in registry.get("lips", []):
        n = entry.get("lip")
        if not isinstance(n, int):
            findings.append(Finding(
                cls="lip-registry", severity="error",
                message=f"Registry entry has invalid 'lip' field: {entry}",
                file="static/spec/lips/index.json",
            ))
            continue
        entries_by_num[n] = entry

    # Every file has an entry; every entry has a file.
    for n, f in file_by_num.items():
        if n not in entries_by_num:
            findings.append(Finding(
                cls="lip-registry", severity="error",
                message=f"LIP-{n} file exists but has no registry entry",
                file=f.relative_to(root).as_posix(),
                machine_data={"lip_number": n},
            ))
    for n, entry in entries_by_num.items():
        if n not in file_by_num:
            findings.append(Finding(
                cls="lip-registry", severity="error",
                message=f"Registry entry LIP-{n} points at a non-existent file",
                file="static/spec/lips/index.json",
                machine_data={"lip_number": n, "entry": entry},
            ))
            continue
        # Status agreement.
        fm = parse_frontmatter(file_by_num[n])
        fm_status = fm.get("status")
        reg_status = entry.get("status")
        if fm_status and reg_status and fm_status != reg_status:
            findings.append(Finding(
                cls="lip-registry", severity="error",
                message=f"LIP-{n} status differs: frontmatter={fm_status!r} registry={reg_status!r}",
                file=file_by_num[n].relative_to(root).as_posix(),
                machine_data={"lip_number": n, "frontmatter_status": fm_status, "registry_status": reg_status},
            ))
    return findings


# ---- Class 3: ADR registry consistency ----

ADR_TABLE_ROW = re.compile(r"\|\s*\[ADR-(\d{4})\]\(([^)]+)\)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|")


def audit_adr_registry(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    adr_dir = root / "content" / "adr"
    index_path = adr_dir / "_index.md"
    if not index_path.exists():
        findings.append(Finding(
            cls="adr-registry", severity="error",
            message="content/adr/_index.md does not exist",
        ))
        return findings

    files = sorted(p for p in adr_dir.glob("[0-9][0-9][0-9][0-9]-*.md"))
    file_by_num: dict[int, Path] = {}
    for f in files:
        m = re.match(r"(\d{4})-", f.name)
        if m:
            file_by_num[int(m.group(1))] = f

    text = index_path.read_text()
    table_entries: dict[int, dict] = {}
    for m in ADR_TABLE_ROW.finditer(text):
        n = int(m.group(1))
        table_entries[n] = {
            "link": m.group(2),
            "title": m.group(3).strip(),
            "author": m.group(4).strip(),
            "status": m.group(5).strip(),
            "date": m.group(6).strip(),
        }

    for n, f in file_by_num.items():
        if n not in table_entries:
            findings.append(Finding(
                cls="adr-registry", severity="error",
                message=f"ADR-{n:04d} file exists but is not in the _index.md table",
                file=f.relative_to(root).as_posix(),
                machine_data={"adr_number": n},
            ))
            continue
        # Status agreement, where ADR file has a frontmatter status field.
        fm = parse_frontmatter(f)
        fm_status = fm.get("status")
        tab_status = table_entries[n]["status"]
        if fm_status and fm_status != tab_status:
            findings.append(Finding(
                cls="adr-registry", severity="error",
                message=f"ADR-{n:04d} status differs: frontmatter={fm_status!r} table={tab_status!r}",
                file=f.relative_to(root).as_posix(),
                machine_data={"adr_number": n, "frontmatter_status": fm_status, "table_status": tab_status},
            ))
    for n, entry in table_entries.items():
        if n not in file_by_num:
            findings.append(Finding(
                cls="adr-registry", severity="error",
                message=f"_index.md references ADR-{n:04d} but no matching file exists",
                file="content/adr/_index.md",
                machine_data={"adr_number": n, "entry": entry},
            ))
    return findings


# ---- Class 4: Spec section anchor resolution ----

# Anchors like /spec/v0.1#4-2-signature-algorithms or just #4-2-signature-algorithms in a spec doc.
ANCHOR_LINK_RE = re.compile(r"\]\(([^)]*?#[a-z0-9][\w-]*)\)")


def collect_anchors(public_dir: Path) -> dict[str, set[str]]:
    """Return {url_path: {anchor_id, ...}} from rendered Hugo output."""
    out: dict[str, set[str]] = {}
    for p in public_dir.rglob("*.html"):
        rel = "/" + p.relative_to(public_dir).as_posix().rstrip("index.html").rstrip("/")
        if not rel.endswith("/"):
            rel = rel + "/"
        text = p.read_text(errors="replace")
        ids = set(re.findall(r'id="([\w-]+)"', text))
        out[rel] = ids
    return out


def audit_spec_anchors(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    public = root / PUBLIC_DIR
    if not public.exists():
        findings.append(Finding(
            cls="spec-anchors", severity="error",
            message="Hugo output not built; cannot check anchor resolution",
        ))
        return findings
    anchors = collect_anchors(public)
    files = iter_files(root, (".md",))
    for f in files:
        rel = f.relative_to(root).as_posix()
        # Source page URL: convert content/X/Y.md or content/X/Y/_index.md to /X/Y/
        text = f.read_text(errors="replace")
        for lineno, line in enumerate(text.splitlines(), start=1):
            for m in ANCHOR_LINK_RE.finditer(line):
                target = m.group(1)
                if target.startswith("http") or target.startswith("mailto:"):
                    continue
                # Split target into (path, anchor)
                if "#" not in target:
                    continue
                path_part, anchor = target.split("#", 1)
                # Resolve path_part: empty means "current page"; we don't try to resolve current page anchors.
                if not path_part:
                    continue
                if not path_part.endswith("/"):
                    if "." in path_part.rsplit("/", 1)[-1]:
                        # Pointer to a file; not a Hugo page.
                        continue
                    path_part = path_part + "/"
                if path_part not in anchors:
                    # Page itself doesn't exist in Hugo output. Could be an external-style internal link;
                    # only report if it looks like an llmo.org-internal anchor (starts with /).
                    if path_part.startswith("/"):
                        findings.append(Finding(
                            cls="spec-anchors", severity="error",
                            message=f"Anchor link target page does not exist: {path_part}",
                            file=rel, line=lineno,
                            machine_data={"target_page": path_part, "anchor": anchor},
                        ))
                    continue
                if anchor not in anchors[path_part]:
                    findings.append(Finding(
                        cls="spec-anchors", severity="error",
                        message=f"Anchor #{anchor} not found at {path_part}",
                        file=rel, line=lineno,
                        machine_data={"target_page": path_part, "anchor": anchor},
                    ))
    return findings


# ---- Class 5: Cross-document reference integrity ----

ADR_REF_RE = re.compile(r"\bADR-(\d{4})\b")
LIP_REF_RE = re.compile(r"\bLIP-(\d{1,3})\b")
VERSION_REF_RE = re.compile(r"\bv(\d+\.\d+\.\d+)\b")


def audit_cross_references(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    adr_dir = root / "content" / "adr"
    lips_dir = root / "content" / "spec" / "lips"
    changelog = root / "content" / "spec" / "changelog.md"

    adr_files = {int(re.match(r"(\d{4})-", p.name).group(1)) for p in adr_dir.glob("[0-9][0-9][0-9][0-9]-*.md")}
    # LIP-2 is permanently Withdrawn; treat its number as known even without a file.
    lip_known = set()
    for p in lips_dir.glob("lip-*.md"):
        m = re.match(r"lip-(\d{4})\.md$", p.name)
        if m:
            lip_known.add(int(m.group(1)))
    lip_known.add(2)  # withdrawn placeholder

    versions_known: set[str] = set()
    if changelog.exists():
        for m in re.finditer(r"##\s*\[?(\d+\.\d+\.\d+)\]?", changelog.read_text()):
            versions_known.add(m.group(1))

    files = iter_files(root, (".md",))
    for f in files:
        rel = f.relative_to(root).as_posix()
        text = f.read_text(errors="replace")
        for lineno, line in enumerate(text.splitlines(), start=1):
            # Skip code fences for these lookups; they often contain fictitious examples.
            if line.lstrip().startswith("```"):
                continue
            for m in ADR_REF_RE.finditer(line):
                n = int(m.group(1))
                if n not in adr_files:
                    findings.append(Finding(
                        cls="cross-refs", severity="warning",
                        message=f"ADR-{n:04d} referenced but no such file exists",
                        file=rel, line=lineno,
                        machine_data={"reference": f"ADR-{n:04d}"},
                    ))
            for m in LIP_REF_RE.finditer(line):
                n = int(m.group(1))
                # Pad to 4-digit lookup
                if n not in lip_known:
                    findings.append(Finding(
                        cls="cross-refs", severity="warning",
                        message=f"LIP-{n} referenced but not in lips directory or known withdrawn list",
                        file=rel, line=lineno,
                        machine_data={"reference": f"LIP-{n}"},
                    ))
            for m in VERSION_REF_RE.finditer(line):
                ver = m.group(1)
                # Only check spec versions (vX.Y.Z where X.Y matches the spec series).
                if ver.startswith("0.1.") and versions_known and ver not in versions_known:
                    findings.append(Finding(
                        cls="cross-refs", severity="warning",
                        message=f"Spec version v{ver} referenced but not in changelog.md",
                        file=rel, line=lineno,
                        machine_data={"reference": f"v{ver}"},
                    ))
    return findings


# ---- Class 6: JWKS publication freshness ----

def b64url_decode(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    import base64
    return base64.urlsafe_b64decode(s + pad)


def audit_jwks_freshness(do_network: bool) -> list[Finding]:
    findings: list[Finding] = []
    if not do_network:
        return findings
    try:
        with urllib.request.urlopen(
            urllib.request.Request(f"https://{LOCAL_HOST}/.well-known/llmo.json", headers={"User-Agent": USER_AGENT}),
            timeout=HTTP_TIMEOUT,
        ) as resp:
            doc = json.loads(resp.read())
    except Exception as e:
        findings.append(Finding(
            cls="jwks-freshness", severity="error",
            message=f"Failed to fetch live llmo.json: {e}",
        ))
        return findings

    sig = doc.get("signature", {})
    protected = sig.get("protected")
    if not protected:
        findings.append(Finding(
            cls="jwks-freshness", severity="error",
            message="Live llmo.json has no signature.protected field",
        ))
        return findings
    try:
        header = json.loads(b64url_decode(protected))
    except Exception as e:
        findings.append(Finding(
            cls="jwks-freshness", severity="error",
            message=f"signature.protected is not valid base64url-encoded JSON: {e}",
        ))
        return findings
    kid = header.get("kid")
    if not kid:
        findings.append(Finding(
            cls="jwks-freshness", severity="error",
            message="Protected header has no kid field",
        ))
        return findings

    try:
        with urllib.request.urlopen(
            urllib.request.Request(f"https://{LOCAL_HOST}/.well-known/llmo-keys.json", headers={"User-Agent": USER_AGENT}),
            timeout=HTTP_TIMEOUT,
        ) as resp:
            jwks = json.loads(resp.read())
    except Exception as e:
        findings.append(Finding(
            cls="jwks-freshness", severity="error",
            message=f"Failed to fetch live JWKS: {e}",
            machine_data={"kid": kid},
        ))
        return findings

    keys = jwks.get("keys", [])
    if not any(k.get("kid") == kid for k in keys):
        findings.append(Finding(
            cls="jwks-freshness", severity="error",
            message=f"Live llmo.json signed with kid={kid!r} but no matching key in JWKS",
            machine_data={"kid": kid, "jwks_kids": [k.get("kid") for k in keys]},
        ))

    # Expiry warning.
    valid_until = doc.get("valid_until")
    if valid_until:
        try:
            vu = datetime.fromisoformat(valid_until.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            days = (vu - now).total_seconds() / 86400
            if days < 0:
                findings.append(Finding(
                    cls="jwks-freshness", severity="error",
                    message=f"Live llmo.json valid_until ({valid_until}) is in the past",
                    machine_data={"valid_until": valid_until, "days_remaining": days},
                ))
            elif days < 7:
                findings.append(Finding(
                    cls="jwks-freshness", severity="warning",
                    message=f"Live llmo.json valid_until ({valid_until}) is within 7 days",
                    machine_data={"valid_until": valid_until, "days_remaining": days},
                ))
        except Exception:
            pass
    return findings


# ---- Render and main ----

CLASS_LABELS = [
    ("URL resolution", "url-resolution"),
    ("LIP registry consistency", "lip-registry"),
    ("ADR registry consistency", "adr-registry"),
    ("Spec section anchor resolution", "spec-anchors"),
    ("Cross-document reference integrity", "cross-refs"),
    ("JWKS publication freshness", "jwks-freshness"),
]


def render_markdown(findings: list[Finding], commit_sha: str, runtime_s: float) -> str:
    iso_year, iso_week, _ = datetime.now(timezone.utc).isocalendar()
    title = f"Sunday Audit: {iso_year}-W{iso_week:02d}"
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    by_class: dict[str, list[Finding]] = {key: [] for _, key in CLASS_LABELS}
    for f in findings:
        if f.cls in by_class:
            by_class[f.cls].append(f)

    total = len(findings)
    n_error = sum(1 for f in findings if f.severity == "error")
    n_warn = sum(1 for f in findings if f.severity == "warning")

    lines = [
        f"# {title}",
        "",
        f"**Run:** {now}",
        f"**Repo state:** {commit_sha}",
        f"**Findings:** {total} total ({n_error} error, {n_warn} warning)",
        "",
    ]
    if total == 0:
        lines.append("_Audit completed cleanly. No drift detected._")
        lines.append("")
    for label, key in CLASS_LABELS:
        lines.append(f"## {label}")
        lines.append("")
        entries = by_class[key]
        if not entries:
            lines.append("_All clear._")
        else:
            for f in entries:
                loc = ""
                if f.file:
                    loc = f" (`{f.file}`"
                    if f.line:
                        loc += f":{f.line}"
                    loc += ")"
                lines.append(f"- **{f.severity.upper()}**: {f.message}{loc}")
        lines.append("")

    by_class_counts = {key: len(by_class[key]) for _, key in CLASS_LABELS}
    lines.append("## Summary")
    lines.append("")
    lines.append("| Class | Findings |")
    lines.append("|---|---|")
    for label, key in CLASS_LABELS:
        lines.append(f"| {label} | {by_class_counts[key]} |")
    lines.append("")
    lines.append(f"- Total runtime: {runtime_s:.1f}s")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-network", action="store_true")
    parser.add_argument("--out-dir", type=str, default=None)
    args = parser.parse_args()
    do_network = not args.no_network

    root = repo_root()
    out_dir = Path(args.out_dir) if args.out_dir else root / "infrastructure" / "audit-findings"
    out_dir.mkdir(parents=True, exist_ok=True)

    iso_year, iso_week, _ = datetime.now(timezone.utc).isocalendar()
    out_md = out_dir / f"{iso_year}-W{iso_week:02d}.md"
    out_json = out_dir / f"{iso_year}-W{iso_week:02d}.findings.json"

    commit_sha = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True, cwd=root).strip()

    findings: list[Finding] = []
    t0 = time.monotonic()
    print("Running URL resolution...", file=sys.stderr)
    findings += audit_url_resolution(root, do_network=do_network)
    print(f"  ({len(findings)} findings so far)", file=sys.stderr)
    print("Running LIP registry consistency...", file=sys.stderr)
    n0 = len(findings); findings += audit_lip_registry(root); print(f"  ({len(findings)-n0} new)", file=sys.stderr)
    print("Running ADR registry consistency...", file=sys.stderr)
    n0 = len(findings); findings += audit_adr_registry(root); print(f"  ({len(findings)-n0} new)", file=sys.stderr)
    print("Running spec anchor resolution...", file=sys.stderr)
    n0 = len(findings); findings += audit_spec_anchors(root); print(f"  ({len(findings)-n0} new)", file=sys.stderr)
    print("Running cross-document reference integrity...", file=sys.stderr)
    n0 = len(findings); findings += audit_cross_references(root); print(f"  ({len(findings)-n0} new)", file=sys.stderr)
    print("Running JWKS publication freshness...", file=sys.stderr)
    n0 = len(findings); findings += audit_jwks_freshness(do_network=do_network); print(f"  ({len(findings)-n0} new)", file=sys.stderr)

    runtime = time.monotonic() - t0

    out_md.write_text(render_markdown(findings, commit_sha, runtime))
    out_json.write_text(json.dumps([asdict(f) for f in findings], indent=2))
    print(f"Wrote {out_md.relative_to(root)} and {out_json.relative_to(root)} ({len(findings)} findings, {runtime:.1f}s)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
