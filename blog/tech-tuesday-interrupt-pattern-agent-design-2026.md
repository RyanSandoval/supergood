---
title: "The Interrupt Pattern: How to Design AI Agents That Know When to Stop"
description: "Most AI agents are wired to run until they finish — or crash. A practical guide to the interrupt pattern: the threshold design, escalation logic, and implementation mechanics that separate production-grade agents from expensive demos."
canonical: https://supergood.solutions/blog/tech-tuesday-interrupt-pattern-agent-design-2026/
published: 2026-03-03
last-updated: 2026-10-29
---

![The Interrupt Pattern: How to Design AI Agents That Know When to Stop — a toy robot frozen mid-stride with a big green emergency stop button on its back.](/blog/tech-tuesday-interrupt-pattern-agent-design-2026/hero.webp)

Tech Tuesday · Agent Design

# The Interrupt Pattern: How to Design AI Agents That Know When to Stop

Most AI agents are wired to run until they finish — or crash. A practical guide to the interrupt pattern: the threshold design, escalation logic, and implementation mechanics that separate production-grade agents from expensive demos.

Published March 3, 2026 — 9 min read

**TL;DR:** Most AI agents fail in production not because the model is wrong, but because there's no mechanism for the agent to stop and ask. The interrupt pattern adds a structured pause between intention and action — a pre-execution policy check that routes low-risk actions automatically, surfaces higher-risk actions for human approval, and refuses anything outside the agent's operating envelope. Teams that build this in from the start ship agents that stay in production; teams that skip it spend their time firefighting.

There's a statistic that should stop every team currently building AI agents: according to McKinsey's late-2025 survey, **62% of enterprises are actively experimenting with agentic AI**. Deloitte's research puts the number with anything actually running in production at 14%. And Gartner's projection is bluntest of all — more than 40% of agentic AI projects will be cancelled outright by the end of 2027, not because the underlying technology failed, but because the foundation underneath the deployment was never right.

That gap isn't a capability gap. Models are capable. The gap is almost always an architecture gap — specifically, teams that ship agents designed to *run* rather than agents designed to *decide when not to run*.

The pattern that separates the 14% from the 86% isn't a smarter model or a fancier framework. It's something much more boring: a well-designed interrupt mechanism. The ability for an agent to recognize when it's about to do something it shouldn't be doing autonomously, and stop to ask.

This post is the practical guide to building that.

## Why Agents Default to "Just Run"

The default behavior for most agent implementations is greedy execution: the agent receives a goal, plans a sequence of steps, and executes them until completion or failure. This works beautifully in demos — the demo author has carefully scoped the task to avoid ambiguous cases, and the "failure" case just means the agent says something apologetic and stops.

In production, the demo assumptions collapse immediately. Users give agents underspecified goals. Tools return partial data. Real systems have edge cases the agent wasn't designed for. The agent encounters a decision point where two paths are plausible, picks one, and executes — potentially writing a CRM record, sending an email, or deleting a row from a database based on a coin-flip between two reasonable interpretations of what the user actually wanted.

**The core production failure mode:** Giving AI agents the power to act without giving them rules for when not to act. [Governance in agentic AI](https://supergood.solutions/ai-agent-governance/) isn't about restricting what the agent can do — it's about specifying the conditions under which it does it autonomously versus the conditions under which it stops and involves a human.

The agents running reliably in production right now share a common design principle: **autonomy is a dial, not a switch**. You don't set an agent to "fully autonomous" and hope for the best. You design specific thresholds, and the agent operates within them until a threshold is crossed — at which point it interrupts, presents what it knows, and waits.

## What the Interrupt Pattern Actually Is

The interrupt pattern is a structured mechanism for an agent to pause execution, surface its current state to a human, and wait for explicit instruction before proceeding. It's not a fallback for when things go wrong — it's a first-class design feature built into the agent's execution loop.

The pattern has five components:

1. **Plan:** The agent reasons about the task and produces a proposed action sequence before executing anything
2. **Evaluate:** Before executing, the agent scores each planned action against configured thresholds (reversibility, confidence, scope, cost)
3. **Interrupt or proceed:** If any action exceeds a threshold, the agent pauses and surfaces the plan for review. If all actions are below threshold, it executes.
4. **Present:** The human sees the proposed plan — what the agent intends to do, why, and what it's uncertain about
5. **Approve, edit, or reject:** The human explicitly unlocks execution, modifies the plan, or cancels it entirely

The key insight is step 2 — the pre-execution scoring pass. Most agent implementations skip this entirely. The agent decides what to do and does it in the same reasoning step, with no gate between intention and action. Adding even a simple threshold check between those two phases changes the reliability profile of the entire system.

## Designing Your Interrupt Thresholds

The hardest design question isn't *whether* to add interrupts — it's *what triggers them*. Threshold too tight and you've built an annoying approval machine that humans start rubber-stamping. Threshold too loose and you're back to "just run."

There are four dimensions worth evaluating for every action an agent might take:

### 1. Reversibility

Can the action be undone? Reading a record is trivially reversible (it has no side effect). Sending an email is not. Deleting a database row may or may not be depending on your backup posture. **Any irreversible action — a send, a delete, a publish, a payment — should almost always require explicit approval**, at least until your agent has a strong reliability track record on that specific action type.

### 2. Confidence

How certain is the agent about the right interpretation of the user's request? This is harder to measure directly, but there are practical proxies: does the agent find multiple plausible plans and have to pick one? Did it receive ambiguous or incomplete input? Is it operating outside the distribution of tasks it was originally designed and tested for? Low confidence — even if the agent "picks" an action confidently — is a flag for an interrupt.

### 3. Scope

How many records, systems, or downstream effects are affected? An agent updating one contact record is scoped. An agent about to bulk-update 2,000 contacts because the user said "fix the phone number format" is a very different risk profile — even if each individual update looks reasonable. Scope multipliers should trigger interrupts even when the per-action confidence is high.

### 4. Cost

Both monetary and reputational. If an agent action consumes significant API budget, triggers a paid downstream service call, or reaches a threshold that would require human cleanup if wrong — that's an interrupt candidate. Agents touching financial data, customer-facing content, or anything that shows up in reports should have cost-based interrupts regardless of confidence.

**A useful rule of thumb from practitioners in the field:** "Low-risk actions can happen automatically. Everything else needs a confidence threshold that determines when to escalate versus act." The same principle applies whether you're building a security operations agent or a marketing data pipeline — the taxonomy of what's "low risk" varies by domain, but the threshold structure is universal.

## The Three-Zone Model

Once you've defined your dimensions, the simplest useful model is a three-zone framework. Every potential agent action falls into one of three zones:

Zone 1 — Auto

#### Proceed Silently

Reversible, high-confidence, narrow scope, low cost. The agent executes, logs the action, and moves on. Examples: reading data, drafting content for human review, querying an API.

Zone 2 — Interrupt

#### Show and Wait

At least one threshold exceeded — irreversible, ambiguous, broad scope, or material cost. The agent surfaces its plan and pauses. Examples: sending external comms, bulk writes, publishing, API calls with financial implications.

Zone 3 — Hard Stop

#### Refuse and Escalate

Outside the agent's defined operating envelope entirely. The agent doesn't just pause — it declines and flags for human review. Examples: actions it was never authorized to perform, detected ambiguity that exceeds a defined ceiling, any action where it cannot determine reversibility.

Zone assignment isn't a static classification — it can be dynamic based on context. An agent that's been reliably handling a specific task type for 30 days with zero correction might have its Zone 2 threshold relaxed for that task class based on observed reliability. One that's never handled a task type before defaults to Zone 2 or Zone 3 until it earns trust on that specific action.

## What "Show and Wait" Actually Looks Like

The quality of the interrupt surface matters as much as the trigger logic. An interrupt that just says "Are you sure?" is nearly useless — it degrades into rubber-stamp approval within a week. An interrupt that surfaces what the agent knows, what it's proposing, what it's uncertain about, and what the alternatives are is a genuine collaboration checkpoint.

Good interrupt surfaces include:

- **The proposed action in concrete terms** — not "update the contact" but "set phone field to +1-555-8820 for Ryan Sandoval (contact ID 4421)"
- **Why the agent chose this action** — which part of the user's instruction it's responding to, and what evidence it used
- **What it's uncertain about** — if there were two plausible interpretations, show both
- **The reversibility status** — "this action cannot be undone" is worth stating explicitly
- **Scope summary** — "this will affect 847 records" is worth stating before approval, not after

Teams building with LangGraph can implement this directly using the framework's `interrupt()` primitive, which pauses the graph execution at a defined node and hands control back to the application layer. The human review surface can be as simple as a Slack message with approve/reject buttons, or as rich as a dedicated UI showing the full plan graph. The mechanism is the same — the presentation layer is a product decision.

For teams building framework-agnostic or custom agent loops, the same pattern applies: the agent's "decide" step should produce a structured plan object before any execution begins, and a pre-execution policy check should evaluate that plan against configured thresholds before allowing the execution loop to start.

## The Build Order That Actually Works

One of the most useful observations from [practitioners building production agents](https://supergood.solutions/ai-agent-consulting/) in 2026 is a specific recommended build sequence: **tool contracts first, then state management, then evals, then interrupts and guardrails**.

The reasoning is counterintuitive at first. Why add interrupts last if they're so important? Because interrupts need to know what "right" looks like. If your tool contracts are fuzzy and your state transitions aren't deterministic, you can't reliably score actions for Zone 1 vs Zone 2 — you're just adding a speed bump on top of an unreliable system.

The sequence:

1. **Define typed tool contracts** — every tool the agent can call has explicit input/output schemas, typed arguments, and documented side effects (read-only vs. write, reversible vs. not)
2. **Make state transitions deterministic** — what does "task complete" mean? What does "needs human review" mean? These need to be code, not vibes in a system prompt
3. **Add trace-level observability** — before you can set interrupt thresholds intelligently, you need to observe actual agent behavior across real tasks. Blind threshold-setting is guesswork.
4. **Ship evaluation in CI** — your interrupt logic should be tested the same way any conditional logic is tested: with known inputs and expected outputs
5. **Layer in interrupt thresholds** — now, with real observability data and tested state transitions, you can set thresholds that reflect actual risk rather than theoretical ones

**The sequence avoids the most common trap:** shipping a "smart" agent that's impossible to debug because nothing about its decision-making is instrumented. If you can't see what your agent is doing and why, you can't tune your interrupts — and you can't tell a human what to approve.

## One Pattern Worth Stealing: The Plan-First Architecture

A pattern gaining adoption among teams running agents in production is what's sometimes called "plan-and-execute with explicit approval" — distinct from a standard ReAct loop where reasoning and action happen in tight iteration.

In the plan-first architecture, the agent has two distinct phases separated by a hard boundary:

- **Phase 1 — Planning only:** The agent is allowed to read, query, and reason — but no write operations, no sends, no irreversible actions. It produces a structured plan as output: an ordered list of proposed steps with justification and risk classification for each.
- **Phase 2 — Execution:** The plan is reviewed (by a human if any step is Zone 2 or 3, automatically if all steps are Zone 1). Execution only begins after the plan is explicitly approved.

The main benefit isn't just safety — it's **debuggability**. When something goes wrong in execution, you have a pre-execution plan to compare against. You can see whether the execution followed the plan, whether the plan was correct given the available information, or whether the human approval step missed something. Each of those failure modes has a different fix.

The secondary benefit is trust-building. Teams that show users the plan before executing consistently report higher user confidence in the system overall — even when the underlying model and tool set are identical to an approach that just runs silently. Making the agent's reasoning visible makes it feel more trustworthy, because it is: a system that shows its work before acting is structurally more auditable than one that doesn't.

## What to Watch Out For

A few failure modes in interrupt implementation that are worth knowing:

### Approval fatigue

If interrupts fire too frequently, humans stop reading them carefully. The result is a system that's theoretically supervised but practically running unchecked — with the added problem that someone hit "approve" on every incident. Calibrate thresholds to interrupt only when the decision is genuinely consequential, and track approval time as a metric. If humans are approving in under 3 seconds, your interrupts aren't adding value.

### Interrupt bypass under pressure

When an agent is running a long workflow and interrupts start accumulating, users will often look for a way to skip them. Build your approval flow with this in mind: make it fast to review and act when the agent is right, and hard to bulk-approve without reading. One useful pattern is requiring explicit confirmation for Zone 2 steps rather than a passive timeout ("approve" button rather than "auto-approves in 10 minutes").

### Stale plan execution

In plan-first architectures, there's a timing problem: the agent plans at T=0, a human approves at T=5 minutes, and the agent executes at T=5:01 — but the underlying data changed between T=0 and T=5:01. Build staleness checks into your execution phase: before running an approved action, verify that the state the plan was based on still holds. If it doesn't, re-interrupt rather than executing against stale assumptions.

## The Bottom Line

The interrupt pattern isn't glamorous. It doesn't make your agent smarter. It doesn't unlock new capabilities. What it does is make your agent's autonomy appropriate to its reliability — which is the actual requirement for running agents against real systems without causing incidents.

The teams with production agents that actually stay in production have all arrived at some version of this: **define what the agent can do alone, define what requires a human, build a clear handoff between the two, and instrument everything so you can adjust the boundary as confidence grows**.

Autonomy should be earned incrementally. The interrupt pattern is how you build that earning process into the system architecture rather than hoping the model gets it right by default.

If you've already got your evals and observability layer in place (see [this post on agent evals](/blog/metrics-monday-agent-evals-observability/) and [the agent ops runbook](/blog/systems-sunday-agent-ops-runbook/)) and you've standardized your tool connectivity via MCP (see [last week's MCP guide](/blog/tech-tuesday-mcp-practical-guide-2026/)), interrupt design is the next logical layer to add. It's where the architecture becomes a system you can actually stake production workflows on.

### Interrupt Pattern Implementation Checklist

- Define reversibility classification for every tool in your agent's toolset (read-only, reversible write, irreversible write)
- Set explicit Zone 1 / Zone 2 / Zone 3 classifications for each action type — in code, not just in docs
- Implement a pre-execution policy check that evaluates the proposed action plan before execution begins
- Build the interrupt surface to show: proposed action in concrete terms, justification, uncertainty, scope, and reversibility status
- Require explicit approval (not passive timeout) for Zone 2 actions
- Add staleness checks in plan-first architectures — verify state hasn't changed between plan approval and execution
- Track approval time as a metric — sub-3-second approvals signal approval fatigue, not real review
- Log all interrupt events (triggered, shown, approved, modified, rejected) with timestamps for threshold calibration
- Review interrupt logs monthly — adjust zone thresholds based on observed approval patterns and incident data

## Frequently Asked Questions

### What is the interrupt pattern in AI agents?

The interrupt pattern is a design approach that adds a structured pause between an agent's decision-making and its execution. Before taking any action, the agent evaluates the proposed step against configured thresholds — for reversibility, confidence, scope, and cost — and either proceeds automatically, surfaces the plan for human approval, or refuses entirely. It's a first-class design feature, not a fallback for when things go wrong.

### Why do most AI agents fail in production?

The failure is almost always architectural, not a model capability problem. Agents default to greedy execution — they plan and act in the same step with no gate between intention and action. When the task is underspecified, data is ambiguous, or scope is larger than expected, the agent still executes. In production, that means CRM records overwritten, emails sent to the wrong segment, or bulk operations run on thousands of rows before anyone realizes something went wrong.

### How do I decide what should trigger an interrupt?

Evaluate every potential agent action across four dimensions: reversibility (can it be undone?), confidence (is the agent certain about the right interpretation?), scope (how many records or systems are affected?), and cost (monetary or reputational). Any action that scores high on even one dimension — especially irreversibility — should trigger an interrupt until the agent has a demonstrated reliability track record on that specific action type.

### What's the difference between Zone 2 (interrupt) and Zone 3 (hard stop)?

Zone 2 means the agent pauses, surfaces its plan with full context, and waits for explicit human approval before proceeding. Zone 3 means the agent declines to act at all and escalates — it's triggered when the requested action is outside the agent's authorized operating envelope, when ambiguity exceeds a defined ceiling, or when the agent can't determine reversibility. Zone 2 is a collaboration checkpoint; Zone 3 is a refusal with an explanation.

### What is approval fatigue and how do I prevent it?

Approval fatigue happens when interrupts fire too frequently, causing humans to rubber-stamp approvals without actually reviewing them. The result is a system that's theoretically supervised but practically running unchecked. Prevent it by calibrating thresholds to fire only for genuinely consequential decisions, requiring explicit approval (not passive timeout), and tracking approval time as a metric — if humans are approving in under 3 seconds on average, your interrupts aren't generating real review.

### What does a good interrupt surface look like?

A useful interrupt shows: the proposed action in concrete terms (specific field, specific record, specific value — not just "update the contact"), the reasoning behind the choice, what the agent is uncertain about, the reversibility status, and the scope summary. Vague "Are you sure?" prompts degrade into rubber-stamp approvals within days. The interrupt surface should give a human everything they need to make a real decision in under 30 seconds.

### Sources:

- [Gartner: Over 40% of Agentic AI Projects Will Be Canceled by End of 2027](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027)
- [Why Agentic AI Projects Fail: The #1 Enterprise Problem in 2026 — Ampcome](https://www.ampcome.com/post/why-agentic-ai-projects-fail)
- [AI Agents in 2026: Practical Architecture for Tools, Memory, Evals, and Guardrails — Andrii Furmanets](https://andriifurmanets.com/blogs/ai-agents-2026-practical-architecture-tools-memory-evals-guardrails)
- [How to Build Human-in-the-Loop Plan-and-Execute AI Agents with Explicit User Approval — MarkTechPost (February 2026)](https://www.marktechpost.com/2026/02/16/how-to-build-human-in-the-loop-plan-and-execute-ai-agents-with-explicit-user-approval-using-langgraph-and-streamlit/)
- [What Is Agentic AI? The Essential 2026 Guide — CustomGPT](https://customgpt.ai/what-is-agentic-ai-2026/)
- [Agentic AI in the Wild: Real-World Use Cases You Should Know — Security Boulevard (March 2026)](https://securityboulevard.com/2026/03/agentic-ai-in-the-wild-real-world-use-cases-you-should-know/)
- [AI Guardrails: Why Security is Essential for Agentic AI Enablement — Cequence](https://www.cequence.ai/blog/ai/agentic-ai-security-guardrails/)
- [AI Agent Guardrails: A Complete Practical Guide — Towards AI (February 2026)](https://pub.towardsai.net/ai-agent-guardrails-stop-your-agent-from-doing-stupid-things-a-complete-practical-guide-bf2e14e98dd4)
- [40% of Enterprise Apps Will Run AI Agents by 2026 — But Most Companies Can't Control the Swarm — UC Strategies](https://ucstrategies.com/news/40-of-enterprise-apps-will-run-ai-agents-by-2026-but-most-companies-cant-control-the-swarm/)
- [The State of AI — McKinsey & Company, 2025](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai)

Trying to figure out where the guardrails belong in your agent architecture? We help ops and marketing teams design agentic workflows with the interrupt logic, approval flows, and observability to actually trust them in production. **supergood.solutions**

Need this in production?

Zone thresholds, approval surfaces, staleness checks — the interrupt pattern is easy to describe and easy to get subtly wrong once it's running against real tool contracts and real failure modes. We help teams design and implement that layer so the line between what the agent handles alone and what needs a human actually holds once it's live.

[See AI Agent Consulting →](https://supergood.solutions/ai-agent-consulting/)

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
