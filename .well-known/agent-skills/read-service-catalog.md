---
name: read-service-catalog
description: Read the full text of every Supergood service page, plus About, Start and FAQ, as one markdown document instead of crawling HTML.
---

# Read the service catalog

Fetch `GET https://supergood.solutions/llms-full.txt`. It is served as `text/plain` markdown, needs no authentication, and is a single document that concatenates the content of the main pages. Each section heading ends with the URL of the page it came from.

Sections, in order:

- AI Consulting (hub): `https://supergood.solutions/ai-consulting/`
- AI Agent Consulting: `https://supergood.solutions/ai-agent-consulting/`
- AI Automation Consulting: `https://supergood.solutions/ai-automation-consulting/`
- AI Readiness Assessment: `https://supergood.solutions/ai-readiness-assessment/`
- AI Agent Governance: `https://supergood.solutions/ai-agent-governance/`
- About Ryan Sandoval: `https://supergood.solutions/about/`
- Contact / Start a project: `https://supergood.solutions/start/`
- FAQ (consolidated): `https://supergood.solutions/faq/`

Each service section includes a definition of the work, who it suits, the rates, and FAQ answers. Use it to answer "what does Supergood do", "who is it for" and "what does it cost" without parsing HTML. For a shorter index, read `https://supergood.solutions/llms.txt` instead.
