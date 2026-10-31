---
title: "Agents That Spawn Agents: Risks and Controls in Recursive Multi-Agent Systems"
description: "Recursive multi-agent systems unlock real power but introduce compounding failure modes. Here's what goes wrong and the concrete controls that keep recursive architectures safe in production."
canonical: https://supergood.solutions/blog/future-friday-recursive-multi-agent-risks-2026/
published: 2026-03-20
last-updated: 2026-03-20
updated: 2026-03-20
---

![Agents That Spawn Agents: Risks and Controls in Recursive Multi-Agent Systems — a set of Russian nesting dolls made of robots opened up revealing more and more robots, the smallest green.](/blog/future-friday-recursive-multi-agent-risks-2026/hero.webp)

Future Friday · Multi-Agent Systems

# Agents That Spawn Agents: Risks and Controls in Recursive Multi-Agent Systems

March 20, 2026 · Ryan Sandoval · 9 min read

Giving an AI agent the ability to spawn other agents unlocks real power — parallelization, context isolation, specialization — but it also introduces a class of failure modes that most teams don't anticipate until something goes wrong in production. A Google DeepMind study from late 2025 found that unstructured multi-agent networks can amplify errors up to **17.2 times** compared to a single-agent baseline. Gartner predicts that **40%+ of agentic AI projects will be canceled by end of 2027** due to runaway costs, unclear value, or missing risk controls. This post lays out the specific risks introduced when agents spawn agents — and the concrete controls that keep recursive architectures from becoming recursive disasters.

## Why Recursive Agent Spawning Is Tempting

The reasoning is sound on its surface: large, complex tasks break a single agent's context window and reasoning budget. Splitting work across specialized sub-agents — each with fresh context, targeted tools, and a narrow mandate — seems like obvious good engineering.

And sometimes it is. Klarna's LangGraph-powered customer service system handled [2.3 million conversations in a single month](https://towardsdatascience.com/the-multi-agent-trap/), dropping resolution time from 11 minutes to under 2 and saving roughly $60 million through late 2025. That's a real win from multi-agent architecture.

The sub-agent spawning pattern is well-documented now. The [Agentic Patterns reference](https://www.agentic-patterns.com/patterns/sub-agent-spawning/) describes the core use cases:

- **Context window management** — offload large file processing to an isolated agent with fresh context
- **Concurrent I/O** — run parallel API calls across multiple sub-agents simultaneously
- **Tool scoping** — give each sub-agent only the tools it needs, reducing blast radius
- **Specialization** — planning agents, research agents, synthesis agents, each tuned for their task

The problem isn't the pattern. The problem is what happens when you add *recursion* — when sub-agents can spawn their own sub-agents, without limits or controls.

## The Five Failure Modes Nobody Talks About

### 1. Error Amplification at Scale

The most cited risk is also the least intuitive. When agents pass outputs to agents, errors don't cancel — they compound.

A [December 2025 Google DeepMind study](https://arxiv.org/abs/2512.08296) (Yubin Kim et al.) tested 180 configurations across 5 agent architectures and 3 LLM families. The finding: **unstructured multi-agent networks amplify errors up to 17.2 times** compared to single-agent baselines. Not 17% worse — seventeen times worse.

The same study found a saturation threshold: coordination gains plateau beyond **4 agents**. Below that number, adding agents to a structured system helps. Above it, coordination overhead consumes the gains.

The [Multi-Agent Systems Failure Taxonomy (MAST)](https://arxiv.org/abs/2503.13657) study analyzed 1,642 execution traces across 7 open-source frameworks. Failure rates ranged from **41% to 86.7%**. The largest single failure category: coordination breakdowns at **36.9%** of all failures.

### 2. Cost Runaway

Subagent workflows consume significantly more tokens than comparable single-agent runs. Each spawned agent starts a new context, processes its own instructions, and returns a response — all billed independently. In a recursive architecture where agents spawn agents that spawn agents, a single user request can fan out into dozens of model calls.

Without a hard **spawn budget** — a maximum number of child agents any parent can create, enforced at the orchestration layer — cost projections become disconnected from reality. One poorly structured task at 2 AM can cost more than a week of normal operations.

Gartner's warning is pointed: [40%+ of agentic AI projects will be canceled by 2027](https://futureagi.substack.com/p/top-5-agentic-ai-frameworks-to-watch) specifically because of escalating costs combined with missing risk controls.

### 3. Blast Radius Expansion

A single agent has a defined blast radius — the scope of damage it can cause if it behaves unexpectedly. When that agent can spawn additional agents, each with potentially broader tool access, the blast radius multiplies.

Sub-agents inherit the trust level and tool permissions of their orchestrators unless you explicitly scope them down. If your orchestrator agent has write access to a production database and spawns a sub-agent to handle a data task, that sub-agent may inherit that write access — even if it only needed read.

The [sub-agent spawning pattern spec](https://www.agentic-patterns.com/patterns/sub-agent-spawning/) is explicit about this: **tool scoping is a security control**, not just a performance optimization. Each sub-agent should receive only the tools required for its specific task.

### 4. Prompt Injection Cascades

In a single-agent system, a prompt injection attack has a bounded impact. In a multi-agent system, one compromised agent can propagate the attack downstream to every agent it coordinates with.

A [January 2026 MDPI survey of prompt injection attacks](https://www.mdpi.com/2078-2489/17/1/54) documented real production incidents including GitHub Copilot's CVE-2025-53773 (RCE). Prompt injection was present in 73% of production LLM deployments assessed during security audits.

In a recursive architecture, the attack surface expands with each layer of spawning. An attacker who can influence the input to an orchestrator can potentially propagate instructions into every sub-agent the orchestrator creates — without ever touching those sub-agents' system prompts directly.

### 5. Recursive Loops and Context Rot

Without depth limits, agents can enter loops: a parent agent spawns a child to handle a task, the child fails, spawns another child to retry, that one fails, and so on. Without a circuit breaker — a maximum spawn depth or iteration count — these loops run until they hit a cost ceiling or time limit.

Context windows fill with error logs. The agent's reasoning becomes dominated by recent failures rather than the original goal. The agent prioritizes recent failures over original instructions, entering a recursive loop of repeated mistakes.

## The Controls That Actually Work

### Enforce a Spawn Depth Limit

The simplest and most important control: set a hard maximum depth for agent spawning. A parent can spawn children; those children cannot spawn grandchildren — or if they can, the limit is 1 additional level. Enforce this at the orchestration layer, not in the prompt.

Recommended defaults:

- Max depth: **2** (orchestrator → worker; no further recursion)
- If recursion is required: max depth **3** with explicit justification

### Set a Spawn Budget Per Request

Before any orchestrator can spawn sub-agents, require it to estimate the number of agents it intends to create and get that estimate checked against a budget. This is analogous to a spend limit in a financial system — not an optimization, but a hard ceiling.

Practical implementation: define a `max_subagents` parameter at the job or request level. If the orchestrator's plan requires more sub-agents than the budget allows, it must find a different approach or escalate to a human — ideally through a defined [interrupt pattern](/blog/tech-tuesday-interrupt-pattern-agent-design-2026/) rather than an ad hoc approval flow.

### Scope Tools Explicitly Per Sub-Agent

Every sub-agent should receive a tool manifest that is the *minimum* required for its task. No write access if the task is read-only. No external network access if the task is internal data processing.

Use declarative configuration (YAML, JSON, or equivalent) to define each sub-agent's allowed tool set. This prevents tool permission inheritance and keeps blast radius contained.

### Require Traceable Task Subjects

Every sub-agent invocation must have a clear, specific task subject. Empty or generic subjects ("handle this", "process the data") make parallel work untraceable and synthesis difficult.

This isn't just a debugging nicety — it's what allows your observability layer to attribute costs, flag anomalies, and reconstruct execution traces when something goes wrong.

### Deploy a Control Plane, Not Just Guardrails in Prompts

Prompt-level guardrails ("only spawn agents when necessary") are insufficient for production recursive systems. You need a **control plane** — a layer between your orchestrator and the infrastructure that enforces spawn limits, tool scopes, and cost budgets regardless of what any individual agent decides.

The control plane handles:

- Spawn approval (is this spawn within budget?)
- Tool authorization (is this agent allowed this tool?)
- Cost attribution (which parent request is this charge associated with?)
- Circuit breaking (has this chain exceeded its retry limit?) — see our post on [retry logic and circuit breakers](/blog/systems-sunday-agent-failure-recovery-2026/) for implementation patterns

Frameworks like **LangGraph**, **CrewAI**, and **AutoGen** each offer different hooks for implementing this layer. LangGraph's graph-based state management makes it well-suited for pipelines with complex branching and parallel fan-out. All three require you to build the control plane logic yourself; the framework provides the hooks, not the enforcement.

### Add Sanitization at Sub-Agent Boundaries

Each hand-off between agents is a potential prompt injection vector. The [arXiv multi-agent defense paper](https://arxiv.org/abs/2509.14285) proposed specialized sanitizer agents in coordinated pipelines to detect and neutralize injection attempts in real-time. The practical minimum: **treat every inter-agent message as untrusted input** and apply output validation before passing it to the next agent in the chain.

## A Practical Decision Framework

Before enabling recursive spawning in your system, answer these questions:

- Do you have a hard spawn depth limit enforced at the infrastructure layer? *If no → don't enable recursion yet*
- Does each sub-agent have an explicit, minimal tool manifest? *If no → scope tools before spawning*
- Is every spawn attributed to a traceable task subject? *If no → fix your logging first*
- Do you have cost attribution and a per-request spawn budget? *If no → set limits before going to production*
- Is inter-agent output sanitized before use? *If no → add a validation layer at the boundary*

If you can't answer yes to all five, your recursive agent architecture is not production-ready — it's a cost and reliability risk waiting to trigger.

## The Klarna Lesson, Revisited

Klarna's success wasn't just about using LangGraph. It was about using **structured topology** — a defined graph of agent relationships with explicit handoffs — rather than an unstructured swarm of agents passing outputs freely.

The Google DeepMind finding is the key: it's *unstructured* multi-agent networks that amplify errors 17x. Structured architectures with clear coordination graphs, depth limits, and scoped tools don't exhibit the same compound failure behavior.

The pattern that works in production isn't "give agents the ability to spawn freely." It's "define a bounded, observable graph of delegation with enforced limits at every transition point."

## Concrete Next Step

If you're running or planning a multi-agent system: audit your current spawn behavior. Count the maximum possible depth from any single request. If you can't answer that question — if the graph is unbounded or unobservable — that's the first thing to fix. Before adding more agents, add the control plane that makes the agents you have observable and bounded.

## FAQ

### What is recursive agent spawning?

Recursive agent spawning is when an AI agent, acting as an orchestrator, creates one or more sub-agents to handle portions of a task — and those sub-agents may in turn create their own sub-agents. The pattern enables parallelization and context isolation but introduces compounding risks if not bounded by explicit controls like depth limits and spawn budgets.

### How many agents can you safely run in a multi-agent system?

Research from a [December 2025 Google DeepMind study](https://arxiv.org/abs/2512.08296) found that coordination gains plateau beyond 4 agents in a single pipeline. Below that threshold, structured multi-agent systems can significantly improve performance; above it, coordination overhead typically consumes the gains. The key variable is topology: structured graphs with defined handoffs outperform unstructured agent networks at any scale.

### What's the biggest risk of letting agents spawn sub-agents?

The three highest-impact risks are: (1) **cost runaway**, because each spawned agent is a separate model call and recursive spawning can fan out exponentially; (2) **error amplification**, where mistakes in early agents cascade into later ones up to 17x worse than a single-agent baseline; and (3) **blast radius expansion**, where sub-agents may inherit tool permissions that exceed what their specific task requires.

### How do I prevent prompt injection attacks in multi-agent systems?

Treat every inter-agent message as untrusted input — apply output validation and sanitization at every agent boundary before passing results downstream. The [arXiv multi-agent defense paper](https://arxiv.org/abs/2509.14285) demonstrated that specialized sanitizer agents in coordinated pipelines can significantly reduce injection propagation. The core principle is the same as SQL parameterization: never allow external data to be treated as instruction.

### What framework should I use for multi-agent systems in 2026?

LangGraph is the strongest choice for workflows with real complexity — cycles, conditional branching, and parallel fan-out — because its graph abstraction makes coordination topology explicit and auditable. CrewAI offers simpler team-based coordination. AutoGen provides the most flexibility for research and experimental patterns. All three require you to build your own control plane logic; the framework provides hooks but not enforcement.

### Why are so many agentic AI projects getting canceled?

Gartner predicts [40%+ of agentic AI projects will be canceled by end of 2027](https://futureagi.substack.com/p/top-5-agentic-ai-frameworks-to-watch) due to escalating costs, unclear business value, and inadequate risk controls. The pattern is consistent: teams add agent capabilities without the corresponding observability and control infrastructure, then discover in production that costs are unpredictable, failure modes are opaque, and the system is difficult to audit or roll back.

### Sources

- [Towards Data Science — "The Multi-Agent Trap" (March 2026)](https://towardsdatascience.com/the-multi-agent-trap/)
- [Agentic Patterns — Sub-Agent Spawning Pattern Reference](https://www.agentic-patterns.com/patterns/sub-agent-spawning/)
- [The New Stack — "Why agentic AI stalls in production — and how a control plane fixes it" (March 2026)](https://thenewstack.io/agentic-ai-control-plane-production/)
- [arXiv — "A Multi-Agent LLM Defense Pipeline Against Prompt Injection Attacks" (Dec 2025)](https://arxiv.org/abs/2509.14285)
- [Guardrails.md — Safety Protocol for Autonomous Agents (Jan 2026)](https://guardrails.md/)
- [Frontegg — "AI Agent Governance Starts with Guardrails" (Dec 2025)](https://frontegg.com/blog/ai-agent-governance-starts-with-guardrails)
- [FutureAGI Substack — "Top 5 Agentic AI Frameworks to Watch in 2026"](https://futureagi.substack.com/p/top-5-agentic-ai-frameworks-to-watch)

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
