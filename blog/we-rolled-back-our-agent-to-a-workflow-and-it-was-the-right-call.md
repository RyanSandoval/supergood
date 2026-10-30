---
title: "When a Workflow Beats an Agent"
description: "An agent decides its own control flow. A workflow has control flow you wrote, with LLM calls at specific steps. Most enterprise tasks want the second one."
canonical: https://supergood.solutions/blog/we-rolled-back-our-agent-to-a-workflow-and-it-was-the-right-call/
published: 2026-04-23
last-updated: 2026-10-29
---

![When a Workflow Beats an Agent — a toy train running neatly on green rails while a wandering robot has tipped into a ditch.](/blog/we-rolled-back-our-agent-to-a-workflow-and-it-was-the-right-call/hero.webp)

Analysis

# When a Workflow Beats an Agent

Published April 23, 2026 — 6 min read

**TL;DR:** An agent decides its own control flow. A workflow has control flow you wrote, with LLM calls at specific steps. A lot of what ships as "agentic" is the second thing wearing the costume of the first, and swapping it back for a deterministic pipeline with one narrow LLM call is a legitimate design move rather than an admission of failure. "Agentic" is a choice, not a default.

## Key Insight

The industry pushed "agents" as the next default architecture the moment tool-use matured. That framing collapsed a useful distinction: an **agent** decides its own control flow; a **workflow** has control flow you wrote, with LLM calls at specific steps. Anthropic's own 2024 essay on "Building effective agents" makes this explicit. Most production value lives in workflows, not agents, and an agent is the right reach only when the task needs dynamic planning.

The contrarian take: **rolling back from an agent to a workflow is a promotion, not a regression.** It means you now understand the task well enough to encode its structure. That's a win. Teams resist the rollback because it feels like admitting the agent "failed." An agent that taught you the shape of your problem did its job.

## Why Teams Miss This

Three patterns recur.

1. **"Agent" became a status symbol.** Leadership funds "agent" projects, not "workflow with two LLM calls" projects. So teams paper over a deterministic pipeline with a ReAct loop, pay a token tax for the reasoning trace, and call it an agent. Then it buckles in production because the task never needed dynamic planning.

2. **Eval sets hide the decision problem.** Evals measure output quality on a fixed task distribution. They don't measure the question that decides the architecture: *does the LLM actually need to pick the order of operations here?* On most enterprise tasks the order is stable. You're paying an LLM to re-derive it every run.

3. **Rollback feels like retreat.** Engineers who shipped the agent are the ones being asked to delete it. That's politically awkward. Leadership doesn't help when the quarterly OKR says "ship agentic workflows." The fix is naming the pattern out loud: *"The agent ran in shadow mode, it taught the team the task shape, now it gets hardened into a workflow."*

## How to Actually Do It

A decision framework that fits the rollback:

**Step 1: Log the agent's decision trace in production.** Every tool call, every order, every branch. Don't change behavior, just capture the DAG the agent executed on each run. Give it long enough to cover a full traffic cycle, including whatever your weekly and month-end spikes look like.

**Step 2: Cluster the traces.** Pick the threshold before you look at the data, so the answer isn't retrofitted to the one you want. A reasonable line: if most runs follow one of a handful of distinct paths, you have a workflow. If one-off paths are a large, stable share of traffic, you have an agent problem. Keep the agent.

**Step 3: Encode the top paths as deterministic workflow steps.** Python, a state machine, a DAG framework (Temporal, Prefect, LangGraph in workflow mode), whatever fits. Keep LLM calls at the *ambiguous* steps only: classification, extraction, generation. Everything else is code.

result = agent.run(user\_request, tools=[search, fetch, summarize, email])

intent = classify(user\_request) # 1 LLM call, structured output

docs = search(intent.query) # deterministic

filtered = [d for d in docs if d.score > 0.7]

summary = summarize(filtered) # 1 LLM call

if intent.requires\_email:

send\_email(summary, intent.recipient) # deterministic, audited

The split is obvious once you write it down. Retries, pagination, rate limits, schema validation, idempotency keys, audit logging: none of it improves by having a language model decide whether to do it.

**Step 4: Keep the agent alive in shadow mode on the long tail.** The oddball requests that don't match the top paths still route to the agent. You now run two systems: a cheap, predictable workflow handling the bulk of traffic, and an agent as a fallback. Over time, new clusters in the long tail can be promoted into the workflow.

**Step 5: Measure the rollback honestly.** Track p50/p95 latency, cost per 1K requests, and the on-call page rate, and record the baselines before you touch anything. Publish whatever the numbers say, including the unglamorous outcome where they barely move. Even then the rollback usually pays for itself in observability, because a named workflow step with typed inputs is easier to debug than an agent's reasoning chain.

## When Not to Roll Back

The argument cuts both ways. Some tasks really are agent-shaped, and hardening them into a workflow trades flexibility for a pipeline that breaks the first week requirements move.

Keep the agent when the input space is open-ended and you cannot enumerate the tool combinations in advance. Keep it when the task is exploratory by nature, like research or triage across systems you don't control. Keep it when the cost of a wrong path is low and the cost of a missed path is high. And keep it when the traces refuse to cluster, because a workflow built on top of an unstable path distribution is just an agent with worse error handling.

The tell is not complexity. It's variance. A task can be extremely complicated and still run the same seven steps every time, which makes it a workflow.

## What This Changes

The "agent vs workflow" choice isn't a one-time decision; it's a dial you adjust as you learn the task. Ship an agent when you don't yet know the control flow. Roll it back to a workflow once the traces stabilize. Be willing to re-promote to an agent if requirements shift. Most teams miss the middle step.

The uncomfortable observation: a lot of what's marketed as "agentic AI" in 2026 is a workflow wearing a ReAct costume. That's fine as a prototype. It's expensive and flaky as a production system.

**Next experiment:** Pick one "agent" shipped in the last six months. Pull its tool-call traces. Plot path frequency as a histogram. If a small number of paths cover most of the runs, you have a rollback candidate, and the clustering exercise alone will tell you more about the task than another round of eval tuning.

## Sources

- [Anthropic — Building Effective Agents (Dec 2024)](https://www.anthropic.com/research/building-effective-agents)
- [LangGraph — Workflows vs Agents Documentation](https://langchain-ai.github.io/langgraph/concepts/high_level/)
- [Temporal — Durable Workflows for AI](https://temporal.io/blog/ai-workflows-with-temporal)
- [Google — Agent Development Kit: Workflow Agents](https://google.github.io/adk-docs/agents/workflow-agents/)
- [DeepLearning.AI — Agentic Design Patterns (Andrew Ng)](https://www.deeplearning.ai/the-batch/issue-241/)

---

## FAQ

**Q: Isn't rolling back to a workflow just "not using AI"?**

A: No. The LLM is still doing the work it's best at (classification, extraction, generation). You're removing the LLM from *control flow*, which is the expensive, unreliable part. The AI still runs; it just stops re-deciding what to run next on every request.

**Q: How do I know if my task actually needs agentic control flow?**

A: Log traces and cluster them. If a handful of paths cover most runs, you have a workflow. If runs look different every time, with novel tool combinations and unpredictable branching, keep the agent. "Feels complex" is not the same as "is dynamically structured."

**Q: Won't a workflow lose the agent's ability to handle edge cases?**

A: Keep the agent as a fallback. Route the common paths to the workflow and the long tail to the agent. You get the reliability of the workflow and the flexibility of the agent without paying agent prices on every request.

**Q: What frameworks support the workflow-with-LLM-steps pattern well?**

A: LangGraph (workflow mode), Temporal, Prefect, Airflow with LLM operators, and AWS Step Functions all work. If you're early, plain Python with a state machine is fine. The framework matters less than having clear, named steps with typed inputs and outputs.

**Q: How do I sell "rolling back the agent" to leadership that funded "agentic AI"?**

A: Reframe it. Nothing got rolled back; the agent's learned behavior got *promoted into a hardened workflow*, and the agent is still running on the ambiguous long tail. Then bring your own measurements. Whatever cost, latency, and incident deltas you recorded in Step 5 are the argument, and they land better than the word "replaced."

**Q: Does this mean multi-agent architectures are also overhyped?**

A: For most enterprise tasks, yes. If a single agent didn't need dynamic planning, a committee of them won't either. You've just multiplied the token bill. Multi-agent starts to pay when you have distinct specializations that need to negotiate, which is rarer than conference keynotes suggest.

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
