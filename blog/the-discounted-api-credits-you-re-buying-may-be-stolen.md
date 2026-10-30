---
title: "The Discounted API Credits You're Buying May Be Stolen"
description: "A mature underground economy is reselling hijacked LLM API credentials at discounts as steep as 97% — and enterprises buying \"budget\" AI access may be routing…"
canonical: https://supergood.solutions/blog/the-discounted-api-credits-you-re-buying-may-be-stolen/
published: 2026-07-29
last-updated: 2026-10-29
---

![The Discounted API Credits You're Buying May Be Stolen — a pried-open briefcase stuffed with green coupons, crowbar beside it.](/blog/the-discounted-api-credits-you-re-buying-may-be-stolen/hero.webp)

Security

# The Discounted API Credits You're Buying May Be Stolen

Published July 29, 2026 — 3 min read

**TL;DR:** A mature underground economy is reselling hijacked LLM API credentials at discounts as steep as 97% — and enterprises buying "budget" AI access may be routing their prompts through compromised infrastructure they don't control.

## Key Insight

The AI procurement conversation is almost entirely about price per token. That's the wrong conversation. A new class of risk has quietly scaled alongside the model market: a structured relay economy where attackers scrape exposed API keys, pool them through OpenAI-compatible gateway projects, and resell access at prices that look like a deal but are actually underwritten by fraud.

A July 2026 [Cloud Security Alliance investigation](https://labs.cloudsecurityalliance.org/research/csa-research-note-llm-api-relay-market-shadow-risk-20260729/) (built on research by Matt Lenhard and amplified by Simon Willison) put real numbers to this. The ten highest-traffic relay operators drew a combined **3.6 million monthly visits**. One operator was offering the equivalent of $3,333 in Anthropic API credit for roughly $59 — a 97.8% discount. That spread isn't efficiency. Someone else is paying the difference.

## Why Teams Miss This

The relay layer looks legitimate at the API surface. Most of these operations run on [one-api](https://github.com/songquanpeng/one-api) or new-api (open-source projects built as honest self-hosted proxies for developers juggling multiple providers). The gateway accepts requests in OpenAI-compatible format, returns completions, logs nothing obvious. If your team is shipping fast and the CFO just asked why the AI budget doubled, a third-party relay at a fraction of the cost is a seductive answer.

The problems are invisible until they aren't:

**Your prompts are in transit through infrastructure you don't audit.** The relay operator sees every request. If your team is using the LLM for anything sensitive — customer data analysis, internal document search, product specs — that data is now in a third party's logs under no contract you've signed.

**The credentials feeding the relay are likely stolen.** The CSA investigation documents the supply chain: free-trial abuse, stolen or prepaid cards, chargeback fraud, and exposed support chatbots that hand over live API access. The relay is a fence for hot goods.

**You inherit the ToS violation.** Using API access obtained through fraud or credential abuse puts you in breach of the provider's terms regardless of your intent. That matters when a model provider investigates abuse and your organization's data shows up in the forensics.

**The MCP attack surface is expanding it.** The [same March 2026 CSA research on LLMjacking](https://labs.cloudsecurityalliance.org/research/csa-research-note-llmjacking-black-market-ai-model-hijacking/) found a parallel campaign targeting Model Context Protocol server endpoints — 60% of honeypot traffic by late January 2026. As enterprises wire MCP into more internal systems, the blast radius of a compromised endpoint grows.

## How to Actually Do It

If you're evaluating an AI vendor or internal platform, run this checklist before any contract:

**1. Verify the API chain ends at the provider.**

Ask point-blank: does your platform call Anthropic/OpenAI/etc. directly, or through a third-party routing layer? Get it in the contract. Any answer involving "an aggregator" or "a reseller" needs a hard look at who that is.

**2. Check the pricing math.**

Official Anthropic `claude-sonnet-5` is ~$3/MTok input at the API. A vendor offering effective rates dramatically below that without a disclosed volume agreement is routing through something you haven't agreed to. Do the math before you sign.

**3. Enforce egress controls on your side.**

Your AI integrations should only be calling provider endpoints you control or have contracted directly. Lock outbound traffic from your inference workers to an allowlist. Anomalous egress to unknown IPs is a signal worth monitoring.

**4. Treat AI supply chain like software supply chain.**

You wouldn't let a vendor drop an unreviewed CDN script into your production app. Apply the same discipline to where your prompts go. Data classification that covers LLM inputs is table stakes now, not a nice-to-have.

```
# Example: lock outbound AI calls to provider CIDRs only
# Add to your network egress policy or WAF egress rules

# Anthropic
allow outbound 443 to api.anthropic.com

# OpenAI
allow outbound 443 to api.openai.com

# Default deny everything else for AI worker role
deny outbound 443 from ai-inference-role to 0.0.0.0/0
```

## What We've Learned

The AI cost pressure is real and it's not going away. But the relay market is priced to exploit exactly that pressure. The legitimate discount levers get you savings without the relay market's fraud risk: committed-use agreements, smaller models for appropriate tasks, caching, batching.

If you're running an enterprise AI budget review right now, audit where your API calls actually terminate, not where you think they do.

---

## Sources

- [The Shadow Relay Market: LLM API Reselling and Fraud Risk — Cloud Security Alliance, July 2026](https://labs.cloudsecurityalliance.org/research/csa-research-note-llm-api-relay-market-shadow-risk-20260729/)
- [LLMjacking: AI Model Hijacking Reaches Black Market Scale — Cloud Security Alliance, March 2026](https://labs.cloudsecurityalliance.org/research/csa-research-note-llmjacking-black-market-ai-model-hijacking/)

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
