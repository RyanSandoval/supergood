---
title: "UTMs Are a Mess. Here’s the 30‑Minute Fix (and the Automation to Keep Them Clean)"
description: "A simple UTM governance system + a Power Automate flow that rejects bad links before they wreck your reporting."
canonical: https://supergood.solutions/blog/utm-governance-automation/
published: 2026-02-21
last-updated: 2026-10-29
---

![UTMs Are a Mess. Here’s the 30‑Minute Fix (and the Automation to Keep Them Clean) — a tangle of blank luggage tags being combed straight with a green comb.](/blog/utm-governance-automation/hero.webp)

Guide · Workflows

# UTMs Are a Mess. Here’s the 30‑Minute Fix (and the Automation to Keep Them Clean)

A simple UTM governance system + a Power Automate flow that rejects bad links before they wreck your reporting.

Published February 21, 2026 — 7 min read

If you’ve ever tried to answer “which campaign drove pipeline?” and ended up in a spreadsheet argument… it’s not because GA4 is bad. It’s because your UTMs are chaos.

Real examples I see all the time:

- **utm\_medium=email** vs **utm\_medium=Email** (same thing, different bucket)
- **utm\_source=LinkedIn** vs **utm\_source=linkedin.com** vs **utm\_source=paid-social** (three “sources” for one channel)
- Campaign names that mutate weekly: **feb\_launch** → **FebLaunch** → **Launch-Feb**

The outcome is predictable: acquisition reports don’t match CRM reports, marketers stop trusting dashboards, and leadership decides attribution is “impossible.”

It’s not impossible. You just need two things:

1. **A tiny UTM rulebook** (one page, enforced)
2. **An automation gate** that blocks bad UTMs before they ship

## 1) Stop Treating UTMs Like Free‑Text

Google Analytics’ campaign URL builder exists for a reason: you add parameters like **utm\_source**, **utm\_medium**, and **utm\_campaign** so Analytics can attribute traffic correctly.

That only works if those values are consistent.

### The 5 Rules (Copy/Paste This into Your Team Wiki)

**Rule #1 — Only these mediums are allowed:**

- email
- paid\_social
- organic\_social
- cpc
- partner
- referral

**Rule #2 — Source is the platform, not a sentence.**  
Good: **linkedin**, **google**, **hubspot**  
Bad: **linkedin.com**, **paid-social**, **ryan-post**

**Rule #3 — Campaign names follow one format:**  
**YYYYMM\_theme\_offer\_audience** (all lowercase, underscores only)  
Example: **202602\_leadenrichment\_demo\_smb**

**Rule #4 — No spaces. No title case. No special characters.**  
If you need to “make it readable,” use your actual campaign naming inside the ad platform. UTMs are for machines.

**Rule #5 — Every link lives in one place.**  
If your team is building links in Slack threads, you’ve already lost. You need a single source of truth (sheet, list, whatever) that automation can validate.

## 2) Add an Automation Gate (So This Doesn’t Rely on Good Behavior)

Here’s the boring truth: governance without enforcement is a suggestion.

So we enforce it with a simple Power Automate flow.

### The Flow (High Level)

1. **Input:** a single “Campaign Links” table (Excel, SharePoint list, Airtable, whatever your team actually uses)
2. **Trigger:** a scheduled run (every weekday morning) *and/or* “when a row is added/modified”
3. **Validate:** check required UTMs, allowed values, naming format
4. **Fix what’s safe to fix:** lowercasing, trimming, swapping spaces → underscores
5. **Reject what isn’t safe:** missing campaign, unknown medium, nonsense source
6. **Notify:** send the marketer a message with the exact field to fix

### What You Validate (Minimum Viable)

- **Required:** utm\_source, utm\_medium, utm\_campaign
- **Optional (but useful):** utm\_content (creative), utm\_term (keyword)
- **Allowed mediums:** your fixed list (see Rule #1)
- **Campaign format:** YYYYMM\_theme\_offer\_audience

This is also where you catch the stuff that quietly breaks attribution: links missing UTMs, or UTMs added after a second “?” in the URL, or someone pasting a URL that already has query parameters and forgetting to use “&”.

### Why Scheduled Flows Work Well for This

Most teams don’t need real-time policing. They need *predictable hygiene*. A scheduled cloud flow is perfect when you want something to run automatically on a cadence (daily, weekly, whatever) without somebody remembering to click a button.

## The Payoff: Your Dashboards Stop Lying

When UTMs are consistent, you get three immediate benefits:

1. **Cleaner acquisition reporting in GA4** (channels don’t splinter into 14 nearly-identical buckets)
2. **Cleaner CRM attribution** (you can map source/medium/campaign into properties reliably)
3. **Faster analysis** (less “wait, what does ‘Linkedin’ mean?”)

And yes: you’ll still have attribution gaps. That’s normal. But you’ve removed the dumb, preventable errors that make people give up.

## The Bottom Line

UTMs aren’t “strategy.” They’re plumbing.

When the plumbing is broken, every report is a debate. When it’s clean, your team can finally argue about real things (offers, creative, targeting) instead of whether **paid-social** is a “source.”

**Your move:** pick 6 mediums, pick 20 sources, pick one campaign format. Then automate enforcement. Your future self will thank you.

### Sources:

- • [Google Analytics Help — URL builders: Collect campaign data with custom URLs](https://support.google.com/analytics/answer/10917952?hl=en)
- • [HubSpot Knowledge Base — Create tracking URLs](https://knowledge.hubspot.com/settings/how-do-i-create-a-tracking-url)
- • [Microsoft Learn — Run a cloud flow on a schedule in Power Automate](https://learn.microsoft.com/en-us/power-automate/run-scheduled-tasks)
- • [Microsoft Learn — Tutorial: Get started with cloud flows](https://learn.microsoft.com/en-us/power-automate/get-started-with-cloud-flows)

If your UTMs are already a dumpster fire: send me one messy export (GA4 + CRM), and I’ll tell you the exact rules + automation gate to fix it. Email [ryan@supergood.solutions](mailto:ryan@supergood.solutions).

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
