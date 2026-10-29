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

This sends a real note to Ryan. One inquiry per person. A second POST with the same details can send a second email. There is no idempotency key and no published rate limit.

Required strings: `name`, `email`, `handoff`.

Optional: `companyName`, `role`, `currentState`, `teamSize`, `timeline`, `budget`, `source`, `elapsedMs`.

Send `company` as `""`. That field is a honeypot on the form. The employer's name goes in `companyName`.

The page at [/start/](https://supergood.solutions/start/) waits 3 seconds after the first field is focused before it will submit. Checked on 2026-10-29, the function returned `200` for a body whose `elapsedMs` was `1`. Treat `elapsedMs` as the page's timer, not as a server lock.

Browser pages on `https://supergood.solutions` can call this URL. A request from another origin is not given `Access-Control-Allow-Origin`.

The in-page tool `submit_fit_check` (WebMCP, `document.modelContext.registerTool` in `/assets/agent-tools.js`) waits 3 seconds and posts once. It is registered on the homepage, the fit-check page, and this page.

```bash
curl -sS -X POST https://supergood-intake.vercel.app/api/intake \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","company":"","handoff":"A Monday report rebuilt from three spreadsheets.","source":"docs-example","elapsedMs":3000}'
```

That command creates a real inquiry. Do not run it as a test.

## Errors

The intake function returns JSON.

| Status | Body | What to do |
| --- | --- | --- |
| 200 | `{"ok":true}` | Ryan has the note. |
| 400 | `{"ok":false,"error":"required"}` | Send `name`, `email`, and `handoff` as non-empty strings. |
| 400 | `{"ok":false,"error":"email"}` | Send a complete email address, then one more POST. |
| 405 | `{"ok":false,"error":"method"}` | Use POST. A GET on this URL returns this body. |

The body has a code and no separate message field. Those three codes are the vocabulary observed on 2026-10-29.

A missing path on `supergood.solutions` returns the HTML 404 page. GitHub Pages does not return JSON for that.

## Versioning

Version 1.0.0 is the document at `/openapi.json`. `pricing.json` and `services.json` are unpaged. If a change would break a caller, the old path stays and a new path is added. This page will say so. GitHub Pages cannot send a `Sunset` or `Deprecation` header.

## What this host cannot do

No MCP server. Streamable HTTP needs a process this static repo does not run. The intake function lives in a separate project and is the place to add one. Until that exists, do not look for `/.well-known/mcp/server-card.json`.

No OAuth server and no API keys. Publishing an authorization-server document would point at endpoints that are not there.

GitHub Pages does not let this repo set response headers. `/.well-known/api-catalog` is the RFC 9727 linkset, but the response will not carry `Content-Type: application/linkset+json`. There is also no HTTP `Link` header for the sitemap, the markdown twin, or the API catalog. The same URLs are linked from [robots.txt](https://supergood.solutions/robots.txt), [sitemap.xml](https://supergood.solutions/sitemap.xml), [llms.txt](https://supergood.solutions/llms.txt), and the head of the homepage.

## Where to look

- [OpenAPI](https://supergood.solutions/openapi.json)
- [auth.md](https://supergood.solutions/auth.md)
- [API catalog](https://supergood.solutions/.well-known/api-catalog)
- [Agent card](https://supergood.solutions/.well-known/agent-card.json)
- [Agents index](https://supergood.solutions/.well-known/agents.json)
- [Skills index](https://supergood.solutions/.well-known/agent-skills/index.json)
- [SKILL.md](https://supergood.solutions/.well-known/agent-skills/SKILL.md)
- [Fit-check form](https://supergood.solutions/start/)
