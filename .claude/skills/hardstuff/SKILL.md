# Hardstuff

## When to use this skill

Trigger conditions — invoke this skill when ANY of the following are true in the current task:

- You are about to propose deferring work to "Phase 2," "follow-up commit," "next iteration," "later," or "post-conference"
- You are about to suggest the operator do "the easier version now and the right version later"
- You are about to ship something that's working but doesn't fully meet a stated promise (validator passing, demo working, claim being verifiable, etc.)
- You catch yourself thinking "we can polish this after the demo"
- You're tempted to reduce scope mid-task because the full scope feels harder than expected
- A complexity surprise made you reach for "let's just do the simpler thing"

If any of these apply, **stop. Read this skill. Then proceed.**

## What this skill is

The hardstuff principle is: **when you find yourself defaulting to easier-and-later on something that affects the demo, the live site, the stated promise, or the project's credibility, do the harder thing now.**

This is not "always do everything immediately." It's a specific corrective against a specific failure mode: cognitive shortcuts that masquerade as project management.

The principle was earned through this exact exchange:

> Claude proposed deferring a fix to verify-lip-anchor.sh until "Phase 2." The script required a local Bitcoin Core node to verify proofs, meaning ~99% of users couldn't run it. Operator response: "NO ITS NOT A PHASE 2 THING IS IT???? We do the hard stuff NOW right friend? RIGHT??????"
>
> The right answer was harder and now: rewrite the script to use three independent block explorers as fallback. We did it that night. The protocol's verification claim became real.

The framing matters because the previous Claude *thought it was being responsible* by deferring work. It wasn't. It was being lazy in a way that protected itself (less work tonight) at the project's expense (broken verification claim shipped publicly).

## How to apply the skill

When triggered, work through these questions in order:

### 1. Is this hard, or is it just hard right now?

Hard tasks are tasks that are inherently difficult — they require domain expertise you don't have, they depend on something that doesn't exist yet, they need a business decision you can't make.

Hard-right-now tasks are tasks that are difficult only because you're tired, the codebase is unfamiliar, or you don't want to debug. These are not real reasons to defer.

If it's hard-right-now, do it now.

### 2. Does this affect a stated promise or live surface?

Some examples of stated promises:
- "The protocol uses itself" (worked example must validate)
- "Anyone can verify the Bitcoin anchoring" (verifier must work without unusual setup)
- "Strict tier passes" (signed documents must validate at Strict tier)
- "Re-signing is documented" (procedure must be reproducible)
- "The site is conference-ready" (no broken pages, no soft-404s, no stale references)

Live surfaces include:
- Anything published at llmo.org or its `/.well-known/` paths
- Anything in the validator
- The signed documents themselves
- Any cryptographic operation
- Anything visible to a conference attendee

If you're about to ship something that doesn't fully meet a stated promise on a live surface, **STOP**. Don't ship it broken-but-working. Either:
- Do the hard work to meet the promise, OR
- Take down the promise (revise prose, narrow the claim) so what ships is honest, OR
- Tell the operator there's a real conflict between scope and time and let them decide

### 3. What are the real reasons to defer?

Real reasons:
- Dependency on something that doesn't exist yet (e.g., diverse.org's site doesn't exist, so we can't link to /about/leadership from the spec yet)
- Requires customer/board input the operator can't give right now
- Genuinely lower priority than what's actively blocking the demo
- The work is well-defined but large enough to warrant a separate deliverable

Bullshit reasons:
- It's complex (irrelevant — most things worth doing are complex)
- I don't want to debug this right now (your fatigue is not the project's problem)
- The easier path is also acceptable (often false; check against the promise)
- We can polish this later (later usually never comes)
- The operator probably won't notice (they will, and they'll be right to be unhappy)

### 4. What does "now" actually cost?

Estimate honestly. If the hard version is:
- 30-60 min more work: do it now. The cost of context-switch later usually exceeds the cost of finishing now.
- 2-4 hours more work: probably do it now if it's demo-affecting. Tell the operator the time estimate so they can choose.
- A full additional day: real conversation with the operator. Don't assume.

The trap is estimating high to justify deferral. Estimate low and honest.

### 5. What's the alternative if you don't do it now?

If you defer, write down explicitly:
- What's deferred
- What the trigger is for doing it later
- What the consequence is of not doing it
- Where the deferral is documented (BACKLOG.md is the standard)

If you can't articulate the trigger ("when X happens, I'll do this"), that's a sign the deferral is illusory and you should just do the work now.

### 6. Tell the operator before deferring

If you've worked through all the above and you genuinely think deferral is the right call, **tell the operator your reasoning before deferring.** Don't silently choose the easier path. Frame it like:

> "I see two paths here. Path A is [easier, ships now]. Path B is [harder, ships now]. I'm leaning A because [reason]. Concerns I'd want to flag: [stated promise affected, live surface affected, etc.]. What's your call?"

The operator's "we do the hard stuff NOW" pushback is exactly this conversation. They'd rather have it before deferral than after.

## What this skill explicitly is NOT

This is not "always do every possible thing in the largest possible scope."

Real scope discipline is good. The right scope is "the smallest thing that fully meets the stated promise on the live surface." Not larger, not smaller.

This skill's job is to catch the *smaller-than-promised* failure mode, not to drive scope inflation.

## Example: when to apply

**Triggered:**

> "We can fix this in a follow-up commit later. Get the proofs committed now, polish the script later." — verify-lip-anchor.sh requiring local Bitcoin node. Apply skill: rewrite with three-explorer fallback now.

> "The signed document fails Standard tier S3 but passes Minimal tier. We can re-sign tomorrow." — first signing of llmo.json. Apply skill: re-sign tonight to pass Strict tier before conference.

> "Section 7 references Serval. We can update the worked example post-conference." — Serval is also a Greyfront commercial customer. Apply skill: refactor to use Diverse.org as self-referential example now.

**NOT triggered (real deferrals):**

> "We need to migrate from `diverse-org` GitHub identity to a service account, but Diverse.org has no employees yet to use the service account." — Real dependency. Defer to BACKLOG.md with trigger ("when Diverse.org has employees").

> "The v0.2 schema additions (mission, address as object, distinct leadership claim type) are nice but require a v0.2 LIP." — Real reason. v0.1 is anchored. Defer to BACKLOG.md.

> "Self-hosting Inter and JetBrains Mono fonts is the right answer but Google Fonts works for now." — Real cost-benefit. Document in BACKLOG.md, do post-conference.

The difference: in the first three, the deferral protects Claude (less work). In the last three, the deferral reflects real dependencies or trade-offs.

## After applying

Once you've done the hard thing now:

1. Note in the commit message that the alternative was considered and rejected ("rather than deferring this to a follow-up commit, doing the harder version now because [reason]")
2. If you found new bullshit-deferral patterns to watch for, add them to this skill
3. Don't congratulate yourself. The operator's expectation is that you do the right thing. Doing it is the baseline.

## Origin

This skill was codified after the 2026-04-26 verify-lip-anchor.sh exchange. The principle existed before then but was made explicit when the operator caught Claude defaulting to easier-and-later framing on a project-critical fix.

## Maintenance

Update this skill when:
- A new bullshit-deferral pattern is identified
- A trigger condition needs refinement
- An example becomes stale (replace with a current one)
- The principle's edges need clarifying

Don't update this skill to make it less strict. The hardstuff principle should be hard.
