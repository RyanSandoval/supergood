---
name: read-rate-card
description: Read Supergood's published rate card: the free fit check, the Quick Scan, per-workflow Builds and the monthly Run retainer.
title: Read the rate card
canonical: https://supergood.solutions/.well-known/agent-skills/read-rate-card.md
last-updated: 2026-10-30
---

# Read the rate card

Supergood publishes its pricing openly. These places carry it, all plain GETs with no authentication:

1. `GET https://supergood.solutions/pricing.json` is the machine-readable rate card, served as `application/json`.
2. `GET https://supergood.solutions/pricing/` is the same card as a page, served as `text/html`.
   `GET https://supergood.solutions/pricing.md` is the same card as markdown.
3. `GET https://supergood.solutions/llms.txt` states the same model in the opening paragraph, as `text/plain`.
4. `GET https://supergood.solutions/llms-full.txt` repeats it under each service heading, with FAQ answers and market-rate comparisons, as `text/plain` markdown.

The rate card has these tiers, in order:

- **Fit check:** free, about two minutes, via the form at `https://supergood.solutions/start/`.
- **Quick Scan:** a fixed price, credited toward a build if the client signs within 14 days.
- **Build:** priced per workflow, starting at a stated minimum, with a fixed quote issued after the Quick Scan. Half is due at kickoff and half at launch.
- **Run:** a monthly retainer plus a percentage of measured gain over an agreed baseline, capped at a multiple of the retainer, with a 3-month minimum.

Clients pay for tools, APIs and seats on their own accounts. Supergood does not resell or mark up software.

Read the dollar amounts from `pricing.json` or the live pricing page, not from this file, so they are never out of date.
