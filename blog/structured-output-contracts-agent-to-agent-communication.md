---
title: "Structured Output Contracts for Agent-to-Agent Communication"
description: "When two AI agents talk to each other, the interface between them is a contract — and untyped, free-form text is a bad contract."
canonical: https://supergood.solutions/blog/structured-output-contracts-agent-to-agent-communication/
published: 2026-03-24
last-updated: 2026-03-24
updated: 2026-03-24
---

![Structured Output Contracts for Agent-to-Agent Communication — two toy robots exchanging a sealed contract envelope with a wax seal, green wax.](/blog/structured-output-contracts-agent-to-agent-communication/hero.webp)

Tech Tuesday · Practical AI Tooling Patterns

# Structured Output Contracts for Agent-to-Agent Communication

Published March 24, 2026 — 13 min read

**TL;DR:** When two AI agents talk to each other, the interface between them is a contract — and untyped, free-form text is a bad contract. Structured output schemas (JSON Schema, Pydantic models, or emerging standards like Google's A2A protocol) let you enforce what data crosses agent boundaries, catch failures early, and build multi-agent systems that don't silently corrupt downstream work. This post covers the practical patterns for designing, validating, and versioning those contracts in production.

## The Problem with "Just Pass the Text"

Multi-agent systems fail at the boundary. Agent A produces a response. Agent B consumes it. If Agent A hallucinates a field, uses a different date format, or returns `null` where a string was expected, Agent B may silently continue with bad data — or crash in a way that's nearly impossible to trace back to the root cause.

Free-form text handoffs feel flexible. In practice, they shift the burden of parsing and validation to the receiving agent's prompt, which is the worst possible place for it. Prompts are soft. Schemas are hard. For anything you care about, use a schema.

This is not a theoretical concern. In production multi-agent pipelines — lead enrichment flows, content generation chains, financial data pipelines — schema violations at agent handoff boundaries are among the most common and hardest-to-debug failure modes.

## What Is a Structured Output Contract?

A structured output contract is a formally defined schema that specifies exactly what an agent must produce before its output is passed to the next stage. It's the equivalent of a typed function signature in a software API.

At minimum, a contract defines:

- **Required fields** — what must always be present
- **Types** — string, number, boolean, array, object
- **Enums** — when a field is constrained to a fixed set of values
- **Optional fields** — what may be absent (and what absence means)
- **Nullability** — whether `null` is a valid value vs. a missing field

Contracts can be expressed as:

- **JSON Schema** — the lingua franca, supported by most model APIs
- **Pydantic models** — the Python-native approach, used heavily in agent frameworks
- **TypeScript interfaces / Zod schemas** — for TypeScript-based agent stacks
- **OpenAPI-derived specs** — for agents that interact with REST APIs

## Layer 1: Model-Native Structured Outputs

The first line of enforcement is at the model API level.

**OpenAI Structured Outputs** (introduced mid-2024, now broadly available) go beyond JSON mode by guaranteeing that the model's response will *exactly* match a provided JSON Schema — not just produce valid JSON, but adhere to the schema structure. This is enforced through constrained decoding, not prompt heuristics.

```
from openai import OpenAI
import json

client = OpenAI()

schema = {
    "type": "object",
    "properties": {
        "lead_score": {"type": "number"},
        "fit_category": {"type": "string", "enum": ["hot", "warm", "cold"]},
        "next_action": {"type": "string"},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1}
    },
    "required": ["lead_score", "fit_category", "next_action", "confidence"],
    "additionalProperties": false
}

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Score this lead: ..."}],
    response_format={
        "type": "json_schema",
        "json_schema": {"name": "lead_score", "strict": True, "schema": schema}
    }
)
```

The `strict: true` flag is critical — it enables the hard schema enforcement. Without it, you get JSON mode (valid JSON, but not necessarily your schema).

For Anthropic's Claude models, structured output is available through tool use: define a tool with a JSON Schema, set `tool_choice` to force the model to call it, and the response will conform to the schema. Same result, different mechanism.

## Layer 2: Application-Level Validation with Pydantic

Model-native structured outputs handle the LLM boundary. But your application layer needs its own validation — especially when passing data between agents implemented in Python.

[Pydantic AI](https://ai.pydantic.dev/) makes this the default. You define your output as a Pydantic model, and the framework handles both schema generation (to send to the LLM) and validation (to guarantee the data is correct before it travels further):

```
from pydantic import BaseModel, Field
from pydantic_ai import Agent

class LeadScore(BaseModel):
    lead_score: float = Field(ge=0, le=100)
    fit_category: Literal["hot", "warm", "cold"]
    next_action: str
    confidence: float = Field(ge=0, le=1)

scoring_agent = Agent("openai:gpt-4o", result_type=LeadScore)
result = await scoring_agent.run("Score this lead: ...")
# result.data is a validated LeadScore — guaranteed
```

The key insight from [Ylang Labs' production guide](https://ylanglabs.com/blogs/building-reliable-llm-workflows-with-pydantic): treat `ValidationError` as a structured retry signal, not an exception to suppress. When validation fails, feed the schema error back to the model as part of a retry prompt. This turns schema violations into self-correcting loops rather than crashes.

## Layer 3: Agent Handoff Envelope Design

Beyond field-level schemas, production multi-agent systems need an **envelope** — metadata that wraps the payload and allows the receiving agent to make routing and validation decisions before inspecting the content.

A minimal handoff envelope looks like this:

```
{
  "envelope": {
    "schema_version": "1.2",
    "producer_agent": "lead-scorer-v3",
    "produced_at": "2026-03-24T12:30:00Z",
    "trace_id": "abc-123",
    "schema_id": "lead_score_output"
  },
  "payload": {
    "lead_score": 78.5,
    "fit_category": "hot",
    "next_action": "Schedule demo within 48h",
    "confidence": 0.91
  }
}
```

Why this matters in production:

- **`schema_version`** lets you run old and new schema versions side-by-side during migrations
- **`producer_agent`** enables blame attribution when something breaks downstream
- **`trace_id`** propagates the observability context through the full agent chain
- **`schema_id`** lets the receiver look up the schema registry and validate before processing

[Anthropic's multi-agent guidance](https://docs.anthropic.com/en/docs/build-with-claude/tool-use) explicitly recommends treating agent outputs as typed objects at boundaries, not raw text.

## Layer 4: The agents.json Specification

For teams building agents that interact with external APIs, the [`agents.json` specification](https://github.com/wild-card-ai/agents-json) (built on OpenAPI) provides a formal way to describe contracts for API and agent interactions. Think of it as an OpenAPI spec layer specifically designed for agentic consumption — the agent gets a machine-readable description of what it can call, what it must send, and what it will receive.

This matters as agent ecosystems grow: you can't hardcode every agent's output schema into every consumer. A spec layer lets agents discover and validate contracts at runtime.

## Layer 5: Google's A2A Protocol

[Google's Agent2Agent (A2A) protocol](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/) (released April 2025, now with an active open-source community at [github.com/a2aproject/A2A](https://github.com/a2aproject/A2A)) tackles the same problem at network scale. A2A defines a standardized message format for agents to communicate across organizational and framework boundaries.

Key A2A design decisions relevant to contracts:

- Messages are **typed parts** (text, file, structured JSON) — not blobs of untyped text
- Agents expose **Agent Cards** (a structured capability manifest) so consumers know what to expect
- The protocol is **framework-agnostic** — a LangGraph agent and a CrewAI agent can communicate via A2A without shared code

A2A is most relevant for enterprise deployments where agents span teams, vendors, or cloud accounts. For single-org, single-stack deployments, JSON Schema + Pydantic is usually sufficient.

## Schema Versioning: The Part Teams Skip

Contract design gets discussed. Contract versioning gets skipped until it bites you.

When you change an agent's output schema — adding a field, renaming one, changing a type — every downstream consumer breaks unless you manage versions. The patterns that work in production:

### Additive-only changes (preferred)

Add fields, never remove or rename them. Mark old fields as deprecated in your schema registry. This is backward compatible by definition.

### Versioned schema IDs

Use `schema_id: "lead_score_v2"` in your envelope. Consumers that only understand `v1` can reject or route to a compatibility shim.

### Schema registry

A shared store (even a Git repo with JSON Schema files) that all agents reference. When an agent is deployed, it registers its output schema. When a consumer is deployed, it validates against the registered schema. This catches breaking changes at deploy time, not at runtime.

### Canary validation

Before rolling out a new schema version, shadow-validate a sample of live traffic against both old and new schemas. This catches cases where the new schema rejects data the old one accepted.

## What Breaks Without Contracts

To make this concrete: here are the failure patterns we see most often in multi-agent systems without structured contracts.

**Silent type coercion:** Agent A returns `"78"` (a string). Agent B expects `78` (a number). Python quietly coerces it; JavaScript might not. The math downstream is wrong. No error is raised.

**Missing optional fields treated as present:** Agent A doesn't include `confidence` because it's marked optional in the prompt. Agent B's prompt assumes it's always there and uses `confidence` in its reasoning. Result: hallucinated confidence scores.

**Enum drift:** Agent A's prompt says to return `"HIGH"`, `"MEDIUM"`, or `"LOW"`. The LLM occasionally returns `"high"` (lowercase). Agent B's code does a strict string comparison. Routing fails silently.

**Cascading nulls:** One field is null in Agent A's output. Three agents downstream, that null has propagated through aggregations, been passed to a tool call, and caused an API error that looks completely unrelated to the original issue.

All of these are prevented by strict schema enforcement at the boundary.

## Practical Starting Point

If you're building a new multi-agent pipeline, here's the minimum viable contract setup:

1. **Define output schemas as Pydantic models or JSON Schema files** — not in prompts, in code
2. **Enable `strict: true`** on any OpenAI Structured Outputs call (or equivalent for your model provider)
3. **Wrap payloads in an envelope** with at minimum `schema_version`, `producer_agent`, and `trace_id`
4. **Treat `ValidationError` as a retry signal** — build a retry loop that feeds the error back to the model
5. **Store schemas in version control** — treat schema changes like code changes (PR, review, deploy)

Start simple. A 5-field Pydantic model with one retry loop will save you more debugging hours than any observability dashboard.

## FAQ

### What's the difference between JSON mode and Structured Outputs?

JSON mode guarantees the model returns valid JSON, but doesn't enforce that the JSON matches any particular schema — fields can be missing, types can be wrong, and the model can add arbitrary extra fields. Structured Outputs (with `strict: true` in OpenAI's API) enforce that the response exactly matches the provided JSON Schema, including required fields, types, and no additional properties. For agent-to-agent handoffs, only Structured Outputs provide the guarantees you actually need.

### Do I need Pydantic or can I use raw JSON Schema?

Both work. JSON Schema is the universal format and works across languages and model providers. Pydantic gives you Python-native validation, automatic JSON Schema generation from your model class, and better integration with Python agent frameworks like PydanticAI, LangGraph, and FastAPI. If you're working in Python, Pydantic is the practical choice. If you're in a polyglot environment, raw JSON Schema with a shared schema registry is more portable.

### What is the A2A protocol and when should I use it?

Google's Agent2Agent (A2A) protocol is an open standard for cross-system agent communication, designed for cases where agents from different organizations, vendors, or frameworks need to interoperate. It defines a structured message format, an agent capability manifest (Agent Card), and a transport layer. If your agents all live in the same codebase and stack, A2A is overkill — use JSON Schema + Pydantic. If you're building an agent marketplace, enterprise integration platform, or multi-vendor agent pipeline, A2A is worth evaluating.

### How do I handle schema changes without breaking downstream agents?

The safest approach is additive-only changes: add new optional fields without removing or renaming existing ones. Use a `schema_version` field in your handoff envelope so consumers can handle multiple versions. When you need a breaking change, version the schema ID (e.g., `lead_score_v1` → `lead_score_v2`), deploy consumers that understand both versions, then migrate producers and decommission the old version. Treat schema changes like database migrations — planned, versioned, and rolled back cleanly if needed.

### What's the cheapest way to add structured output contracts to an existing agent?

Start at the output boundary of your most critical agent. Define a Pydantic model for what it should return. Wrap the agent's call in a try/except that catches `ValidationError`, logs the schema error, and retries with the error in the prompt. This adds contract enforcement with minimal code change. You can expand to full envelope design and a schema registry incrementally as the system grows.

### Can I use structured output contracts with open-source models?

Yes, with caveats. Models running through Ollama, vLLM, or llama.cpp support JSON Schema-constrained decoding (via grammar-based sampling), which gives you schema enforcement similar to OpenAI's Structured Outputs. The reliability varies by model — larger models (70B+) tend to follow schemas more consistently. For production use with open-source models, add application-level Pydantic validation and a retry loop as a safety net, since constrained decoding doesn't guarantee semantic correctness, only structural conformance.

### Sources

- [OpenAI Structured Outputs Documentation](https://platform.openai.com/docs/guides/structured-outputs) — Official guide to schema enforcement in the OpenAI API
- [OpenAI Function Calling Documentation](https://platform.openai.com/docs/guides/function-calling) — Tool use patterns for structured agent outputs
- [PydanticAI Documentation](https://ai.pydantic.dev/) — Type-safe Python framework for building agents with validated outputs
- [Building Reliable LLM Workflows with Pydantic — Ylang Labs](https://ylanglabs.com/blogs/building-reliable-llm-workflows-with-pydantic) — Production patterns for Pydantic validation in LLM pipelines
- [Announcing the Agent2Agent Protocol — Google Developers Blog](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/) — Google's open protocol for cross-system agent communication
- [agents.json Specification — GitHub](https://github.com/wild-card-ai/agents-json) — OpenAPI-based formal contract spec for agent interactions
- [How JSON Prompting Supercharges Multi-Agent AI Systems — AI Competence](https://aicompetence.org/json-prompting-supercharges-multi-agent-ai-systems/) — Practical patterns for JSON-based agent communication
- [A2A Protocol GitHub Repository](https://github.com/a2aproject/A2A) — Open-source A2A protocol specification and reference implementations

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
