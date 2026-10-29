---
name: submit-fit-check
description: When to use the fit check, and the POST that emails one inquiry to Ryan.
---

# Submit a fit check

## When to use this

Use this when a person wants Ryan Sandoval to say whether Supergood should take the work. The work is usually a manual process a marketing or ops team wants off its plate, a demo-stage agent that has to run in production, or agents that already need guardrails.

Do not use it as a chat endpoint. `POST https://supergood-intake.vercel.app/api/intake` sends a real email. Send one.

## Call

No authentication. `Content-Type: application/json`.

Required strings: `name`, `email`, `handoff`.

Optional: `companyName`, `role`, `currentState`, `teamSize`, `timeline`, `budget`, `source`, `elapsedMs`.

Send `company` as an empty string. It is a honeypot. The employer goes in `companyName`.

Allowed values for the optional selects are the enums in `https://supergood.solutions/openapi.json`.

The page at `https://supergood.solutions/start/` waits 3 seconds after the first field is focused before it submits. On 2026-10-29 the function returned `200` for `elapsedMs` of `1`. Treat that field as the page's timer, not a server lock.

## Responses

- `200` `{"ok":true}` means the note was accepted.
- `400` `{"ok":false,"error":"required"}` means `name`, `email`, or `handoff` was missing or not a string.
- `400` `{"ok":false,"error":"email"}` means the email was not a complete address.
- `405` `{"ok":false,"error":"method"}` means the method was not POST.

A retry of a `200` can send a second email. There is no idempotency key.
