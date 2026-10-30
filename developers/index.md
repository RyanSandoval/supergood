---
title: Supergood API and developer docs
description: How an agent reads pricing.json and services.json, and how it POSTs one fit check. No API key.
canonical: https://supergood.solutions/developers/
last-updated: 2026-10-29
---

# Supergood API

Supergood's site is static files on GitHub Pages. Two read endpoints live on that host. The fit-check form posts to a separate host. None of these calls need a key, a token, or an account. [auth.md](https://supergood.solutions/auth.md) says the same thing in the short form agents look for.

The contract is [openapi.json](https://supergood.solutions/openapi.json) (OpenAPI 3.1.0, version 1.0.0).

## Reads

`GET https://supergood.solutions/pricing.json`

Returns the rate card as JSON. The fit check is free. The Quick Scan is $1,000, credited toward a build if you sign within 14 days. A build starts at $4,000 per workflow. Run starts at $900 per month plus 10-20% of measured gain over an agreed baseline, capped at 1.5x the retainer, with a 3-month minimum. Same numbers as the [pricing page](https://supergood.solutions/pricing/).

`GET https://supergood.solutions/services.json`

Returns the five service pages and a one-line summary of each.

Both documents are the full list. They are not paged. A GET has no side effects.

```bash
curl -sS https://supergood.solutions/pricing.json
curl -sS https://supergood.solutions/services.json
```

## Fit check

`POST https://supergood-intake.vercel.app/api/intake`

`Content-Type: application/json`

This sends a real note to Ryan. One inquiry per person. A second POST with the same details can send a second email. There is no idempotency key.

Required strings: `name`, `email`, `handoff`.

Also send `paysForTools`: `Yes`, `Not sure`, or `No`. It answers "Are you OK paying for the software and tools your workflows run on, on your own accounts?" The form and the MCP tool require it. The endpoint accepts a request without it.

Optional: `companyName`, `role`, `currentState`, `teamSize`, `timeline`, `budget`, `source`, `elapsedMs`.

Send `company` as `""`. That field is a honeypot on the form. The employer's name goes in `companyName`.

The page at [/start/](https://supergood.solutions/start/) waits 3 seconds after the first field is focused before it will submit. The function also drops a body whose `elapsedMs` is under 3000, and a body with a filled `company` field. It answers `200 {"ok":true}` to both and sends no email.

Browser requests are allowed from `https://supergood.solutions` only. A request with another `Origin` gets 403. Server-side callers that send no `Origin` header are fine. Each IP gets 10 requests per 10 minutes.

The in-page tool `submit_fit_check` (WebMCP, `document.modelContext.registerTool` in `/assets/agent-tools.js`) waits 3 seconds and posts once. It is registered on the homepage, the fit-check page, and this page.

```bash
curl -sS -X POST https://supergood-intake.vercel.app/api/intake \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","company":"","handoff":"A Monday report rebuilt from three spreadsheets.","paysForTools":"Yes","source":"docs-example","elapsedMs":3000}'
```

That command creates a real inquiry. Do not run it as a test.

## Errors

Every error is JSON: `{"ok":false,"error":"<code>","message":"...","hint":"..."}`. `error` is a stable code, `message` says what went wrong, and `hint` says how to fix it. The MCP tool returns the same fields.

| Status | Body | What to do |
| --- | --- | --- |
| 200 | `{"ok":true}` | Ryan has the note. |
| 400 | `error: json` | The body was not a JSON object. Send JSON with Content-Type: application/json. |
| 400 | `error: required` | Send name, email, and handoff as non-empty strings. |
| 400 | `error: email` | Send a complete email address, then one more POST. |
| 400 | `error: paysForTools` | Send Yes, Not sure, or No. |
| 403 | `error: origin` | Browser request from an origin other than supergood.solutions. Call from a server, or use the form. |
| 405 | `error: method` | Use POST. A GET on this URL returns this error. |
| 429 | `error: rate_limited` | Wait a minute and retry. |
| 500 | `error: server` | The endpoint is not configured. Try later. |
| 502 | `error: send` | The email was not delivered. Try again in a minute. |

A missing path on `supergood.solutions` returns the HTML 404 page. GitHub Pages does not return JSON for that.

## Versioning

Version 1.0.0 is the document at `/openapi.json`. `pricing.json` and `services.json` are unpaged. If a change would break a caller, the old path stays and a new path is added. This page will say so. GitHub Pages cannot send a `Sunset` or `Deprecation` header.

## MCP server

The intake project hosts an MCP server. Streamable HTTP, stateless, no key: `https://supergood-intake.vercel.app/api/mcp`.

- `get_pricing`: the rate card. Read-only.
- `get_services`: the service list. Read-only.
- `submit_fit_check`: emails Ryan one fit check. Takes `name`, `email`, `handoff`, and `paysForTools`, plus the optional fields above. Each call sends one email.

The server card is at [/.well-known/mcp/server-card.json](https://supergood.solutions/.well-known/mcp/server-card.json). The server accepts requests from any origin and rate limits by IP.

```bash
curl -sS https://supergood-intake.vercel.app/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## What this host cannot do

This host is static, so the MCP server runs on the intake project, not here.

No OAuth server and no API keys. Publishing an authorization-server document would point at endpoints that are not there.

GitHub Pages does not let this repo set response headers. `/.well-known/api-catalog` is the RFC 9727 linkset, but the response will not carry `Content-Type: application/linkset+json`. There is also no HTTP `Link` header for the sitemap, the markdown twin, or the API catalog. The same URLs are linked from [robots.txt](https://supergood.solutions/robots.txt), [sitemap.xml](https://supergood.solutions/sitemap.xml), [llms.txt](https://supergood.solutions/llms.txt), and the head of the homepage.

## Where to look

- [OpenAPI](https://supergood.solutions/openapi.json)
- [auth.md](https://supergood.solutions/auth.md)
- [API catalog](https://supergood.solutions/.well-known/api-catalog)
- [MCP server card](https://supergood.solutions/.well-known/mcp/server-card.json)
- [Agent card](https://supergood.solutions/.well-known/agent-card.json)
- [Agents index](https://supergood.solutions/.well-known/agents.json)
- [Skills index](https://supergood.solutions/.well-known/agent-skills/index.json)
- [SKILL.md](https://supergood.solutions/.well-known/agent-skills/SKILL.md)
- [Fit-check form](https://supergood.solutions/start/)
