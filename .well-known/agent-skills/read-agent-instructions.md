---
name: read-agent-instructions
description: Read the llmstxt.org-format index of supergood.solutions: what Supergood is, what it sells, and where its pages live.
---

# Read agent instructions

Fetch `GET https://supergood.solutions/llms.txt` for a short plain-text index of the site in the llmstxt.org format. It is served as `text/plain` and needs no authentication.

It returns:

- A one-paragraph description of Supergood, an AI consulting practice that builds production AI agents and automations for marketing and ops teams.
- The pricing model in prose (Quick Scan, Build, Run) and the link to the full rate card at `https://supergood.solutions/pricing/`.
- Links to each service page: AI Consulting, AI Agent Consulting, AI Automation Consulting, AI Readiness Assessment, AI Agent Governance.
- Links to About, FAQ, Blog, the project fit-check form at `https://supergood.solutions/start/`, and a list of featured blog posts.
- Pointers to `llms-full.txt` and `sitemap.xml`.

Supergood has no API, MCP server or agent endpoint. This file and the pages it links to are the whole machine-readable surface. To start an engagement, a person fills in the form at `https://supergood.solutions/start/`.
