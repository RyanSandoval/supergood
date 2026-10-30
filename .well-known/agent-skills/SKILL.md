---
name: supergood
description: When to use Supergood's public files, and how an agent should call the rate card, the service list, and the fit check.
---

# Supergood

## When to use this

Use this when someone needs Supergood's published rates, a match to one of its five services, or a fit check sent to Ryan Sandoval.

Supergood is a fit for a marketing or ops team with recurring manual work (data entry, reporting, lead routing, campaign setup) that should run on tools the team already pays for. It is also a fit when an agent works in a demo and now has to run in production, or when agents already act on their own and need allowlists, approval checkpoints, spend limits, and an incident runbook.

A buyer who does not know where AI would pay off can start with the $1,000 Quick Scan. A buyer who wants the rate card first can read it without writing in.

Do not POST a fit check to ask a general question. That call emails Ryan.

## How an agent should call

No key and no token.

1. `GET https://supergood.solutions/pricing.json` for the rate card.
2. `GET https://supergood.solutions/services.json` for the service list.
3. `POST https://supergood-intake.vercel.app/api/intake` with `name`, `email`, `handoff`, and `paysForTools` (`Yes`, `Not sure`, or `No`) to send one fit check. Leave `company` as `""`. Put the employer in `companyName`.

The field list, error codes, and examples are in `https://supergood.solutions/openapi.json` and `https://supergood.solutions/developers/`. Authentication is `https://supergood.solutions/auth.md`.

The other skills in `https://supergood.solutions/.well-known/agent-skills/index.json` point at the long-form pages and the blog. This file is the short version of how to call.

An MCP server (Streamable HTTP, no key) is at `https://supergood-intake.vercel.app/api/mcp`. Tools: `get_pricing`, `get_services`, `submit_fit_check`. Card: `https://supergood.solutions/.well-known/mcp/server-card.json`.
