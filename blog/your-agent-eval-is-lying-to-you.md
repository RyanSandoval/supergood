---
title: "Your Agent Eval Is Lying to You"
description: "Enterprise teams evaluating tool-calling agents obsess over task completion rates — and miss the three metrics that actually predict production failure. An agen"
canonical: https://supergood.solutions/blog/your-agent-eval-is-lying-to-you/
published: 2026-05-11
last-updated: 2026-10-29
---

![Your Agent Eval Is Lying to You — a vintage lie detector clipped to a blank scorecard clipboard, drawing a wild green trace.](/blog/your-agent-eval-is-lying-to-you/hero.webp)

Metrics Monday

# Your Agent Eval Is Lying to You

Published May 11, 2026 — 6 min read

**TL;DR:** Enterprise teams evaluating tool-calling agents obsess over task completion rates — and miss the three metrics that actually predict production failure. An agent that passes your benchmark at 82% accuracy can hemorrhage 4x more API cost than a "worse" alternative, hit latency cliffs at p99, and fail on exactly the cases that matter most to users. The fix is not a better benchmark. It's a different set of questions.

## Key Insight

**The benchmark metric is not the production metric.**

Here's the uncomfortable data: a 2025 arxiv analysis of enterprise agentic systems found agent performance dropping from 60% on single-run benchmarks to 25% when measured across 8 consistency runs. That is not a different agent — it is the same agent, measured more honestly.

The CLEAR framework (Cost, Latency, Efficacy, Assurance, Reliability) names what enterprise teams actually need to optimize against. Most eval harnesses instrument only "Efficacy" — task completion — and treat the other four as someone else's problem. That works fine in a research environment. In production it fails visibly and expensively.

Tool-calling agents add another layer. The agent can fail in two distinct ways that a simple pass/fail eval collapses into one:

1. **Wrong tool selected** — the agent called the right category of action with the wrong function
2. **Right tool, wrong execution** — the agent selected correctly but params were malformed or the call sequence was off

These failure modes have different root causes and completely different fixes. If your harness does not separate them, you are debugging blind.

## Why Teams Miss This

Because task completion is easy to label and hard to argue with.

"The agent completed 78% of test cases" is a clean number. It fits in a slide deck. It satisfies stakeholders. It maps to the benchmarks the model providers publish.

The problem is that benchmark task completion is measured under ideal conditions: clean inputs, fresh context, no concurrency, no cost pressure. Production is the opposite.

Three things that do not show up in standard agent benchmarks but routinely cause production failures:

1. **Tool selection under ambiguous input**: When a query could route to two different tools, which one does the agent pick? How consistent is that choice across paraphrases of the same question?
2. **Cost-per-correct-outcome**: Research shows that optimizing for accuracy alone yields agents 4–10x more expensive than cost-aware alternatives with comparable task completion. That delta kills ROI before the agent gets past pilot.
3. **p99 latency**: Median latency looks fine; p99 is where SLAs break. Parallel tool execution patterns cut latency significantly in multi-step workflows — but only if your harness can detect when the agent is making sequential calls that should be parallel.

## How to Actually Do It

Build your eval harness around four questions, not one.

### 1. Tool Selection Accuracy

Ground-truth label each test case with the expected tool or tool sequence. Track whether the agent selected the right tool, called it in the right order, and what it chose when input was ambiguous.

expected\_tool = "search\_documents"

actual\_tool = trace.tool\_calls[0].name

tool\_correct = actual\_tool == expected\_tool

tool\_precision = sum(tool\_correct) / len(test\_cases)

### 2. Cost Per Correct Outcome

Do not report "cost" in isolation. Report cost *conditional on correctness*. An expensive agent that is always right may cost less over time than a cheap agent that is right 60% of the time once you factor in retry cost and human correction downstream.

cost\_correct = total\_cost / correct\_completions

cost\_all = total\_cost / total\_runs

### 3. Failure Mode Taxonomy

Tag each failure: wrong tool, right tool with wrong params, right tool and params but wrong reasoning, timeout or infinite loop. A distribution that is 80% "wrong reasoning" points to a prompting problem. An 80% "timeout" distribution points to a tool budget problem. Same overall pass rate — entirely different root causes and fixes.

### 4. Operating Envelope Gates

Define hard limits: max steps, max tool calls, token budget, wall-clock timeout. Fail the run if any limit is exceeded — even if the output was correct. An agent that gets the right answer in 45 tool calls is not a production agent; it is a liability.

Tools like [Braintrust](https://www.braintrust.dev/) and Anthropic's eval infrastructure surface trace-level data that enables this analysis. The gap is not tooling — it is that teams do not define the eval contract before they start building.

## What We've Learned

Run this audit on your current eval harness before the next sprint:

1. Pull the last 50 failure cases. Can you classify them by failure mode — tool selection vs. execution vs. reasoning?
2. Calculate cost-per-correct-outcome, not just total cost. Is it higher or lower than you assumed?
3. Find your p99 latency in production traces. If it is more than 3x your p50, you have a sequential tool-call problem worth fixing.

If you cannot answer these three questions from your current telemetry, you do not have an eval problem — you have an observability problem. Fix the instrumentation first; the harness comes second.

The output of a well-designed eval harness is not a score. It is a failure mode map. Build the map, then fix the most expensive failure mode first. That is the entire job.

## FAQ

**What metrics matter most for evaluating tool-calling agents?**

Tool selection accuracy, cost-per-correct-outcome, failure mode distribution, and p99 latency are the four metrics that predict production reliability. Task completion rate alone is insufficient because it collapses distinct failure modes into a single number, making root-cause analysis nearly impossible.

**What is the CLEAR framework for AI agent evaluation?**

CLEAR stands for Cost, Latency, Efficacy, Assurance, and Reliability — a multi-objective evaluation framework designed for enterprise AI deployment. It recognizes that optimizing for accuracy alone ignores the cost and latency constraints that determine whether an agent is viable at scale.

**How do you measure tool selection accuracy in a tool-calling agent?**

Ground-truth label each test case with the expected tool or tool sequence. During eval runs, compare the agent's actual tool calls against the expected calls. Track both tool identity (was the right function called?) and call order (was the sequence correct?).

**Why do agent pass rates drop when you run them multiple times?**

Consistency is a separate property from correctness. An agent might solve a task correctly 60% of the time in single-run tests but only 25% of the time across 8 runs on the same input. This drop reveals sensitivity to context window state, temperature variance, and tool-call ordering — none of which appear in a single-shot benchmark.

**What is an operating envelope in agent evaluation?**

An operating envelope defines the maximum acceptable resource usage for a successful run: max steps, max tool calls, token budget, wall-clock timeout. A run that exceeds these limits fails the eval even if the output is correct, because an agent that uses 45 tool calls to answer a 3-call question is not deployable.

**How do I know if I have an observability problem vs. an eval problem?**

If you cannot classify your failure cases by failure mode, you have an observability problem first. You need trace-level data — every tool call, every intermediate reasoning step — before you can design a meaningful eval harness. Start with instrumentation; evals follow from that.

## Sources

- [Beyond Accuracy: A Multi-Dimensional Framework for Evaluating Enterprise Agentic AI Systems](https://arxiv.org/html/2511.14136v1) — arxiv 2025
- [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) — Anthropic Engineering
- [AI agent evaluation: A practical framework for testing multi-step agents](https://www.braintrust.dev/articles/ai-agent-evaluation-framework) — Braintrust
- [Agent Evaluation Framework 2026: Metrics, Rubrics & Benchmarks](https://galileo.ai/blog/agent-evaluation-framework-metrics-rubrics-benchmarks) — Galileo AI
- [AI Benchmarks 2026: Top Evaluations and Their Limits](https://kili-technology.com/blog/ai-benchmarks-guide-the-top-evaluations-in-2026-and-why-theyre-not-enough) — Kili Technology

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
