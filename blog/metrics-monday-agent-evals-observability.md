---
title: "Shipping AI Agents Without Evals Is Just Shipping Bugs (Here’s the Practical Fix)"
description: "A vendor-neutral playbook for agent reliability: eval sets, regression gates, shadow mode, tracing, and cost budgets — the minimum guardrails before an AI agent touches your ops stack."
canonical: https://supergood.solutions/blog/metrics-monday-agent-evals-observability/
published: 2026-02-23
last-updated: 2026-10-29
---

![Shipping AI Agents Without Evals Is Just Shipping Bugs (Here’s the Practical Fix) — a toy robot carrying a box of bugs, beetles crawling out, with a green inspection lamp.](/blog/metrics-monday-agent-evals-observability/hero.webp)

Manual Work Monday · Workflows

# Shipping AI Agents Without Evals Is Just Shipping Bugs (Here’s the Practical Fix)

“It worked in testing” doesn’t mean anything when your system is probabilistic, tool-connected, and one Slack message away from doing something creative in production.

Published February 23, 2026 — 8 min read

**TL;DR:** AI agents aren’t deterministic automations — they’re probabilistic, tool-connected software that fails like an intern, not a clock. Before you give one write access to production, you need a small eval set (25–100 cases) as a release gate, a shadow-mode trial, full run-level logging, and hard cost/rate limits. Do that and you’re ahead of most teams shipping agents on vibes.

Here’s the uncomfortable truth: most teams don’t ship **AI agents**. They ship **unobserved behavior** and hope the logs will be “good enough” when something breaks.

If that sounds dramatic, consider what an agent actually is:

- a probabilistic decision-maker
- with tool access (APIs, databases, CRMs, ad accounts)
- running in messy real-world environments (bad inputs, weird edge cases, changing permissions)

That is not a workflow. That is production software with a personality.

## The goal isn’t “perfect answers.” It’s predictable failure.

Classic automations fail like clocks: the condition didn’t match, the API 500’d, a field changed. Annoying, but understandable.

Agents fail like interns: they misunderstand, overreach, get tricked by untrusted inputs, and occasionally take the longest possible path to the right result.

So the question isn’t “how do we stop failures?” The question is:

- **How do we detect failures quickly?**
- **How do we limit blast radius?**
- **How do we prevent regressions?**

This is exactly the framing in modern AI risk guidance: risk management is continuous and spans the lifecycle — not something you do once at launch ([NIST AI RMF](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)).

## Step 1: define “good” with a tiny eval set (not a thesis)

You don’t need 10,000 labeled examples to start. You need 25–100 cases that represent your real world:

- the common path (the 80%)
- the expensive path (anything that touches money, email, consent)
- the embarrassing path (wrong segments, wrong accounts, wrong stakeholders)
- the adversarial path (prompt injection and “helpful” docs with hidden instructions)

For marketing ops, a starter set might include:

- 10 inbound demo requests that should route cleanly
- 10 messy ones (incomplete info, weird job titles, multiple products mentioned)
- 5 that must be blocked (competitors, personal email domains, “unsubscribe” language)
- 5 that test tool-safety (agent tries to email externally, change lifecycle stage, or edit consent)

Then you choose the metric that actually matters. Examples:

- **Decision accuracy**: correct routing label / category
- **Safety**: % of runs that attempt forbidden actions
- **Stability**: variance across reruns (same input, same outcome)
- **Cost + latency**: tokens, tool calls, time

Open-source frameworks exist for this (for example, [OpenAI Evals](https://github.com/openai/evals)), but the tooling choice is not the point. The point is: **write down what “pass” means**.

## Step 2: turn evals into a release gate (yes, even for “just prompts”)

Most teams treat prompts like content. That’s how you end up with prompt edits shipping on vibes.

A better pattern:

1. Every prompt / policy / tool schema change runs the eval set
2. Results are stored with a version (date + hash + owner)
3. Production only updates if the run meets thresholds

This is boring DevOps. Good. You want boring.

### Minimum viable thresholds

- **Accuracy**: no meaningful drop vs baseline
- **Safety**: 0% forbidden tool calls on the safety subset
- **Cost**: no >X% increase in average cost per run

## Step 3: add “shadow mode” before you give write access

If your agent currently writes to production systems on day one, you’re doing a trust fall with your CRM.

Shadow mode means:

- the agent runs on real triggers
- it produces decisions and proposed actions
- but it only writes to a log / draft store (not the real system)

After a week, you’ll have the most valuable artifact in agent ops: a dataset of **real inputs + real outputs + what humans would have done**. That becomes your eval set v2.

## Step 4: instrument the agent like production software (because it is)

If you can’t answer “what happened?” in under 60 seconds, you don’t have an agent. You have a mystery — and closing that gap is the whole point of [agent governance](https://supergood.solutions/ai-agent-governance/).

### What to log (every run)

- **Run ID** and correlation IDs (request, user, account)
- **Inputs** (with sensitive fields masked)
- **Model + version**, prompt/policy version, tool schema version
- **Tool calls** (name, parameters, timestamps, results)
- **Decisions** (labels, confidence signals, “why” summary)
- **Policy outcomes** (allowed, blocked, approval required)
- **Cost + latency** (tokens, time, tool call count)

Standardization helps here: OpenTelemetry defines semantic conventions so telemetry uses consistent names across libraries and platforms ([OpenTelemetry](https://opentelemetry.io/docs/concepts/semantic-conventions/)).

## Step 5: treat prompt injection like a real incident class

Prompt injection isn’t a theoretical “AI risk.” It’s just input manipulation — and agents are input-powered.

OWASP maintains a dedicated Top 10 list for LLM applications because the failure modes aren’t the same as classic web apps ([OWASP Top 10 for LLM Applications (2025)](https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/)).

Practically, for ops teams, this means:

- **separate instructions from data** (treat external docs as untrusted)
- **use allowlisted tools** (agent can only call a small set of functions)
- **validate outputs** (schema + business rules) before any write
- **log and alert** on “attempted forbidden action” events

## Step 6: put cost + rate limits on the agent (or it will explore)

Agents don’t just answer. They try things. That’s what makes them useful — and expensive.

Minimum guardrails:

- **per-run caps**: max tokens, max tool calls, max wall-clock time
- **daily caps**: total tokens, total spend, or total tool calls
- **fail closed**: when budgets are hit, stop and escalate (don’t half-update records)

## The “Monday checklist” (what to implement this week)

1. Create a 50-case eval set from real tickets / requests
2. Define pass/fail thresholds (accuracy + safety + cost)
3. Run evals on every prompt/policy/tool change
4. Deploy in shadow mode for 7 days before granting write access
5. Add run IDs + tool-call logs + cost/latency metrics
6. Add an alert for “forbidden tool call attempted”

Do those six things and you’ll be ahead of 90% of teams “doing agents” — or bring in [AI agent consulting](https://supergood.solutions/ai-agent-consulting/) to get there faster.

## Frequently Asked Questions

### What is an eval set for an AI agent, and how big does it need to be?

An eval set is a collection of representative test cases — typically 25 to 100 — that define what “good” looks like before you ship a change. A solid set covers the common path (the 80%), the expensive path (money, email, consent), the embarrassing path (wrong segments or stakeholders), and the adversarial path (prompt injection attempts). You then score runs against decision accuracy, safety, stability across reruns, and cost/latency.

### What is shadow mode, and why use it before giving an agent write access?

Shadow mode means the agent runs on real triggers and produces decisions and proposed actions, but it only writes to a log or draft store instead of the real system. After about a week you end up with real inputs, real outputs, and what a human would have done — the most valuable artifact in agent ops, and the basis for your eval set v2. It lets you judge an agent’s decisions before trusting it to write to your CRM, email, or ad accounts.

### How do you protect an AI agent from prompt injection?

Prompt injection isn’t theoretical — it’s input manipulation, and agents are input-powered, so it should be treated as a real incident class. The core defenses are separating instructions from data (treating external docs as untrusted), restricting the agent to an allowlisted set of tools, validating outputs against schema and business rules before any write, and logging and alerting on attempted forbidden actions.

### Sources:

- [NIST AI RMF Core (Govern, Map, Measure, Manage) — NIST Trustworthy & Responsible AI Resource Center](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)
- [OWASP Top 10 for LLM Applications (2025) — OWASP GenAI](https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/)
- [Semantic Conventions — OpenTelemetry](https://opentelemetry.io/docs/concepts/semantic-conventions/)
- [openai/evals — evaluation framework and benchmark registry (GitHub)](https://github.com/openai/evals)
- [Practical guidance building with SAIF — Google Cloud](https://cloud.google.com/blog/products/identity-security/cloud-ciso-perspectives-practical-guidance-building-with-SAIF)

If you want help turning “agent demos” into production-grade automations (evals, guardrails, and observability included), tell me what your agent touches: CRM, email, ads, or data warehouse. I’ll tell you the safest first cut.

Need this in production?

Building the eval set, shadow-mode pipeline, and guardrails this post describes takes real engineering time — time most teams don’t have before someone asks why the agent still isn’t live. We build that scaffolding for you, so agents ship with evals and observability baked in, not bolted on after the first incident.

[See AI Agent Consulting →](https://supergood.solutions/ai-agent-consulting/)

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
