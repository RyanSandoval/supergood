---
name: read-rate-card
description: Read Supergood's published rate card: intro call, Sidekick Session, Setup Sprint, Sidekick Monthly, and Quick Scan and Build for teams of 10 or more.
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

- **Intro call:** free, via the form at `https://supergood.solutions/start/`. The machine id is still `fit-check`.
- **Sidekick Session:** a fixed price, credited in full to a Setup Sprint signed within 14 days.
- **Setup Sprint:** a starting price for two or three workflows.
- **Sidekick Monthly:** a monthly retainer, 3-month minimum, plus an optional percentage of measured gain capped at a multiple of the retainer.
- **Quick Scan:** for teams of 10 or more. A fixed price, credited toward a build if the client signs within 14 days.
- **Build:** for teams of 10 or more. Priced per workflow, starting at a stated minimum, with a fixed quote issued after the Quick Scan. Half is due at kickoff and half at launch.

Clients pay for tools, APIs and seats on their own accounts. Supergood does not resell or mark up software.

Read the dollar amounts from `pricing.json` or the live pricing page, not from this file, so they are never out of date.
