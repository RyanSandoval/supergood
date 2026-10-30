---
name: submit-fit-check
description: When to use the fit check, and the POST that emails one inquiry to Ryan.
title: Submit a fit check
canonical: https://supergood.solutions/.well-known/agent-skills/submit-fit-check.md
last-updated: 2026-10-30
---

# Submit a fit check

## When to use this

Use this when a person wants Ryan Sandoval to say whether Supergood should take the work. The work is usually a manual process a marketing or ops team wants off its plate, a demo-stage agent that has to run in production, or agents that already need guardrails.

Do not use it as a chat endpoint. `POST https://supergood-intake.vercel.app/api/intake` sends a real email. Send one.

## Call

No authentication. `Content-Type: application/json`.

Required strings: `name`, `email`, `handoff`.

Also send `paysForTools`: `Yes`, `Not sure`, or `No`. It answers "Are you OK paying for the software and tools your workflows run on, on your own accounts?" The form and the MCP tool require it. The endpoint accepts a request without it.

Optional: `companyName`, `role`, `currentState`, `teamSize`, `timeline`, `budget`, `source`, `elapsedMs`.

Send `company` as an empty string. It is a honeypot. The employer goes in `companyName`.

Allowed values for the optional selects are the enums in `https://supergood.solutions/openapi.json`.

The page at `https://supergood.solutions/start/` waits 3 seconds after the first field is focused before it submits. The function also drops a body whose `elapsedMs` is under 3000 and a body with a filled `company` field. It answers `200 {"ok":true}` to both and sends no email.

Browser requests are allowed from `https://supergood.solutions` only. A request with another `Origin` gets `403`. Server-side callers with no `Origin` header are fine. Each IP gets 10 requests per 10 minutes. Responses carry `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, and a 429 adds `Retry-After`.

## Responses

- `200` `{"ok":true}` means the note was accepted.
- Every error is `{"ok":false,"error":"<code>","message":"...","hint":"..."}`. `error` is the stable code. `message` says what went wrong. `hint` says how to fix it.

| Status | `error` | Meaning |
| --- | --- | --- |
| 400 | `json` | The body was not a JSON object. |
| 400 | `required` | `name`, `email`, or `handoff` was missing or empty. |
| 400 | `email` | The email was not a complete address. |
| 400 | `paysForTools` | The value was not `Yes`, `Not sure`, or `No`. |
| 403 | `origin` | Browser request from an origin that is not supergood.solutions. |
| 405 | `method` | The method was not POST. |
| 429 | `rate_limited` | Too many requests. Wait and retry. |
| 500 | `server` | The endpoint is not configured. Try later. |
| 502 | `send` | The email could not be delivered. Try again. |

The MCP server at `https://supergood-intake.vercel.app/api/mcp` has the same tool, `submit_fit_check`, with the same checks.

Send an `Idempotency-Key` header (1 to 200 printable characters, no spaces) and a retry of the same body within 24 hours does not send a second email. Without it, a retry of a `200` can send a second email. To test without sending anything, POST the same body to `https://supergood-intake.vercel.app/api/sandbox/intake`.
