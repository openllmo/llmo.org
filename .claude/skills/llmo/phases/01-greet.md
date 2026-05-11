# Phase 01: Greet and consent

## Goal

Confirm the publisher's role, explain what the skill does in two sentences, confirm consent to proceed. End the phase with the publisher knowing what they are about to do and consenting to it.

## Inputs

None.

## Outputs

- Publisher consent (yes/no).
- A working directory for the session (defaults to `./llmo-publish-<YYYY-MM-DD>/` in the current directory).

## Recipe

1. Greet briefly. One sentence.
2. State what the skill does in two sentences:
   - "I'll help you publish a signed `llmo.json` at `/.well-known/llmo.json` on your domain."
   - "Your job is to give me your email of record and review what I draft. I'll do the rest."
3. Mention the privacy posture in one line: nothing the publisher tells you leaves their local machine except a few `WebSearch` / `WebFetch` calls to public sources about their organization.
4. Ask for explicit consent: "Ready to start?" If no, exit politely. If yes, create the working directory and proceed to phase 02.

## Defaults

- Working directory: `./llmo-publish-<YYYY-MM-DD>/`.
- If the directory already exists, ask whether to resume or start fresh.

## Decisions

- If the publisher mentions they're not the right person to publish (e.g., "I'm an intern, my manager owns this"), gracefully exit and suggest they hand off to the right person.

## Failure modes

- Publisher refuses consent → exit, no work done.
- Publisher is unsure what LLMO is → point at https://llmo.org/ and offer to explain in 30 seconds; if they're still unsure, exit.
