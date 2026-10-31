---
title: "Wire Two AI Agents Together and the Handoff Is What Breaks"
description: "An analysis of two-agent pipelines: the four failure modes that live at the handoff seam, the typed-state contract that closes them, and a practical checklist for teams designing multi-agent workflows."
canonical: https://supergood.solutions/blog/case-study-thursday-two-agent-handoff-2026/
published: 2026-03-05
last-updated: 2026-09-25
updated: 2026-09-25
---

![Wire Two AI Agents Together and the Handoff Is What Breaks — two toy robots passing a parcel across a gap where the parcel is falling into the gap, green parcel.](/blog/case-study-thursday-two-agent-handoff-2026/hero.webp)

Analysis · Agent Architecture

# Wire Two AI Agents Together and the Handoff Is What Breaks

An analysis of the two-agent review pipeline: four failure modes that live at the seam between agents, the typed-state contract that closes them, and a pre-build checklist for any team designing multi-agent workflows.

Published March 5, 2026 · Updated Sep 25, 2026 — 10 min read

Single-agent failures are annoying. You ship, something breaks, you find it in the logs, you fix the prompt, you redeploy. Painful, but traceable.

Multi-agent failures are a different category of problem. When two agents are wired together and something goes wrong, the failure often doesn't happen where either agent ran. It happens *between* them. In the seam. In the thing nobody designed carefully, because everyone was focused on what the agents would do individually.

Wire two agents together and the handoff is what breaks. The agents can each be fine. The contract between them is the part that rots.

Below: a worked architecture, the four failure modes that show up at its boundary, and what closes each one. No vendor is required for any of it.

TL;DR

Take a two-agent pipeline where Agent 1 drafts enriched proposals and Agent 2 reviews and scores them. Both agents can perform well in isolation and the pipeline will still produce four distinct failures, all at the handoff boundary: format mismatches, context loss, conflicting ground truth, and silent partial failures that look like successes. What closes them is a typed state schema both agents validate against, an explicit handoff payload with required fields, and observability instrumented at the seam rather than inside each agent. Multi-agent systems fail at the seams, not the centers. Design the contract between agents as carefully as you design the agents.

## The setup: a two-agent proposal review pipeline

Use a concrete shape to think with. A professional services firm responds to RFPs and client briefs. The process is bottlenecked at review: a senior consultant drafts, then other people read for completeness, tone, and alignment with the buyer's stated criteria. Review is the slow step, and it is the thing that caps how many opportunities the firm can answer.

The obvious automation: a two-agent pipeline that handles first-pass review.

- **Agent 1 (the Enricher):** Takes the raw proposal draft and a brief with the buyer's criteria. Enriches the draft: identifies gaps, adds supporting data points, flags thin sections, and produces a structured output with the enriched text plus an annotated gap list.
- **Agent 2 (the Reviewer):** Takes the Enricher's output and the original client brief. Scores the proposal across five dimensions (completeness, tone, specificity, criteria alignment, competitive differentiation). Produces a structured review with scores, specific improvement notes, and a go/no-go recommendation.

A human then reads the Reviewer's output and decides whether to approve, revise, or escalate. The point of the design is to move the human's attention onto a scorecard instead of every word of the draft.

Pipeline Architecture

[Client Brief + Draft]  
    ↓  
Agent 1: Enricher  (enriched text + gap list)  
    ↓ handoff payload  
Agent 2: Reviewer  (scorecard + recommendation)  
    ↓  
[Human Review Queue]

This design tests well. Run it against a backlog of historical proposals that already carry human review notes and the Reviewer's scores will track the humans' assessments closely enough to satisfy a stakeholder demo. Each agent does its job. Nothing in the test set stresses the line between them.

Then it goes to production, and the reviewers stop trusting what the pipeline tells them. Four failure modes are waiting, and none of them announce themselves.

## Failure Mode #1: Format drift at the handoff boundary

Failure 01 / Schema Mismatch

### Agent 2 reads a different shape of output than Agent 1 produces

Agent 1 is prompted to produce a structured output with two top-level keys: `enriched_draft` (the full text) and `gap_list` (an array of gap objects, each with a `section`, a `severity`, and a `description`). Agent 2 is prompted to read that structure and feed the gap list into its scoring.

LLM outputs are not deterministic. On some proposals Agent 1 returns `gaps` instead of `gap_list`. On others it returns `gap_list` as a flat string instead of an array. When severity isn't obvious from the text, it drops the `severity` field entirely.

Agent 2, reading this variable-shape output, adapts silently. Sometimes it finds the `gaps` key. Sometimes it finds neither and defaults to "no gaps identified." Now the Reviewer is scoring proposals as complete while the Enricher's real findings sit one key name away, unread.

Format drift is the default outcome, not the unlucky one. When Agent A's output is Agent B's input and that contract lives only in natural language inside each prompt, there is nothing holding the shape in place. LLMs are probabilistic. They will not produce identical field names, nesting, or data types on every run, and they vary most when the content varies.

Fix 01

### A typed state schema, defined once and enforced at both ends

Define one shared state schema, a Pydantic model or a TypeScript interface, and make both agents validate against it. Agent 1's output gets parsed through the schema before it reaches Agent 2. If the parse fails, the run stops and logs an error. Agent 2 receives a guaranteed-shape object, never a raw LLM string.

The schema doubles as documentation: every field, its type, required or optional, and a one-line description. Point both prompts at it directly. "Your output must conform to the `EnricherOutput` schema. Required fields: `enriched_draft` (string), `gap_list` (array of GapItem objects). Do not invent field names."

- Schema validation failures go to a separate error queue, not the human review queue
- The Enricher's prompt includes the full schema definition, not just field names
- Schema version is logged with every run; any schema change triggers a re-test pass

## Failure Mode #2: Agent 2 doesn't know what Agent 1 knew

Failure 02 / Context Truncation

### The Reviewer scores drafts without the context the Enricher used to enrich them

The Enricher reads three things: the original brief, the draft, and a context document with firm-specific positioning data. It uses all three. The handoff payload carries two things: the enriched draft and the gap list.

So the Reviewer has the enriched text and nothing else. It is scoring alignment against "the buyer's criteria" that it has to infer from the draft itself, because the criteria document never crossed the boundary. The harder the Enricher worked, reframing language and adding specifics, the better the draft reads, and the more confidently the Reviewer scores criteria alignment as excellent. Criteria the draft still doesn't address are invisible to it.

The Reviewer is being asked to evaluate alignment with a target it cannot see.

Fix 02

### Explicit context forwarding in the handoff payload

Expand the handoff schema to carry a `context` object: the original brief, not just the draft, a reference to the positioning document, and an `enricher_notes` field holding a structured summary of what the Enricher changed and why.

That last field earns its keep twice. It gives the Reviewer direct visibility into the Enricher's reasoning, along the lines of "strengthened the competitive differentiation section based on the buyer's stated preference for outcome-oriented language." That lets the Reviewer judge the quality of the enrichment, not only the quality of the resulting prose. It also makes debugging possible, because the upstream decision is written down instead of inferred.

Call it **the annotated handoff**: the first agent passes its output plus a summary of its reasoning and the decisions behind it. The second agent treats that reasoning as context for its own evaluation instead of reverse-engineering it from the text.

## Failure Mode #3: Conflicting ground truth, two agents with two sets of facts

Failure 03 / Divergent Grounding

### The Enricher and the Reviewer are reading different versions of the firm's capability statements

The positioning context, the document describing capabilities, differentiators, and past references, sits in a knowledge base. Both agents retrieve from it through their own RAG step. Nothing guarantees they retrieve the same chunks.

The Enricher pulls a reference and builds an argument on it. The Reviewer, running its own retrieval pass, pulls a different or contradictory set. The Reviewer then flags the Enricher's reference as unverified, because the Reviewer's retrieval never surfaced it. The Enricher had good data. The Reviewer simply never saw it.

Two agents, grounded in different subsets of the same knowledge base. Each output is internally consistent. Together they contradict, and neither one notices.

Fix 03

### Shared retrieval: the Enricher fetches, the Reviewer reads from the same payload

Retrieve once per run. Have the Enricher perform all knowledge base retrieval, then carry the retrieved chunks in the handoff payload under a `retrieved_context` key. The Reviewer reads that same set and runs no retrieval of its own.

Two things fall out of this. Consistency, because both agents reason over identical facts. Traceability, because the retrieved context is logged with the run record and any past run can be replayed exactly. This is the principle frameworks like [LangGraph](https://python.langchain.com/docs/langgraph/) bake into their state model: a single shared state flowing through the graph, rather than each node fetching its own.

The Reviewer can still flag a low-confidence reference. Now it flags it because the retrieved context is weak, not because it pulled different context than the Enricher did.

## Failure Mode #4: Silent partial success, where the run looks fine and isn't

Failure 04 / Phantom Success

### The pipeline reports success on runs where the Reviewer quietly skipped dimensions it couldn't evaluate

The Reviewer scores five dimensions. When it can't confidently score one, because the relevant section is missing or the context is thin, it assigns the midpoint and moves on. It doesn't flag that. It doesn't raise an error. The run completes, the scorecard looks whole, and a human acts on a 3-out-of-5 in "competitive differentiation" without knowing the agent abstained rather than evaluated.

This is the quieter cousin of the hallucination problem covered in an earlier post on [agent guardrails](/blog/case-study-thursday-agent-guardrails-lessons-2026/). Nothing is invented here. The agent defaults to a neutral value when it lacks the information to score honestly, and from the outside the output looks complete and confident.

Fix 04

### Explicit abstention scores + confidence metadata on every dimension

Give every scoring dimension three fields instead of one: a `score` (1–5), a `confidence` value (`"high"`, `"medium"`, `"low"`, or `"abstain"`), and a `rationale` string. Then say so in the prompt: "If you cannot evaluate a dimension with reasonable confidence, set confidence to 'abstain' and score to null. Do not guess. A visible abstention is more useful than a false midpoint score."

- Any dimension with `confidence: "abstain"` is highlighted in the human review queue with a visual indicator
- A run with more than two abstentions on a single proposal is flagged as "incomplete review" and routed to a different queue for fuller human evaluation
- The overall review report shows a "confidence distribution", how many dimensions scored high, medium, low, or abstain, so reviewers can calibrate how much to trust the automated scorecard

## The pattern underneath all four failures

All four have one cause: the agents got designed and the interface between them did not.

Every engineer knows an API has a contract. An explicit definition of what goes in, what comes out, what an error looks like, and what the caller is allowed to rely on. A two-agent pipeline built the usual way has two agents and no contract, just an assumption that the prompts will keep both sides in sync. Prompts do not do that job.

**The handoff is the product.** In a single-agent system, you design the agent's behavior. In a multi-agent system, you design the agent's behavior *and* the contract between agents. If you only design the former, you'll spend your production debugging time on the latter.

The LangChain team's [2026 State of Agent Engineering report](https://www.langchain.com/state-of-agent-engineering) surveyed 1,300+ practitioners and found that quality, not cost and not latency, is the top barrier to putting agents in production, cited by 32% of respondents. That tracks. The quality problems blocking production confidence usually aren't in how either agent performs. They're in the seams between components, which is exactly what a single-agent benchmark cannot see.

## What the pipeline looks like with all four fixes in

Put the four fixes together and the architecture changes shape. Five steps, only two of which involve a model:

1. **Retrieval step (pre-Enricher):** A dedicated retrieval step pulls all relevant chunks from the knowledge base for this proposal. Output: a `retrieved_context` object with chunk IDs and text. This step runs once and its output flows through the entire pipeline.
2. **Enricher step:** Agent 1 receives the draft, the brief, and the `retrieved_context`. It produces an output conforming to the `EnricherOutput` Pydantic schema. Output is parsed and validated before proceeding. Parse failures go to an error queue.
3. **Handoff payload assembly:** A deterministic step, no LLM, assembles the full handoff payload: enriched draft, gap list, enricher notes, original brief, retrieved context. Pure data transformation over what the Enricher produced plus the original inputs.
4. **Reviewer step:** Agent 2 receives the assembled handoff payload. It produces a scorecard conforming to the `ReviewOutput` Pydantic schema, with per-dimension confidence levels. Abstentions are explicit fields, not nulls.
5. **Output routing:** A deterministic routing step inspects the Reviewer's output and routes to the appropriate human queue: standard review, incomplete review (too many abstentions), or error review (schema validation failures).

Instrument the observability layer at every step, with the boundaries getting the most attention. Log input size, output size, schema parse result, and wall-clock time at each transition. When something goes wrong, the trace names the step and the field instead of leaving you to guess.

## How to tell whether the seam is actually fixed

Note what that redesign is doing. Two of the five steps call a model. The other three are ordinary code: retrieve, assemble, route. Every failure mode above came from asking a probabilistic component to do a deterministic job, so the fix in each case was to move that job out of the prompt and into the pipeline.

Which also means the seam is measurable, and you should measure it. Four signals are worth a dashboard:

- **Schema parse failure rate per boundary.** This number should be visible and non-zero. Zero usually means validation isn't running, not that drift stopped happening.
- **Abstention rate per scoring dimension.** A dimension that abstains constantly is telling you the upstream payload is missing something, not that the model is weak.
- **Payload size at each handoff.** A sudden drop is context quietly falling out of the state object, which is failure mode two arriving without an error message.
- **Replay success.** Take a past run, feed its logged `retrieved_context` back in, and check you get the same behavior. If you can't reproduce a run, you can't debug one.

The softer signal matters more than any of them: whether the humans downstream still trust the output. Reviewers who quietly start re-reading every draft have already rendered a verdict on the pipeline, and they usually do it weeks before anyone opens a dashboard. A multi-agent system that works on a benchmark and loses its users is not a working system.

## The handoff design checklist

### Multi-Agent Handoff Design Checklist

- Define a [typed state schema](/blog/structured-output-contracts-agent-to-agent-communication/) (Pydantic, TypeScript interface, or equivalent) before writing either agent's prompt. The schema is the contract
- Parse and validate every agent output against the schema before passing it to the next agent. Never pass raw LLM strings across agent boundaries
- Schema validation failures route to an error queue, not the next step. A partial output is worse than a visible failure
- The handoff payload includes not just the agent's output but its reasoning notes ("annotated handoff"). Downstream agents shouldn't reverse-engineer upstream logic from output text
- Shared retrieval: if multiple agents read from the same knowledge base, do the retrieval once and pass the chunks through the state. Don't let each agent retrieve independently
- Every scoring or evaluation output includes a confidence level per dimension. Explicit abstention beats a false neutral score
- Observability is instrumented at the seam, not just inside each agent. Log input size, output size, schema parse result, and latency at every handoff boundary
- A deterministic routing step (no LLM) handles the output dispatch. Don't ask an agent to decide where its own output should go
- The pipeline is tested with adversarial inputs: missing fields, wrong types, truncated outputs, and API timeouts at each step
- Schema changes require a re-test pass against a regression set. You can't just update one agent's prompt without checking the downstream agent still reads the new structure correctly

A note on frameworks: the patterns above work regardless of which agent framework you use. [LangGraph](https://python.langchain.com/docs/langgraph/) makes some of this easier through its explicit shared state model and durable execution. Failures replay from an exact stopping point rather than restarting from scratch, which matters a lot when the thing you're debugging is a handoff. For retries, circuit breakers, and dead letter queues once those failures occur, see the post on [agent failure recovery](/blog/systems-sunday-agent-failure-recovery-2026/). [CrewAI](https://www.crewai.com/) goes a different route, with role-based agents passing structured task outputs, which enforces some of the same discipline implicitly. The underlying principle is framework-agnostic: define the contract, validate the boundary, instrument the seam.

## What this means for your next multi-agent build

One thing to hold onto before writing a line of prompt: **the hardest part is not making each agent work, it's making them work together.**

Individual agents are hard in well-understood ways. Better prompts, retrieval tuning, output constraints, evals. Handoff failures are harder because they never announce themselves. The run completes. The output looks plausible. The damage surfaces somewhere downstream, when a reviewer acts on a score the agent abstained on, when a gap list that should be an array arrives as a string, when two agents reading different retrieved context reach contradictory conclusions and neither flags it.

The architecture is still worth building. A well-designed two-agent pipeline does things no single agent can: parallel reasoning, specialized expertise, built-in self-review. Just put the investment where the failures are. Design the contract first. Build the schema before the prompts. Instrument the boundary as carefully as you instrument the steps.

The people who have to trust the output will notice the difference.

## Frequently Asked Questions

### What is an agent handoff in a multi-agent AI system?

An agent handoff is the point where one AI agent passes its output to another agent as input. Unlike a simple function call, the handoff in a multi-agent system involves transferring not just data but context, reasoning state, and any retrieved information the downstream agent needs to continue the task. Poorly designed handoffs, where the output format or content doesn't match what the downstream agent expects, are one of the leading causes of quality failures in production multi-agent pipelines.

### Why do multi-agent AI systems fail at the handoff between agents?

LLM outputs are non-deterministic, meaning the same prompt can produce slightly different output structures across runs: different field names, different nesting, different data types. If Agent A's output is Agent B's input and there's no enforced schema between them, format drift accumulates over time. Downstream agents adapt silently, filling gaps with defaults or assumptions rather than raising errors. The result is a pipeline that looks like it's working while producing quietly incorrect outputs.

### What is a typed state schema in the context of AI agent pipelines?

A typed state schema (commonly implemented with Pydantic in Python or TypeScript interfaces in JS/TS) is a formal definition of the data structure that flows between agents in a pipeline. It specifies every field, its type, whether it's required or optional, and validation constraints. Agent outputs are parsed against the schema before being passed to the next agent. If the parse fails, the run stops and an error is logged rather than passing malformed data downstream. This is the most effective single fix for multi-agent format drift failures.

### What is the "annotated handoff" pattern for multi-agent AI systems?

The annotated handoff is a pattern where the first agent passes not just its output but a structured summary of its reasoning and key decisions alongside the output data. For example, an Enricher agent might include a field like `enricher_notes` explaining which sections it strengthened and why. The downstream Reviewer agent can then evaluate the quality of the enrichment process, not just the final text, which produces sharper and more useful reviews. It also significantly helps with debugging, since the upstream agent's reasoning is explicit rather than having to be reverse-engineered from the output.

### How should I instrument observability for a multi-agent AI pipeline?

Standard agent observability (tracing LLM calls, logging token counts, timing steps) is necessary but not sufficient for multi-agent systems. You also need to instrument specifically at the handoff boundaries: log input size and output size at each agent boundary, record schema parse results (success/failure and which fields failed), and track per-dimension confidence levels wherever an agent produces scored outputs. Tools like [LangSmith](https://smith.langchain.com/), [Arize Phoenix](https://arize.com/), and [Braintrust](https://braintrust.dev/) all support multi-step trace visualization; the goal is to make the seam between agents as visible as the agents themselves.

### Should multiple agents in a pipeline each retrieve from the knowledge base independently?

Generally no. If multiple agents in a pipeline need to reason about the same set of facts, it's safer to retrieve once (typically before the first agent step) and pass the retrieved chunks as part of the shared state through the entire pipeline. Independent retrieval by each agent introduces divergent grounding: two agents may retrieve different subsets of the knowledge base and reach contradictory conclusions neither of them flags as inconsistent. Single-retrieval pipelines are also more reproducible, since the same inputs will produce the same retrieved context and therefore more consistent behavior across runs. See the [LangGraph documentation](https://python.langchain.com/docs/langgraph/) on shared state for a framework-level implementation of this pattern.

### Sources

- [LangChain — State of Agent Engineering 2026 (survey of 1,300+ practitioners)](https://www.langchain.com/state-of-agent-engineering)
- [AWS Blog — "Evaluating AI Agents: Real-world lessons from building agentic systems at Amazon," February 2026](https://aws.amazon.com/blogs/machine-learning/evaluating-ai-agents-real-world-lessons-from-building-agentic-systems-at-amazon/)
- [Zircon.tech — "Agentic Frameworks in 2026: What Actually Works in Production," February 2026](https://zircon.tech/blog/agentic-frameworks-in-2026-what-actually-works-in-production/)
- [LangGraph Documentation — Graph API, shared state, and durable execution](https://python.langchain.com/docs/langgraph/)
- [Galileo — "How to Debug AI Agents: 10 Failure Modes + Fixes," October 2025](https://galileo.ai/blog/debug-ai-agents)
- [ByteBridge — "From Human-in-the-Loop to Human-on-the-Loop: Evolving AI Agent Autonomy," January 2026](https://bytebridge.medium.com/from-human-in-the-loop-to-human-on-the-loop-evolving-ai-agent-autonomy-c0ae62c3bf91)

Designing a multi-agent pipeline and want to stress-test the seams before you hit production? Architecture review is what Supergood Solutions is for. [Get in touch](mailto:hello@supergood.solutions) and let's map out your handoff contracts before the agents find the gaps for you.

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
