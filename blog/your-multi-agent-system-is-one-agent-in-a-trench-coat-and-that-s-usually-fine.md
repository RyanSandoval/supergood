---
title: "Your \"Multi-Agent System\" Is One Agent in a Trench Coat — And That's Usually Fine"
description: "A lot of what ships as"
canonical: https://supergood.solutions/blog/your-multi-agent-system-is-one-agent-in-a-trench-coat-and-that-s-usually-fine/
published: 2026-04-24
last-updated: 2026-04-24
updated: 2026-04-24
---

Future Friday

# Your "Multi-Agent System" Is One Agent in a Trench Coat — And That's Usually Fine

Published April 24, 2026 — 8 min read

**TL;DR:** A lot of what ships as "multi-agent" in 2026 is a single LLM call prompted to play several roles inside one context window, not a fleet of independent agent runtimes. That's not a scam — it's usually the cheaper, faster, more debuggable design. The contrarian move is refusing to spin up \*real\* multi-agent infrastructure until you can point to at least two hard requirements (separate memory, separate credentials, separate model tiers, or real parallelism) that a single-context role-play can't satisfy.

## Key Insight

"Multi-agent" has collapsed into a brand, and the brand is hiding two very different architectures:

1. **Role-play multi-agent:** one LLM call (or a short chain of them), one context window, one model, several personas ("planner", "coder", "reviewer") prompted into the same reasoning trace. CrewAI in its simplest mode, AutoGen's GroupChat when run against one model, most "agent teams" demoed at conferences.
2. **True multi-agent:** N independent processes, each with its own context, memory store, credentials, and often its own model tier. They communicate over a message bus or a protocol like Anthropic's MCP or Google's A2A. They can run in parallel, fail independently, and be redeployed independently.

The contrarian claim: for the overwhelming majority of enterprise workloads in 2026, (1) is better than (2). It's cheaper by a factor of 3–10x on tokens (no redundant context reloads), faster by hundreds of milliseconds per hop (no inter-process network), and an order of magnitude easier to debug (one trace instead of a graph of traces). Forcing yourself onto (2) before you need it is one of the most expensive design mistakes a platform team can make in 2026.

The twist: the industry keeps publishing multi-agent frameworks as if (2) is the goal state and (1) is training wheels. It's the other way around. Treat true multi-agent as an escape hatch, not a default.

## Why Teams Miss This

**1. Frameworks market the process-separation version because it looks like real engineering.** A diagram with five boxes and arrows between them sells better than "one prompt with role headers." AutoGen, CrewAI, LangGraph, and Microsoft's Agent Framework all let you run either pattern, but the tutorials and demos lean hard on the multi-process version. Teams copy the tutorial and inherit the cost.

**2. "Multi-agent" is a hiring and funding signal.** Saying you built a multi-agent system at the offsite gets a different reaction than saying you wrote a careful prompt with three role sections. Both might do the same work. Only one gets headcount.

**3. Engineers confuse concurrency with correctness.** Splitting into real processes feels safer — "separation of concerns" — but an LLM prompted to play three roles in one context actually has *more* shared state, which is often what you want. The planner sees what the coder wrote. The reviewer sees the full trace. In true multi-agent, you have to manually pass that context, which is where the expensive re-tokenization happens.

**4. Observability tooling hides the distinction.** Most agent observability platforms will happily show you a "multi-agent" trace whether you ran it as one LLM call with role tags or five independent calls. The cost and latency numbers tell you which one you built; the graph view doesn't.

## How to Actually Do It

Here's the decision test we've used to avoid over-engineering:

**Step 1 — Default to single-context role-play.** Start with one LLM call, a system prompt that declares two or three roles with explicit handoff markers, and structured output to separate the role's outputs. Something like:

You are a team of three agents sharing a conversation:

[PLANNER] decomposes the request into 3–6 concrete steps

[EXECUTOR] carries out each step, using the tools provided

[REVIEWER] checks the final result against the original request and flags issues

Always prefix your output with the role tag. Do not skip roles.

That's a multi-agent system. It's also one LLM call. It will solve 70–80% of what teams reach for CrewAI to do, at a fraction of the cost.

**Step 2 — Escape to true multi-agent only when one of these is true:**

- **Different memory or retrieval needs.** Your "researcher" needs a vector store over legal docs; your "coder" needs a graph over the repo. One context window can't cheaply keep both hot.
- **Different credentials or blast radius.** The agent that reads email must not share a process with the one that can send money. Least-privilege requires real separation.
- **Different model tiers.** Routing cheap classification to Haiku-class and planning to Opus-class saves 5–20x on cost — but only if they run as separate calls with their own prompts.
- **Real parallelism.** You have 12 independent sub-tasks and the total wall-clock time matters more than the coordination overhead. Fanning out to 12 concurrent agents pays.

Two or more of those true? Go multi-agent. One true? Probably still single-context with a careful prompt. None true? You're building infrastructure for a problem you don't have.

**Step 3 — If you go true multi-agent, pick a protocol before you pick a framework.** Anthropic's MCP is the de facto standard for tool exposure. Google's A2A protocol (announced April 2025) is the emerging standard for agent-to-agent messaging. Bet on protocols, not vendors. A CrewAI or AutoGen app that speaks MCP and A2A underneath will survive longer than one wired up with bespoke REST.

**Step 4 — Measure the rollback option.** Keep your single-context baseline alive and run it in shadow mode alongside the multi-agent version for two weeks. Compare p95 latency, cost per request, and eval pass rate. In the teams we've seen do this honestly, the multi-agent version won on 30–40% of workloads and lost on the rest. Rolling back is easier if the baseline still runs.

**Step 5 — Write down the reason you went multi-agent.** Pin it to the repo README. The next engineer will otherwise assume "multi-agent" was the goal, not the consequence of a specific constraint, and will over-engineer the next project on the same assumption.

## What We've Learned

The agent discourse in 2026 has a vocabulary problem: "multi-agent" describes both a prompting pattern and an infrastructure pattern, and the industry tooling treats them as the same thing. They're not. The prompting pattern is a cheap win most teams underuse. The infrastructure pattern is an expensive commitment most teams overuse.

Pair this with yesterday's post on rolling agents back to workflows, and a pattern emerges: the teams doing well with AI in 2026 are the ones picking the *smallest* architecture that solves the problem, not the most impressive one. That's harder to demo, but it's what actually ships.

**Next experiment:** pick one multi-agent system you're running in production. Rebuild it as a single LLM call with role tags in a careful prompt. Run both in parallel for a week on real traffic. If the single-call version hits your quality bar within 5%, you've just saved 3–10x on cost and cut your failure modes by an order of magnitude. If it doesn't, you now have data justifying the real multi-agent build — which is a far more defensible position than "the framework told us to."

## Sources

- [Anthropic — Building Effective Agents (Dec 2024)](https://www.anthropic.com/research/building-effective-agents)
- [Anthropic — Model Context Protocol (MCP) Specification](https://modelcontextprotocol.io/)
- [Google — Agent2Agent (A2A) Protocol Announcement (April 2025)](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)
- [Microsoft AutoGen — GroupChat & Multi-Agent Patterns](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/design-patterns/group-chat.html)
- [LangGraph — Multi-Agent Systems Documentation](https://langchain-ai.github.io/langgraph/concepts/multi_agent/)
- [CrewAI — Hierarchical vs Sequential Process Docs](https://docs.crewai.com/concepts/processes)

---

## FAQ

**Q: Isn't a single LLM playing multiple roles just prompt engineering, not real multi-agent?**

A: Correct — and that's the point. The question isn't which label applies, it's whether the architecture meets the requirement. If "prompt engineering with role tags" gets you the same output as a process-separated multi-agent system at 10% of the cost, the label doesn't matter. Most enterprise tasks fall in that bucket.

**Q: When is true multi-agent actually worth the overhead?**

A: When you need at least two of: distinct memory stores, distinct credentials, distinct model tiers, or real parallelism. One reason alone usually isn't enough to justify the token, latency, and ops cost of separate agent runtimes. Two or more is a strong signal.

**Q: What about frameworks like CrewAI or AutoGen — are they useless?**

A: No, but most teams use them at the wrong abstraction level. Both frameworks can run single-context role-play *or* true multi-agent. The tutorials lean on the multi-agent version because it demos better. Use them, but start in single-context mode and only escalate when you hit a real constraint.

**Q: Does MCP or A2A solve the multi-agent complexity problem?**

A: They solve interoperability, not complexity. MCP standardizes how agents expose tools; A2A standardizes how agents message each other. Neither reduces the cost of running N processes instead of one. Adopt them when you've already decided you need true multi-agent — not as a reason to go multi-agent in the first place.

**Q: How do I tell leadership we're "downgrading" from multi-agent to single-agent?**

A: Don't frame it as a downgrade. The architecture change is "we consolidated the agent team into a single reasoning context because the separation wasn't earning its cost." Lead with the numbers — cost per request, p95 latency, incident rate. "We made the agent 5x cheaper" lands better than "we removed the agents."

**Q: Will this advice age poorly as models get cheaper and agent infrastructure matures?**

A: Partially. As per-call cost drops, the tax on true multi-agent shrinks, so the bar for escalation will lower. But the debugging and observability tax on distributed agent systems is a *complexity* cost, not a price-per-token cost — that one doesn't fall as fast as inference. Expect the "default to single-context" advice to hold at least through 2027 for most enterprise workloads.

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
