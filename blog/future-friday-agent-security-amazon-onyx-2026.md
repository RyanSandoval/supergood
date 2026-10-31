---
title: "How to Test AI Agents Before They Break in Production"
description: "A layered evaluation strategy for AI agents combining trajectory metrics, outcome metrics, continuous red teaming, and CI/CD pipelines to catch failures before users do."
canonical: https://supergood.solutions/blog/future-friday-agent-security-amazon-onyx-2026/
published: 2026-03-13
last-updated: 2026-03-13
updated: 2026-03-13
---

![How to Test AI Agents Before They Break in Production: Eval Frameworks, Red Teaming, and CI/CD Patterns That Actually Work — a crash-test dummy style toy robot strapped into a test sled about to hit a wall, green test marker.](/blog/future-friday-agent-security-amazon-onyx-2026/hero.webp)

AI Agent Ops

# How to Test AI Agents Before They Break in Production: Eval Frameworks, Red Teaming, and CI/CD Patterns That Actually Work

Published March 13, 2026 — 11 min read

**TL;DR:** Most AI agents ship with zero structured testing — and the ones that do often measure the wrong things. According to LangChain's 2026 State of AI Agents report, 57% of organizations now have agents in production, but quality remains the top barrier to deployment for 32% of them. The fix isn't more unit tests — it's a layered evaluation strategy that combines trajectory metrics, outcome metrics, continuous red teaming, and eval-in-CI/CD pipelines.

## The Problem: "It Works on My Prompt" Is the New "It Works on My Machine"

Traditional software has a well-understood testing stack: unit tests, integration tests, staging environments, canary deploys. AI agents have... vibes.

An agent can pass every static benchmark and still break catastrophically in production because its behavior is non-deterministic. Identical inputs can produce different execution paths. Multi-turn interactions create cascading errors that compound across steps. And the failure modes are subtle — an agent that "completes" a task by hallucinating a tool response looks identical to one that actually succeeded, unless you're inspecting the full execution trace.

Gartner projects that [over 40% of agentic AI projects will be canceled by end of 2027](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027), and evaluation gaps are a leading cause. Amazon's internal analysis of thousands of agents built across the company found that traditional LLM benchmarks completely miss the emergent behaviors of complete agentic systems: tool selection accuracy, multi-step reasoning coherence, memory retrieval efficiency, and end-to-end task completion rates.

The industry needs a testing discipline that matches the complexity of what we're shipping.

## Two Types of Metrics You Need (and Most Teams Only Have One)

The biggest conceptual shift in agent evaluation is the split between **trajectory metrics** and **outcome metrics**. Most teams only measure outcomes ("did the agent finish the task?"). That's necessary but nowhere near sufficient.

### Outcome Metrics: The Scoreboard

These measure what the agent produced:

- **Task success rate** — Did it resolve the customer dispute? Generate a valid SQL query? Book the right flight?
- **Response quality** — Accuracy, relevance, completeness of the final output
- **Latency and cost** — How long did it take, and how many tokens did it burn?

Outcome metrics tell you *if* your agent works. They don't tell you *why it failed* when it doesn't.

### Trajectory Metrics: The Game Film

These evaluate the complete execution path — every reasoning step, tool call, and decision:

- **Trajectory exact match** — Did the agent follow the expected sequence of steps?
- **Trajectory precision** — Of the steps the agent took, how many were correct?
- **Trajectory recall** — Of the steps it should have taken, how many did it actually take?
- **Tool selection accuracy** — Did the agent pick the right tool for each step?
- **Reasoning coherence** — Does the chain-of-thought hold up under inspection?

Google Cloud's Vertex AI and Amazon Bedrock AgentCore Evaluations both define production-ready trajectory metrics along these lines. The insight from Amazon's engineering teams is that trajectory metrics expose the *root cause* of failures — not just detect them.

A practical example: an agent achieves 60% success on single runs but drops to 25% across eight runs. Outcome metrics show declining performance. Trajectory metrics show *where* the reasoning chain breaks — maybe tool selection degrades after the fourth turn, or memory retrieval starts returning stale context.

## Building Eval Rubrics That Scale

Pass/fail doesn't cut it for agents that research, synthesize, verify, and generate across multiple steps. Galileo's [agent evaluation framework](https://galileo.ai/blog/agent-evaluation-framework-metrics-rubrics-benchmarks) recommends a three-tier rubric structure:

1. **Primary dimensions** (7) — Comprehensiveness, accuracy, coherence, efficiency, safety, tool usage, reasoning quality
2. **Sub-dimensions** (25) — Granular breakdowns like "handles documented edge cases" or "meets latency constraints"
3. **Fine-grained rubric items** (130) — Operationalized, measurable criteria that map to specific test assertions

The key is making rubrics *executable* — not just documentation, but specifications that automated evaluators can score against. This is where LLM-as-judge comes in.

### LLM-as-Judge: Useful but Not a Silver Bullet

Using a language model to evaluate another language model's output is now standard practice. The target benchmark: **0.80+ Spearman correlation** with human judgment. Platforms like Galileo, Arize Phoenix, and Langfuse all support LLM-as-judge workflows.

The catch: LLM judges have their own biases. They tend to favor verbose responses, struggle with domain-specific correctness, and can be gamed by confident-sounding wrong answers. The fix is pairing automated judges with **human validation on a sample** — not replacing human review, but making it targeted and efficient.

## The Eval Tooling Landscape (Vendor-Neutral)

The agent evaluation space is consolidating fast. Here's what the current landscape looks like:

### Open-Source Foundations

- [**Arize Phoenix**](https://arize.com/ai-agents/agent-evaluation/) — Trace-based observability with agent-specific metrics. Good for teams that want to own their eval infra.
- [**Langfuse**](https://langfuse.com/) — Open-source tracing and evaluation. Framework-agnostic, strong community.
- [**DeepEval**](https://github.com/confident-ai/deepeval) — Pytest-style testing for LLM outputs. Lowest friction for engineering teams already using Python test suites.
- [**MLflow**](https://mlflow.org/) — Now supports LLM-as-judge scoring, evaluation datasets, and quality gates for agent deployments.

### Commercial Platforms

- [**Galileo**](https://galileo.ai/) — Recently open-sourced Agent Control under Apache 2.0. Strong on rubric-based evaluation and CI/CD integration.
- [**Maxim AI**](https://www.getmaxim.ai/) — End-to-end simulation and evaluation. Focus on agent reliability through synthetic test generation.
- [**Patronus AI**](https://www.patronus.ai/) — Specialized in automated evaluation with 50+ built-in metrics, including agent-specific DAG scoring.

### The Amazon Approach

Amazon's [internal framework](https://aws.amazon.com/blogs/machine-learning/evaluating-ai-agents-real-world-lessons-from-building-agentic-systems-at-amazon/) — now partially available through Bedrock AgentCore Evaluations — uses a two-component architecture: a generic evaluation workflow that standardizes assessment across different agent implementations, and an evaluation library providing systematic metrics. The key insight: they built it to be **framework-agnostic**, recognizing that teams use different agent frameworks and shouldn't be locked into one vendor's eval approach.

## Continuous Red Teaming: Testing Agents Like an Adversary

Static eval suites catch known failure modes. Red teaming catches the ones you didn't think of.

Startups like Virtue AI and Mindgard are building automated red teaming platforms that test dynamic agent behavior across multi-step reasoning chains and tool interactions — not just single-turn prompt injection.

Palo Alto Networks' [Prisma AIRS AI Red Teaming](https://www.paloaltonetworks.com/blog/network-security/beyond-jailbreaks-why-agentic-ai-needs-contextual-red-teaming/) found that the most financially consequential attacks on agentic systems used contextual manipulation rather than brute-force jailbreaks. This means your red teaming needs to go beyond the OWASP LLM Top 10 checklist and test for **business-logic exploits** specific to your agent's domain and tool access.

A practical red teaming loop:

1. **Automated scanning** — Run adversarial prompt suites against the agent on every deployment
2. **Behavioral probing** — Test what happens when tools return unexpected errors, APIs timeout, or user inputs are adversarial
3. **Escalation testing** — Verify that the agent hands off to humans when it should, doesn't leak data across sessions, and respects permission boundaries
4. **Regression locking** — When you find a vulnerability, add it to the eval suite so it never ships again

## Putting Eval in Your CI/CD Pipeline

The most mature teams treat agent evaluation like they treat software tests: nothing ships without passing the eval suite. Three trigger types:

### 1. Commit-Triggered Evals

Every prompt change, tool configuration update, or model swap triggers a baseline eval suite. This catches regressions before they reach staging. Think of it like the lint check of agent development — fast, cheap, blocking.

### 2. Scheduled Evals

Run comprehensive evaluation suites on a schedule (daily or weekly) against production traffic samples. This catches **model drift** — the slow degradation that happens as underlying models get updated, data distributions shift, or user behavior changes.

### 3. Event-Driven Evals

Triggered by anomalies: error rate spikes, latency jumps, user feedback signals. These are your fire alarms.

### Progressive Canary Deployment

Don't ship agent updates to 100% of traffic at once. Route 5% of requests to the new version, run trajectory and outcome metrics against both versions, and only promote if the new version meets quality gates. The MLflow ecosystem supports this pattern with built-in quality gates: pre-deploy checks → canary release → continuous evaluation → drift detection.

## The Uncomfortable Truth: You Need Humans in the Loop

Automated eval gets you 80% of the way there. The last 20% requires humans — especially for:

- **Domain-specific correctness** — Does the legal agent's contract clause actually hold up?
- **Rubric calibration** — Your LLM-as-judge needs periodic recalibration against human preferences to prevent score drift
- **Novel failure modes** — Automated systems catch known patterns. Humans catch the "that's technically correct but wildly inappropriate" edge cases.

Amazon's framework explicitly incorporates human-in-the-loop processes to audit evaluation results and build golden testing datasets. The key is making human review *targeted* — use automated eval to filter and prioritize, then route the ambiguous cases to human reviewers.

## What to Do Next

If you're running agents in production (or about to), here's the minimum viable eval stack:

1. **Instrument traces** — If you can't see the full execution path, you can't evaluate it. Pick a tracing tool and instrument everything.
2. **Define trajectory + outcome metrics** — Don't just measure completion. Measure the path.
3. **Build a regression suite** — Every production failure becomes a test case.
4. **Add eval to CI/CD** — Commit-triggered for fast feedback, scheduled for drift detection.
5. **Red team before launch** — And continuously after.
6. **Sample for human review** — Pick 5–10% of edge cases weekly for domain expert validation.

## Frequently Asked Questions

### How is AI agent evaluation different from standard LLM evaluation?

Standard LLM evaluation tests model outputs in isolation. Agent evaluation tests the entire system: multi-step reasoning, tool selection and execution, memory retrieval, error recovery, and end-to-end task completion. The key difference is that agents have *trajectories* (sequences of actions), not just outputs, and those trajectories need independent evaluation to diagnose failures.

### What are the most important metrics for evaluating AI agents in production?

You need both trajectory metrics and outcome metrics. Trajectory metrics include tool selection accuracy, reasoning coherence, trajectory precision/recall, and error recovery rate. Outcome metrics include task success rate, response quality, latency, and cost per completion.

### Can I use an LLM to evaluate another LLM's agent behavior?

Yes — LLM-as-judge is now standard practice. The benchmark to aim for is 0.80+ Spearman correlation with human judgment. The main caveats: LLM judges tend to favor verbose outputs, struggle with domain-specific correctness, and need periodic recalibration.

### What is continuous red teaming for AI agents?

Continuous red teaming means running adversarial tests against your agent on an ongoing basis — not just once before launch. This includes automated prompt injection scanning, behavioral probing, and business-logic exploit testing specific to your agent's domain and tool access.

### How do I integrate agent evaluation into a CI/CD pipeline?

Use three trigger types: commit-triggered evals (fast baseline checks on every prompt or config change), scheduled evals (comprehensive suites run daily/weekly), and event-driven evals (triggered by anomalies). Pair with progressive canary deployment — route a small percentage of traffic to new versions and promote only if quality gates pass.

### What's the minimum eval setup for a small team shipping AI agents?

Start with three things: (1) instrument full execution traces using an open-source tool like Langfuse or Arize Phoenix, (2) build a regression test suite from every production failure, and (3) add commit-triggered eval checks to your deployment pipeline. The most important thing is having *any* structured evaluation — most teams currently have none.

Need this in production?

Trajectory metrics, LLM-as-judge calibration, red-teaming, and CI/CD eval gates are exactly the kind of testing infrastructure we build into agents before they ship, not after the first bad release.

[See AI Agent Consulting →](https://supergood.solutions/ai-agent-consulting/)

### Sources

- [LangChain 2026 State of AI Agents Report](https://www.getmaxim.ai/articles/top-5-platforms-to-simulate-ai-agents-to-ensure-production-reliability-in-2026/) (cited via Maxim AI)
- [Amazon — Evaluating AI Agents: Real-World Lessons from Building Agentic Systems](https://aws.amazon.com/blogs/machine-learning/evaluating-ai-agents-real-world-lessons-from-building-agentic-systems-at-amazon/)
- [Galileo — Agent Evaluation Framework: Metrics, Rubrics & Benchmarks](https://galileo.ai/blog/agent-evaluation-framework-metrics-rubrics-benchmarks)
- [CB Insights — 5 AI Agent Predictions for 2026](https://www.cbinsights.com/research/ai-agent-predictions-2026/)
- [Gartner — Over 40% of Agentic AI Projects Will Be Canceled by End of 2027](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027)
- [Help Net Security — AI Went from Assistant to Autonomous Actor and Security Never Caught Up](https://www.helpnetsecurity.com/2026/03/03/enterprise-ai-agent-security-2026/)
- [Palo Alto Networks — Beyond Jailbreaks: Why Agentic AI Needs Contextual Red Teaming](https://www.paloaltonetworks.com/blog/network-security/beyond-jailbreaks-why-agentic-ai-needs-contextual-red-teaming/)
- [Arize — Agent Evaluation](https://arize.com/ai-agents/agent-evaluation/)
- [MASEval: Extending Multi-Agent Evaluation from Models to Systems (arXiv)](https://arxiv.org/html/2603.08835)

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
