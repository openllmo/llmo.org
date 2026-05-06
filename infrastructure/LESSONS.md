# LLMO Project Lessons

Append-only record of operational and procedural failure modes encountered during LLMO project work. Each entry: what happened, why it failed, what to do differently. No estimates, no Track tags. This is institutional memory, not a backlog: items here are not pending work, they are records of how we learned to do something.

When a procedural failure happens, add an entry. Do not delete or rewrite past entries. If a lesson is later refined or superseded, append a new entry that supersedes the old one and note the supersession in the new entry.

Format: dated heading per entry, three subheadings (What / Why / Different). Most recent at the bottom (append-only).

---

## 2026-05-05: Clipboard-wipe trap during ceremony private-key insertion

**What:** Copying commands from chat into Terminal during ceremony Phase 3 wiped the password-manager clipboard contents repeatedly. Each time the operator copied a different intermediate value (a path, a flag, a command), the previously-copied private key was overwritten before it reached the script.

**Why:** Terminal copy/paste shares the system clipboard with the password manager. Any intermediate clipboard operation between "copy key from password manager" and "paste key into script" overwrites the secret. The ceremony procedure as documented did not warn about this, and the operator naturally moved between clipboard sources while assembling commands.

**Different:** Integrate the `op` CLI (1Password command-line) into the signing script so the script retrieves the key directly without clipboard touching, or pipe the key from the password manager to the signing script via stdin in a single shell command. Update `infrastructure/SIGNING-CEREMONY.md` to document the trap explicitly: do not copy intermediate values once the secret is on the clipboard. Treat the clipboard between "copy secret" and "paste secret" as locked.

---

## 2026-05-05: Anchor-PR-number ordering in LIP transitions

**What:** LIP anchoring scripts ran before PR numbers were assigned, producing anchors that recorded placeholder values (or no PR-number reference) for proposals later associated with specific PRs. The anchored OpenTimestamps proof was technically valid but lacked the registry cross-reference the LIP-1 process expects.

**Why:** OpenTimestamps anchors must commit to the proposed state, including the PR-number cross-reference for traceability. The PR number does not exist until the PR is opened. Anchoring before PR creation produces an anchor that is structurally complete but missing a load-bearing reference.

**Different:** Anchor scripts should refuse to run without an explicit PR-number argument, and fail loudly if the argument is missing. Workflow ordering: open the PR first, capture the assigned PR number, then anchor against the proposed state at that point. SIGNING-CEREMONY.md and any LIP-anchoring docs should state the ordering constraint explicitly.

---

## 2026-05-05: Long ceremony filenames create retype friction

**What:** Filenames like `private-jwk-diverse-2026-01.json` are unnecessarily long and error-prone to retype during ceremony commands. The operator transposed characters, omitted the `private-` prefix, and lost time on filename-typing errors.

**Why:** The kid (key identifier `diverse-2026-01`) is the cryptographic identifier and must stay stable across ceremonies. The on-disk filename, however, is local-only and can be anything the scripts agree on. Conflating the kid with the filename pushed kid-length pain into every command line.

**Different:** Use short filenames inside date-versioned ceremony directories. The directory carries the date context (`~/llmo-key-ceremony-2026-MM-DD-vN/`); the filename inside it can be terse (`key.json`, `payload.json`, `signed.json`). Update `infrastructure/SIGNING-CEREMONY.md` to specify the short-filename convention and reserve the long, kid-bearing names for in-document fields where stability across ceremonies actually matters.
