---
title: "Stop Asking \"Build or Buy?\" — Ask \"What Do We Wrap?\""
description: "The build-vs-buy frame for enterprise AI agents is a trap: it forces a binary choice between a 12-month internal build and a vendor lock-in that owns your roadm"
canonical: https://supergood.solutions/blog/stop-asking-build-or-buy-ask-what-do-we-wrap/
published: 2026-04-25
last-updated: 2026-10-29
---

![Stop Asking "Build or Buy?" — Ask "What Do We Wrap?" — an old toaster half gift-wrapped with a green bow instead of building something new.](/blog/stop-asking-build-or-buy-ask-what-do-we-wrap/hero.webp)

Strategy Saturday

# Stop Asking "Build or Buy?" — Ask "What Do We Wrap?"

Published April 25, 2026 — 9 min read

**TL;DR:** The build-vs-buy frame for enterprise AI agents is a trap: it forces a binary choice between a 12-month internal build and a vendor lock-in that owns your roadmap. The contrarian move in 2026 is to default to a third option — buy a generic agent runtime, then wrap it in a thin, owned orchestration layer that holds your evals, prompts, policies, and routing logic. That's where 80% of the durable value lives, and almost no enterprise procurement framework asks for it.

## Key Insight

Most "build vs buy" decks at enterprise AI committees collapse the question into two columns:

- **Build:** ~$2–5M, 9–18 months, you own everything, but staffing risk and opportunity cost are huge.
- **Buy:** ~$200–800K/year, 6–12 weeks to deploy, but the vendor's roadmap becomes your roadmap, and switching cost grows monthly.

The framing is wrong because it treats the agent system as a *monolith* — one stack, one decision. In practice, an enterprise AI agent has at least four loosely-coupled layers, and each has its own build/buy answer:

1. **Runtime** — the orchestration engine that invokes models, tools, and memory (e.g. LangGraph, AutoGen, Microsoft Agent Framework, Vertex Agent Builder, Bedrock Agents).
2. **Model layer** — the actual LLMs and embedding models, plus routing between them.
3. **Tools and integrations** — connectors to your CRM, ticketing system, data warehouse, internal APIs.
4. **Policy and evals layer** — your prompts, your guardrails, your evaluation suite, your routing decisions, your audit logs.

The contrarian take: layers 1–3 should almost always be bought. Layer 4 should almost always be built — and it's the only one that actually constitutes durable enterprise IP. Everything else is commodity inside 18 months.

The "wrap" pattern is just: buy a generic runtime, plug in models and tools through standard protocols (MCP for tools, OpenAI-compatible APIs for models), and put your owned policy and evals layer *on top*. You get the speed of buy and the optionality of build, without paying for either in full.

## Why Teams Miss This

**1. Procurement scoring rewards completeness, not optionality.** Vendor RFP scorecards weight feature coverage heavily — "does the platform include eval tooling, audit logging, prompt management, and a marketplace?" The vendor that ticks every box wins, even though every checked box is also a piece of IP you've outsourced. Teams optimizing for "fewest vendors" end up with the most lock-in.

**2. Engineering teams pattern-match to "build" out of habit.** AI/ML teams that grew up shipping models in-house default to building runtime infrastructure too. Five years ago that was correct — there was no commodity option. In 2026 there is, but the muscle memory hasn't updated. Most internal "agent platform" projects are reinventing what LangGraph, AutoGen, and Bedrock Agents already do, badly, slower, and with worse observability.

**3. Build-vs-buy decks don't model layer drift.** The runtime layer is consolidating fast — MCP standardized tool exposure in late 2024, A2A standardized agent-to-agent messaging in 2025, and most major vendors now ship runtime engines that look interchangeable from the outside. By 2027, picking a runtime will be like picking a Postgres host. But your prompts, your evals, your routing — those are *yours*, and a 6-month build there pays back for years.

**4. Vendors actively obscure the layer boundaries.** The biggest agent platforms ship the runtime, model access, *and* eval/policy tooling as one product, with the eval and policy tools intentionally tightly coupled to their runtime. That's what makes lock-in real. Asking "can I take my eval suite to a different runtime?" in the demo is the question that exposes whether you're buying a tool or buying a cage.

## How to Actually Do It

**Step 1 — Map your agent stack into the four layers and label each with build/buy/wrap.**

| Layer | Default | Why |

|-------|---------|-----|

| Runtime | Buy | Commodity in 12 months. Your team's time is better spent elsewhere. |

| Model | Buy + route | Use Anthropic, OpenAI, Google, and an open-weight host. Routing logic lives in your wrap layer. |

| Tools | Buy or wrap MCP | Use existing MCP servers when they exist; build thin MCP wrappers for proprietary internal APIs only. |

| Policy + evals | Build (the wrap layer) | This is the IP. Owns prompts, eval data, guardrails, routing rules, audit logs, rollback hooks. |

If your current architecture has any of these inverted — e.g. building a runtime, or buying eval tooling — that's the place to challenge the decision.

**Step 2 — Define the wrap-layer contract before picking a runtime.** Write down what your owned layer must do, independent of any vendor:

- Hold every prompt and guardrail in version control, with semantic versioning and rollback.
- Run eval suites against any runtime + model combination you point at.
- Route requests to the cheapest model that meets quality bar, per task class.
- Emit an OpenTelemetry trace for every agent call, regardless of which runtime executed it.
- Log every tool invocation with input/output to your warehouse, not the vendor's.

If a runtime can't be wrapped to satisfy this contract — e.g. it won't let your evals see raw prompts, or its tracing is locked inside its UI — disqualify it before you start the procurement process. This shrinks the vendor list fast.

**Step 3 — Pick the thinnest runtime that does the job.** In 2026 the credible options for the runtime layer are roughly: LangGraph (most flexible, most code), Microsoft Agent Framework (best for Azure-heavy stacks, MCP-native), Bedrock Agents (best for AWS-heavy, weaker eval story), Vertex Agent Builder (best for GCP, weakest portability), and AutoGen (research-leaning, good for multi-agent patterns). All of them are "good enough" runtimes. Pick on integration fit with your existing cloud, not on feature surface area.

**Step 4 — Build the wrap layer as a thin Python or TypeScript package, not a platform.** A common failure mode is over-engineering the wrap into its own internal platform — UI, marketplace, multi-tenancy. Resist. The wrap is a library that exposes:

from your\_company\_agents import run\_agent

result = run\_agent(

task="summarize\_ticket",

inputs={"ticket\_id": 12345},

policy\_version="v3.2",

eval\_mode="shadow", # runs against eval suite in parallel

)

Internally it picks the runtime, picks the model, applies prompt version v3.2, runs guardrails, emits traces, optionally fans out a shadow eval. That's it. Three engineers, three months. Most enterprise "agent platform" projects are 30 engineers and 18 months because the team scoped a platform when they needed a library.

**Step 5 — Make the runtime swap explicit in your roadmap.** Pick a date — say 12 months out — at which you re-evaluate the runtime layer. Plan for it. Run a shadow deployment on a second runtime for two weeks before the date. The fact that you *can* swap, and you're known to *plan to* swap, is what keeps your vendor honest on price and roadmap. Companies that never threaten to leave never get the discount.

## What We've Learned

The teams getting durable leverage from AI agents in 2026 aren't the ones who built the most or bought the most — they're the ones who got the layer boundaries right. They bought commodity runtime and model layers because the marginal value of building those is collapsing. They built a small, owned policy and evals layer because that's the part that compounds — every prompt version, every eval case, every routing rule is permanent IP that survives the next vendor swap.

If your AI strategy doc still has a "build vs buy" tab with two columns, you're optimizing the wrong question. The right question is: which layers are commodity, which layers are IP, and what's the thinnest wrap we can put between them?

**Concrete next step:** sketch your current agent architecture on one page, draw the four layers, and label each cell *commodity* or *IP*. If anything labeled *IP* is currently bought, or anything labeled *commodity* is currently being built, you've found the next architecture decision worth defending in your next steering committee. Bring numbers — token cost per request, runtime engineer-months, vendor renewal cost — and the layer-mapping argument tends to make itself.

## Sources

- [Anthropic — Building Effective Agents (Dec 2024)](https://www.anthropic.com/research/building-effective-agents)
- [Model Context Protocol (MCP) Specification](https://modelcontextprotocol.io/)
- [Google — Agent2Agent (A2A) Protocol Announcement (April 2025)](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)
- [Microsoft Agent Framework — General Availability (2026)](https://learn.microsoft.com/en-us/agent-framework/)
- [AWS Bedrock Agents Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)
- [Google Vertex AI Agent Builder](https://cloud.google.com/products/agent-builder)
- [LangGraph — Agentic Architecture Documentation](https://langchain-ai.github.io/langgraph/)
- [Gartner — Hype Cycle for Generative AI, 2025](https://www.gartner.com/en/research/methodologies/gartner-hype-cycle)

---

## FAQ

**Q: Isn't "wrap" just a fancy word for "vendor abstraction layer," and didn't every team that tried that in the cloud era regret it?**

A: Cloud abstraction layers failed because the underlying services (S3 vs Blob Storage vs GCS) had genuinely different semantics that leaked through any abstraction. Agent runtimes are converging on shared protocols (MCP, A2A, OpenAI-compatible APIs) precisely to avoid that fate. The abstraction is shallower because the substrate is more standardized. That said — keep the wrap thin. The moment it tries to hide model differences, it becomes the cloud-abstraction trap all over again.

**Q: Which runtime should we pick if we're starting today?**

A: Pick on cloud fit, not on features. Azure-heavy: Microsoft Agent Framework. AWS-heavy: Bedrock Agents (with the caveat that you'll need to build more of the eval layer yourself). GCP-heavy: Vertex Agent Builder. Cloud-agnostic or research-heavy: LangGraph. None of these are wrong answers in 2026. The wrong answer is "we're going to build our own."

**Q: What goes in the policy and evals layer specifically?**

A: At minimum: versioned prompts, guardrail/policy rules (PII redaction, output validation, refusal patterns), an eval suite with golden test cases per task class, a routing function that picks model and runtime per task, OpenTelemetry tracing emission, and a shadow-mode runner for safe rollouts. These are the things you do not want to outsource because every one of them gets better with your specific data over time.

**Q: How big should the wrap layer be?**

A: Small. Three engineers for three months is a reasonable starting point for a mid-market deployment. If your wrap layer needs ten engineers and a dedicated platform team, you've over-scoped it into an internal SaaS — pull it back. The wrap is a library plus a CI pipeline, not a product.

**Q: What if our chosen runtime adds the eval and policy features we need natively — should we still build the wrap?**

A: Yes, and treat it as the price of optionality. If the runtime's eval tooling is genuinely better than yours, your wrap can call into it — but the eval *data*, *test cases*, and *routing logic* must live in your repo, not the vendor's UI. The day you decide to swap runtimes, that data is what determines whether the swap is a weekend or a year.

**Q: How does this advice change for regulated industries (healthcare, finance)?**

A: It hardens, doesn't change. Regulated industries need *more* policy and audit IP owned in-house, not less, because the compliance evidence belongs to you, not the vendor. The wrap layer is also the natural place for PHI/PII redaction, retention policies, and audit log routing to your SIEM. If anything, regulated buyers should be fastest to adopt the wrap pattern — it's the one architecture that keeps compliance evidence portable.

**Q: Will this still hold in 2027–2028 as agent platforms mature?**

A: The runtime commoditization argument gets *stronger* over time, not weaker — protocols like MCP and A2A are doing to agent runtimes what Kubernetes did to container orchestration. The IP value of owning your policy and evals layer also compounds with usage. Expect the wrap pattern to become the dominant enterprise architecture by 2028, with vendor lock-in to specific runtime stacks looking, in retrospect, the way "we standardized on a single cloud" looks today.

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
