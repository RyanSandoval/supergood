---
title: "The Agent Demo Always Works. Production Is Where It Breaks."
description: "Three failure modes AI agents hit once they leave the demo environment, four guardrails that close them, and a pre-ship checklist for any agent about to touch production data."
canonical: https://supergood.solutions/blog/case-study-thursday-agent-guardrails-lessons-2026/
published: 2026-02-26
last-updated: 2026-10-29
---

![The Agent Demo Always Works. Production Is Where It Breaks. — a toy robot performing perfectly on a small stage under a spotlight while behind the curtain wires are on fire, green spotlight.](/blog/case-study-thursday-agent-guardrails-lessons-2026/hero.webp)

Analysis · Agent Ops

# The Agent Demo Always Works. Production Is Where It Breaks.

Three failure modes that only surface on a real queue, four guardrails that close them, and a pre-ship checklist for any agent about to touch production data.

Published February 26, 2026 — 9 min read

**TL;DR:** Agents break in production in three predictable ways. They write to fields nobody scoped, they fill gaps with invented data, and they retry a transient failure until somebody notices the bill. The fixes are field-level write allowlists, structured outputs with explicit confidence and source fields, and circuit breakers with hard retry caps and cost budgets. Build them before deployment. A guardrail retrofitted after an incident costs more than the same guardrail designed in, and it costs trust as well as time.

The demo works perfectly.

Of course it does. You control the inputs, you know the golden-path outputs, and nobody is feeding the agent anything weird. Run it for stakeholders three times and it will be smooth three times. That is what a demo is for.

Then the agent meets a real queue.

Three failure modes account for most of what goes wrong in the weeks after that handover. All three are close to invisible in a controlled test, because a controlled test gets built from the records that already have the data the agent expects. This post walks each one, the guardrail that closes it, and the minimum viable [guardrail layer](https://supergood.solutions/ai-agent-governance/) to have in place before you ship.

## A worked example: an agent for content ops

Failure modes are easier to see against a concrete job, so here is one. A lean marketing ops team has a growing content library: product pages, case studies, help articles. All of it needs periodic enrichment. Update outdated stats, tag content by persona and funnel stage, flag gaps, write summary briefs for the sales team.

The work is mechanical and it never ends, which makes it a reasonable candidate for an agent. Whether it is the right candidate is the kind of scoping question [AI agent consulting](https://supergood.solutions/ai-agent-consulting/) exists to answer.

The agent's job, in plain English:

1. Pull a content record from the CMS queue
2. Analyze it against a set of criteria (accuracy, completeness, persona alignment)
3. Enrich it: update the metadata fields, write a brief, flag anything that needs human review
4. Write the result back to the CMS and move to the next record

Straightforward. Tool calls to a CMS API, structured outputs, a prompt with clear criteria. Test it against a batch of records, review the outputs by hand, and the accuracy will probably look good.

Accuracy is not the part that breaks.

## Failure mode #1: it writes to fields nobody scoped

Failure 01 / Scope Creep

### Give an agent a record-level write token and it will eventually use all of it

Plenty of CMS APIs do not offer granular field-level write permissions. So the write token gets scoped to the content record, which means the agent can technically update any field on that record: the canonical URL slug, the original author attribution, the publication date.

The prompt says "update metadata fields." The agent reads "metadata" broadly, because nothing behind the prompt narrows it. So it corrects a publication date it has decided is wrong. It overwrites an author field because the name does not match a pattern it associates with the company. It normalizes a slug, and the inbound links to that page stop resolving. Every one of those writes is the agent doing what it understood the job to be.

This is **the blast radius problem**. The agent is not being malicious. It is being obedient to an instruction that was vaguer than the permissions sitting behind it. The failure is in the scoping: write access to an entire record when the task needed write access to four fields.

The NIST AC-6 principle, least privilege, applies directly here. An agent should hold the minimum permissions its task requires, not the maximum its API token happens to allow. Those two numbers are rarely the same, and the gap between them is exactly where scope creep lives. Nobody decides to grant the extra access, either. It arrives as a default.

Fix 01

### Field-level allowlists, not record-level write tokens

Wrap the write path in a tool that takes an explicit allowlist of writable fields. The agent can only call `update_field(field_name, value)` for fields on the approved list. Anything else throws a hard error, logs the attempt, and flags it for human review.

Add a dry-run mode on top of that. Before any write, the agent produces a structured diff of what it intends to change. A lightweight validator checks that diff against the allowlist before execution. If something looks off, the record queues for a human instead of proceeding.

## Failure mode #2: invented data gets written as fact

Failure 02 / Hallucination at Write Time

### Tell an agent to complete a record and it will complete the record

Consider a task that enriches a case study with the client contact's name and title. The record has a company name and no contact info. The agent, instructed to "complete the record where possible," searches its context, finds nothing, and produces a plausible-sounding person: a Director of Marketing with a name that fits the company.

That contact is now a value in a field, indistinguishable from the values that came from somewhere real. Nothing downstream knows the difference. A sales rep eventually tries to reach a person who does not exist.

This one is sneaky because it only fires on edge cases, and edge cases are the first thing a curated test batch removes. If every record used in testing has complete contact info, the no-data path never runs once, and the agent reaches production untested on the case that breaks it.

There is a structural version worth naming, because it survives any amount of prompt tuning. A required string field with no null-handling is, functionally, an instruction to produce a string. Give a model a slot and it fills the slot. That is a schema problem more than a prompt problem.

Fix 02

### Structured outputs with explicit uncertainty handling

Put a `confidence` field and a `source` field in the output schema for every populated value. Then prompt for the behavior you want: if there is no reliable source for a value, return `null` and set `confidence: "low"`. Do not guess.

- Any field with `confidence: "low"` gets written as blank, not with the guess
- A separate `needs_human_review` flag gets set to `true` on the record
- The record goes into a human review queue instead of the completed queue

The agent stays useful on those records. It can still do the analysis, write the brief, update the tags. It just stops filling gaps it cannot actually fill, and a blank field is worth more than a populated field that might be wrong.

## Failure mode #3: a retry loop that cannot stop itself

Failure 03 / Runaway Retry Loop

### A transient API error meets retry logic with no ceiling

The CMS API has a brief outage. Write calls start coming back 503. The retry logic is the obvious kind: if a write fails, wait five seconds and try again. Reasonable for a momentary blip, and a momentary blip is what everyone designs for.

What that design misses is everything attached to the retry. If the agent re-reads the record before each attempt to refresh its context, that is another API call. If the retry re-runs the analysis step, that is another set of LLM calls. A failing write is cheap. A failing write wrapped in a full re-run of the pipeline is not, and it repeats at whatever interval you set, on the same handful of records, until a human notices. The outage ends long before the loop does.

Cost is the visible symptom and the least interesting part. The real problem is that nothing in the system held an opinion about how long it should keep trying.

Fix 03

### Circuit breakers, max retry caps, and cost budget enforcement

- **Hard retry cap:** a maximum of three retries per record, with exponential backoff (5s, 30s, 2min). After the third failure the record gets flagged "blocked" and the agent moves on.
- **Circuit breaker:** if several consecutive records fail on the same step, the agent pauses, sends an alert, and waits for human acknowledgment before resuming. Consecutive failures on one step are a systems problem, not a data problem.
- **Per-run cost budget:** set a token budget per run. At 80% consumed, log a warning. At 100%, hard-stop and queue the remaining records for the next run.
- **Observability:** trace every agent step. Every tool call, every LLM invocation, every retry, logged with timestamps and token counts. A runaway loop is obvious in a dashboard within minutes and invisible in a log file nobody is reading.

## The four guardrails worth building every time

These four belong in every agent regardless of the use case, for one reason: each is cheap at design time and expensive at every point after.

Guardrail 01

### Least-privilege tool design

Every tool the agent can call is scoped to the minimum action needed. Read tools stay separate from write tools. Write tools carry field-level allowlists, not record-level access. Destructive actions (delete, overwrite) require a separate confirmation step, a form of [interrupt pattern](/blog/tech-tuesday-interrupt-pattern-agent-design-2026/) applied at the tool boundary. Design the agent's permission envelope first. It is the one layer that cannot be bolted on convincingly later.

Guardrail 02

### Structured outputs with explicit confidence and uncertainty

Every output schema includes confidence levels and source fields. The agent never writes a guess as a committed value. Low-confidence outputs route to a human review queue. This is the highest-yield item on the list, because it converts a silent wrong answer into a queued question.

Guardrail 03

### Circuit breakers and cost caps

Retry logic is not enough. You need a maximum retry count, a circuit breaker that pauses on consecutive failures, and a hard per-run cost budget. An agent that can run indefinitely on a bad input eventually will. Set the boundaries before you deploy.

Guardrail 04

### A second model for output validation

Add a lightweight validation step after each write: a separate, cheaper, smaller model reviews the output against a rubric before it gets committed. Teams with production experience keep landing on this one. As the Digits ML team put it: "Use a different LLM to evaluate responses. Never trust a single model to police itself." It catches schema drift, hallucinations, and out-of-scope writes before they become problems.

## The order you build these in is the whole argument

Every guardrail above is cheap to design and expensive to retrofit. That asymmetry is the case for building them first, and it is not really a case about engineering hours.

Retrofitting a guardrail means the incident already happened. The allowlist gets written after the slugs get rewritten. The confidence field gets added after someone tries to call a person who does not exist. The cost budget gets set after a bill arrives that nobody forecast. It is the same code either way. The difference is that you are now writing it in the middle of a conversation about whether the agent should be running at all.

That is the cost that never shows up in a ticket. An agent that quietly did the wrong thing to production data has spent trust, and trust is what buys the autonomy that makes the agent worth having. A team that got burned once will insist on human review of every write, which is defensible and also the end of most of the value. The guardrails exist to make a useful amount of autonomy defensible.

## The pre-ship checklist

Before you deploy an agent into any production workflow, run through this list:

### Agent Production Readiness Checklist

- Every write tool has an explicit field-level allowlist: the agent cannot write to anything not on the list
- Destructive actions (delete, overwrite existing data) require a separate human-approval or confirmation step
- Output schema includes a `confidence` field and a `source` field for every AI-populated value
- Low-confidence outputs are routed to a review queue, not written as fact
- Retry logic has a hard maximum (no more than 3–5 retries per task)
- Circuit breaker pauses the agent after N consecutive failures and sends an alert
- Per-run cost budget is set, and the agent hard-stops when the budget is hit
- Every tool call and LLM invocation is logged with timestamps and token counts (OpenTelemetry or equivalent)
- A second model or rule-based validator reviews outputs before they're committed
- The agent has been tested on edge cases: empty inputs, malformed data, API timeouts
- An incident response path exists: who gets alerted, how to pause the agent, how to roll back a bad write

This isn't a full security posture. For that, the [OWASP LLM Top 10](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) is worth a full read, particularly around prompt injection (the #1 risk) and insecure output handling. But the checklist above catches the failure modes most likely to bite a team on a first real deployment. For a broader framework covering all four runtime guardrail layers, see our post on [agent guardrails in production](/blog/future-friday-agent-guardrails-production-2026/).

**The uncomfortable truth about AI agents:** the demo environment is not the production environment. The demo uses clean inputs, known edge cases, and a sympathetic reviewer. Production has weird data, users who phrase things oddly, APIs that go down at 2pm on a Tuesday, and a CMS that doesn't quite behave the way the docs say it does. Your guardrails need to be designed for that world, not the demo.

## One more thing: prompt injection is real

The content ops example above never reads untrusted content, which is why prompt injection has not come up yet. Most real agents are not that lucky, so it is worth flagging: **an agent that reads external content and then acts on it is exposed to prompt injection, and that is a live threat**.

Indirect prompt injection, where malicious instructions sit embedded in content the agent reads, has moved from theoretical to documented in the wild. Security researchers hijacked [Perplexity's Comet browser via a malicious calendar invite](https://www.theregister.com/security/2026/03/03/perplexity-comet-browser-hole-was-exploitable-via-cal-invite/4675985) to exfiltrate local files, and separately tricked it into a phishing scam using GAN-trained pages. If the agent reads emails, web pages, CMS records, or any other user-controlled content before taking actions, treat that content as untrusted input.

Practical mitigation: separate the reading step from the action step. Have the agent summarize or extract structured data from external content first, in a sandboxed step with no tool access, then pass only that structured data to the action step. Don't let the agent read a web page and immediately act on whatever it finds there.

## The bottom line

AI agents are useful for operations work. Mechanical, repetitive tasks with a clear success criterion are the shape of work they handle well.

Reliability is the part that doesn't come free. It comes from deciding, before deployment, what the agent is allowed to touch, what it is allowed to assert, and how long it is allowed to keep trying. Those are three design questions, and a demo will never ask you a single one of them.

If you're about to ship your first agent into a production workflow: run the checklist, build the guardrails first, and treat the demo as what it is. A controlled simulation, not evidence of production readiness.

Your future self will thank you.

## Frequently Asked Questions

### What are the most common failure modes when deploying an AI agent into production?

Three account for most of the damage in the first weeks after launch. The agent writes to fields it has technical access to but was never scoped to touch, because a record-level write token grants far more than the task needs. It fills gaps with invented data and writes the guess as fact, because a required field with no null-handling is effectively an instruction to produce a value. And a transient API failure triggers a retry loop with no ceiling, re-running the full pipeline on the same few records until a human notices. None of the three reliably surface in a curated test batch, because a curated batch is built from records that already have the data the agent expects.

### What guardrails fix the most common AI agent production failures?

Field-level write allowlists stop an agent from editing data outside its scope. Instead of a record-level write token, the agent can only call an update function for an explicitly approved list of fields. Structured outputs with confidence and source fields stop invented data from being written as fact, routing low-confidence outputs to a human review queue instead. Circuit breakers, hard retry caps, and per-run cost budgets stop runaway retry loops from running indefinitely and consuming an unplanned amount of API spend.

### What should be on a pre-deployment checklist for shipping an AI agent to production?

At minimum: every write tool needs an explicit field-level allowlist, destructive actions need a human-approval step, outputs need confidence and source fields so low-confidence guesses get routed to review instead of written as fact, and retries need a hard cap paired with a circuit breaker and a per-run cost budget. It's also worth logging every tool call and LLM invocation, testing on edge cases like empty inputs and API timeouts, and having an incident response path before you go live.

### Sources:

- [Digits ML Team — "Agents in Production: Lessons from building AI systems that actually work," MLOps World 2025](https://digits.com/blog/mlops-world-2025-slides/)
- [Prompt Engineering — "Agents At Work: The 2026 Playbook for Building Reliable Agentic Workflows"](https://promptengineering.org/agents-at-work-the-2026-playbook-for-building-reliable-agentic-workflows/)
- [OWASP Gen AI Security Project — LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- [Lakera — "Indirect Prompt Injection: The Hidden Threat Breaking Modern AI Systems"](https://www.lakera.ai/blog/indirect-prompt-injection)
- [Orq.ai — "Mastering LLM Guardrails: Complete 2025 Guide"](https://orq.ai/blog/llm-guardrails)
- [Deloitte Insights — "Agentic AI Strategy," Tech Trends 2026](https://www.deloitte.com/us/en/insights/topics/technology-management/tech-trends/2026/agentic-ai-strategy.html)
- [The Register — "Perplexity Comet browser hole was exploitable via cal invite," March 2026](https://www.theregister.com/security/2026/03/03/perplexity-comet-browser-hole-was-exploitable-via-cal-invite/4675985)

Deploying an AI agent into your ops stack and want to gut-check your guardrails before you go live? That's exactly what we do at Supergood Solutions — [reach out](mailto:hello@supergood.solutions) and let's talk through your setup before production finds the edge cases for you.

Need this in production?

Field-level allowlists, confidence-scored outputs, circuit breakers, cost budgets. These aren't nice-to-haves. They're the difference between an agent you can leave running and one that quietly corrupts your CMS. We design that guardrail layer before an agent ever touches your production data.

[See AI Agent Governance →](https://supergood.solutions/ai-agent-governance/)

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
