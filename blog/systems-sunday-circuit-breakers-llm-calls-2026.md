---
title: "Systems Sunday: Circuit Breakers for LLM Calls — Stop Cascading Failures Before They Start"
description: "Retrying a failing LLM call into oblivion isn't resilience — it's how one provider outage takes down your whole agent."
canonical: https://supergood.solutions/blog/systems-sunday-circuit-breakers-llm-calls-2026/
published: 2026-03-29
last-updated: 2026-03-29
updated: 2026-03-29
---

![Systems Sunday: Circuit Breakers for LLM Calls — Stop Cascading Failures Before They Start — a household circuit breaker panel with one green switch flipped off stopping sparks.](/blog/systems-sunday-circuit-breakers-llm-calls-2026/hero.webp)

Systems Sunday

# Systems Sunday: Circuit Breakers for LLM Calls — Stop Cascading Failures Before They Start

Published March 29, 2026 — 7 min read

**TL;DR:** Retrying a failing LLM call into oblivion isn't resilience — it's how one provider outage takes down your whole agent. Circuit breakers give your system a way to fail fast, route around problems, and recover safely. Here's how to wire them in.

## The Problem: Retries Make Bad Outages Worse

When an LLM provider goes down, the natural instinct is to retry. But naive retry logic under a real outage does three bad things: it saturates your request queue, it burns rate-limit budget on calls that will fail anyway, and it causes cascading timeouts downstream.

Infrastructure failures account for roughly 16% of multi-agent system failures — and they produce the most visible outages (FutureAGI, 2026). The culprit is usually not the outage itself, but the retry storm that follows it.

A circuit breaker solves this by short-circuiting failed calls instead of hammering a downed service.

## How a Circuit Breaker Works (the 60-second version)

The pattern has three states:

- **Closed** — normal operation, requests flow through, failures are counted
- **Open** — failure threshold exceeded; all requests are blocked immediately (no calls made)
- **Half-Open** — after a timeout, a probe request tests if the service recovered; success closes the circuit, failure keeps it open

For LLM calls, "failure" means: 5xx errors, provider-reported rate limit exhaustion (429), or timeouts exceeding your SLO. A reasonable starting config: open after 5 failures in a 60-second window, test recovery after 30 seconds, require 3 successful probes to close.

The key insight: **the circuit breaker's job is to fail fast, not to succeed eventually.** That's what retries are for.

## Retries, Fallbacks, and Circuit Breakers Are Not the Same Thing

These three patterns layer on top of each other and are often conflated:

| Pattern | When to use | What it does |
| --- | --- | --- |
| **Retry** | Transient errors (network blip, single timeout) | Re-sends the same request after backoff |
| **Fallback** | Provider unavailable or too slow | Routes to a secondary model/provider |
| **Circuit breaker** | Sustained failure or degradation | Stops sending until the service recovers |

In practice: retry first (with exponential backoff), then fall back to an alternate provider, and let the circuit breaker gate whether you even try the primary. Retries without a circuit breaker are just a denial-of-service attack against a struggling provider.

## Per-Provider Circuits, Not Global Ones

A common mistake is implementing a single circuit breaker across all LLM calls. If you're routing between OpenAI, Anthropic, and a self-hosted model like Ollama, each should have its own circuit — otherwise one provider's bad day opens the circuit for everything.

Tools like [LiteLLM](https://docs.litellm.ai/docs/completion/reliable_completions) handle per-provider fallback routing natively. [Portkey](https://portkey.ai/blog/retries-fallbacks-and-circuit-breakers-in-llm-apps/) and Bifrost add circuit-breaker state with real-time health monitoring across the provider fleet. If you're rolling your own, the `go-circuitbreaker` library (Go) or `pybreaker` (Python) are solid starting points.

One important caveat from production experience: **your circuit breaker's state store needs a fallback too.** If you're tracking failure counts in Redis and Redis goes down, your circuit logic shouldn't silently fail closed (letting requests through) or fail open (blocking everything). Default to closed with local in-memory state.

## What to Instrument

A circuit breaker you can't observe is just a black box that occasionally breaks things:

- `llm_circuit_breaker_state` (gauge) — current state per provider: 0=closed, 1=half-open, 2=open
- `llm_requests_total` with `status` label — track the ratio of blocked vs. passed requests
- `llm_circuit_opens_total` (counter) — alerts when circuits trip more than expected
- Alert threshold: more than 2 circuit opens per provider per hour warrants investigation

The Google Cloud SRE guide for LLM apps recommends treating circuit state as a first-class signal alongside latency and error rate — not an afterthought.

## FAQ

### What's the difference between a circuit breaker and a timeout?

A timeout limits how long a single call waits. A circuit breaker tracks failure patterns across many calls and stops new requests from going out at all when a threshold is crossed. You need both.

### Should I use a circuit breaker for all LLM calls or only critical paths?

Start with your highest-traffic or most latency-sensitive paths. Background/async agents can tolerate longer retry queues; real-time user-facing agents need fast fail behavior to protect UX.

### What failure threshold should I use to open the circuit?

A common starting point: 5 failures in a 60-second window. Tune down if you have a high-volume system where 5 failures happen routinely; tune up if you have low-traffic agents where 5 failures might just be noise.

### What happens to in-flight agent tasks when a circuit opens?

This depends on your architecture. Async agents should queue or checkpoint the task. Synchronous agents should return a graceful error immediately. Never silently drop work — log the blocked request and expose it in your runbook.

### Sources

- [Retries, Fallbacks, and Circuit Breakers in LLM Apps: A Production Guide — Maxim, Feb 2026](https://www.getmaxim.ai/articles/retries-fallbacks-and-circuit-breakers-in-llm-apps-a-production-guide/)
- [Retries, fallbacks, and circuit breakers in LLM apps: what to use when — Portkey, Jan 2026](https://portkey.ai/blog/retries-fallbacks-and-circuit-breakers-in-llm-apps/)
- [Claude API Circuit Breaker Enterprise Pattern Guide — SitePoint, Mar 2026](https://www.sitepoint.com/claude-api-circuit-breaker-pattern/)
- [Implementing Circuit Breakers for LLM Services in Go — dasroot.net, Feb 2026](https://dasroot.net/posts/2026/02/implementing-circuit-breakers-for-llm-services-in-go/)
- [Why do multi-agent LLM systems fail — FutureAGI, Mar 2026](https://futureagi.substack.com/p/why-do-multi-agent-llm-systems-fail)
- [Building Bulletproof LLM Applications: SRE Best Practices — Google Cloud / Medium, Oct 2025](https://medium.com/google-cloud/building-bulletproof-llm-applications-a-guide-to-applying-sre-best-practices-1564b72fd22e)
- [Circuit breaker for LLM provider failure — DEV Community, Mar 2026](https://dev.to/sandhu93/circuit-breaker-for-llm-provider-failure-53f6)
- [LiteLLM Reliability Docs](https://docs.litellm.ai/docs/completion/reliable_completions)

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
