---
name: read-agent-instructions
description: Read the llmstxt.org-format index of supergood.solutions: what Supergood is, what it sells, and where its pages live.
---

# Read agent instructions

## When to use this

Use this when you need the short map of supergood.solutions: what the practice sells, which page covers it, and how to call the public JSON. For the rate card numbers, prefer `GET https://supergood.solutions/pricing.json`. For the service list, prefer `GET https://supergood.solutions/services.json`. To email Ryan one fit check, follow `https://supergood.solutions/.well-known/agent-skills/submit-fit-check.md`.

Fetch `GET https://supergood.solutions/llms.txt` for a short plain-text index of the site in the llmstxt.org format. It is served as `text/plain` and needs no authentication.

It returns:

- A one-paragraph description of Supergood, an AI consulting practice that builds production AI agents and automations for marketing and ops teams.
- The pricing model in prose (Quick Scan, Build, Run) and the link to the full rate card at `https://supergood.solutions/pricing/`.
- Links to each service page: AI Consulting, AI Agent Consulting, AI Automation Consulting, AI Readiness Assessment, AI Agent Governance.
- Links to About, FAQ, Blog, the project fit-check form at `https://supergood.solutions/start/`, and a list of featured blog posts.
- Pointers to `llms-full.txt`, `sitemap.xml`, the OpenAPI document, and `auth.md`.

Machine-readable calls, all without a key: `GET https://supergood.solutions/pricing.json`, `GET https://supergood.solutions/services.json`, and `POST https://supergood-intake.vercel.app/api/intake` for one fit check. The contract is `https://supergood.solutions/openapi.json`. An MCP server is at `https://supergood-intake.vercel.app/api/mcp` (card: `https://supergood.solutions/.well-known/mcp/server-card.json`). A person can also use the form at `https://supergood.solutions/start/`.
