---
title: "Structured Outputs Won't Save You: Building a Real Validation Layer for AI Agents"
description: "JSON schema compliance is not the same as correctness. Here's how to build a three-tier validation layer — schema, semantic, and business logic — that actually catches what structured outputs miss."
canonical: https://supergood.solutions/blog/tech-tuesday-output-validation-ai-agents-2026/
published: 2026-03-10
last-updated: 2026-03-10
updated: 2026-03-10
---

![Structured Outputs Won't Save You: Building a Real Validation Layer for AI Agents — a perfect green-frosted star cookie snapped in half to reveal corrugated cardboard inside.](/blog/tech-tuesday-output-validation-ai-agents-2026/hero.webp)

Tech Tuesday · AI Tooling

# Structured Outputs Won't Save You: Building a Real Validation Layer for AI Agents

Your LLM can return perfectly valid JSON with a hallucinated email address, a negative dollar amount, and a date in 1847. Schema compliance is not correctness. Here's how to build the three-tier validation layer that actually catches what structured outputs miss.

Published March 10, 2026 — 9 min read

Every major LLM provider now offers some flavor of structured output: OpenAI's `response_format: { type: "json_schema" }`, Anthropic's forced tool-use pattern, Google Gemini's `responseSchema` parameter. The pitch is compelling — constrain the model to return valid JSON matching your schema, and parsing errors disappear.

And they do. That problem is largely solved.

But there's a subtler problem that structured outputs do nothing about: your agent can return a perfectly schema-compliant response that is completely, dangerously wrong. A lead enrichment agent might return a valid `ContactRecord` object with a phone number formatted correctly as a string — that belongs to a different person. A pricing agent might return a valid `Quote` object with all required fields — and a margin of negative 40%. A content moderation agent might correctly classify the toxicity field as `false` on text that would get your brand in a newspaper headline for the wrong reasons.

Schema compliance is syntactic correctness. What you need for production is semantic correctness — and for that, you need a validation layer that structured outputs were never designed to provide.

TL;DR

Structured outputs (OpenAI, Anthropic, Gemini) guarantee that LLM responses match a JSON schema. They do not validate semantic correctness, business logic, or domain-specific constraints. A response can be perfectly schema-valid and still be wrong in ways that corrupt your data, trigger bad decisions, or create liability.

The fix is a three-tier validation layer: **Tier 1** handles schema and type validation (structured outputs handle most of this), **Tier 2** handles semantic validation (field-level validators, format checks, range constraints, cross-field logic), and **Tier 3** handles business logic validation (domain rules, policy constraints, and human-in-the-loop thresholds).

Tools worth knowing: [Instructor](https://python.useinstructor.com/) for retry-with-feedback loops on top of structured outputs, [Guardrails AI](https://guardrailsai.com/) for a composable open-source validator pipeline, and [NVIDIA NeMo Guardrails](https://github.com/NVIDIA-NeMo/Guardrails) for programmable safety rails in conversational and agentic systems. All are model-agnostic.

The practical takeaway: add Tier 2 validators to every agent output that touches a downstream system, and define explicit Tier 3 thresholds before your agents go live — not after your first incident.

## Why Schema Compliance Is the Easy Part

When OpenAI [introduced Structured Outputs](https://openai.com/index/introducing-structured-outputs-in-the-api/) in mid-2024, they were explicit about what the feature solves: it eliminates invalid JSON and schema violations. It does not guarantee that the content of those fields is accurate, sensible, or safe to act on.

Their own documentation puts it plainly: "Structured Outputs ensures the response matches a specified JSON schema. It does not ensure the content within those fields is factually accurate."

This matters because the failure modes that actually hurt teams in production aren't parse errors. Those are loud, fast, and obvious. The dangerous failures are the ones that look correct:

- An agent that extracts company names from documents returns the correct type but occasionally conflates subsidiaries with parent companies — poisoning your CRM at low volume for weeks before anyone notices.
- A sentiment classification agent returns the correct enum values but has a systematic bias toward positive on ambiguous inputs — making your NPS reporting look better than it is.
- A data transformation agent correctly processes 99.3% of records but silently miscalculates currency conversions for edge-case locales, resulting in contract amounts that are off by a factor of 100.

None of these produce schema errors. All of them are production incidents waiting to happen.

## The Three-Tier Validation Model

Thinking about validation as three distinct tiers helps teams identify exactly which layer owns which checks — and avoid the common mistake of trying to solve Tier 3 problems with Tier 1 tooling.

| Tier | What It Checks | Who/What Enforces It | Failure Behavior |
| --- | --- | --- | --- |
| Tier 1: Schema | Valid JSON, correct types, required fields present | Structured outputs, Pydantic BaseModel parsing | Parse error → retry with corrected prompt |
| Tier 2: Semantic | Field-level correctness: format, range, cross-field consistency | Field validators, regex, range checks, Guardrails AI validators | Validation error → retry with error context, or reject + escalate |
| Tier 3: Business Logic | Domain policy: thresholds, approval gates, policy compliance | Code-level rules, human review queues, confidence scoring | Policy violation → block action, route to human, log for audit |

Most teams that adopt structured outputs nail Tier 1. Tier 2 is where the gaps appear. Tier 3 is where the liability lives.

## Tier 2 in Practice: Field-Level Semantic Validators

Semantic validation is the layer that most teams skip — and it's the layer that does the most work protecting your pipelines from quietly wrong outputs.

The right mental model: every field in your agent's output schema should have an answer to the question *"what does valid content look like?"* — not just what type it is, but what values are actually acceptable.

Some concrete examples:

- **Email fields:** Not just a string — must match RFC 5322 format, and if you're enriching records, the domain should resolve. A regex check on format plus a `dns.resolver` lookup on the domain catches hallucinated addresses before they pollute your list.
- **Monetary values:** Not just a number — must be positive, within a plausible range for your domain, and consistent with other fields (a "total" field should equal the sum of line items). Cross-field validators catch arithmetic errors that schema alone never will.
- **Date fields:** Not just a valid ISO date string — must be in the past or future depending on what it represents, must not pre-date your company's founding, must not be in a nonsensical timezone offset. LLMs hallucinate dates surprisingly often, especially for historical events.
- **Extracted text or summaries:** Must not be empty or boilerplate. A summary field that always returns "This document discusses several important topics" passes schema validation and is completely useless. A simple length check and a "boilerplate detection" heuristic catches this class of failure.

### Instructor: Retry-With-Feedback on Top of Structured Outputs

[Instructor](https://python.useinstructor.com/) (by Jason Liu, open source, Apache 2.0) is a Python library that sits on top of any LLM provider's structured output mechanism and adds two things: automatic retry when validation fails, and the ability to pass Pydantic validator errors back to the model as context for its next attempt.

This is a significant improvement over plain structured outputs. Instead of a hard parse error, you get a loop: the model returns an invalid output, your Pydantic validators catch the specific fields that are wrong, Instructor feeds those errors back as part of a follow-up prompt, and the model tries again with that context. The default `max_retries=3` covers the vast majority of fixable validation failures.

```
from pydantic import BaseModel, field_validator
import instructor
from openai import OpenAI

client = instructor.from_openai(OpenAI())

class LeadRecord(BaseModel):
    company_name: str
    contact_email: str
    annual_revenue_usd: float
    confidence_score: float

    @field_validator('annual_revenue_usd')
    @classmethod
    def revenue_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Annual revenue must be a positive number')
        return v

    @field_validator('confidence_score')
    @classmethod
    def confidence_must_be_valid(cls, v):
        if not 0.0 <= v <= 1.0:
            raise ValueError('Confidence score must be between 0 and 1')
        return v

    @field_validator('contact_email')
    @classmethod
    def email_must_look_real(cls, v):
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError(f'Invalid email format: {v}')
        return v

lead = client.chat.completions.create(
    model="gpt-4o",
    response_model=LeadRecord,
    max_retries=3,
    messages=[{"role": "user", "content": "Extract lead info from: ..."}]
)
```

When the model returns a revenue of `-50000`, Instructor catches the validator error, surfaces it back to the model in the retry prompt, and the model self-corrects. This works surprisingly well — not because the model "learns," but because the error message gives it the specific context it needs to fix the field on the next pass.

Instructor supports OpenAI, Anthropic Claude, Google Gemini, Mistral, Cohere, and most providers through a unified interface. There's also a TypeScript port for Node.js stacks.

### Guardrails AI: A Composable Validation Pipeline

[Guardrails AI](https://guardrailsai.com/) (open source, Apache 2.0 core) takes a different architectural approach: rather than wrapping the LLM call, it defines a pipeline of validators that run on both the input and the output, independently of how the LLM was called.

The core primitive is a **Guard** — a composable stack of validators drawn from [Guardrails Hub](https://hub.guardrailsai.com/), a registry of pre-built validators for common checks: PII detection, profanity filtering, topic relevance, factual grounding, SQL injection detection, and dozens more. You can also write your own validators and publish them to the hub.

What makes Guardrails AI particularly useful in multi-agent systems is that it operates as a sidecar — it doesn't care what orchestration framework you're using. You can wire it into LangChain, LlamaIndex, a custom CrewAI workflow, or raw API calls. The validation logic lives in one place and applies consistently across all agents in your system.

**Heads up on latency:** Every validator in your Guard adds processing time. PII detection with a model-based validator can add 200–400ms per call. Structure your validators to run fast checks first (regex, range) and expensive checks (model-based, external API) only on fields where they're genuinely necessary. Guardrails AI supports async validation for parallel checks.

## Tier 3: Business Logic and Human-in-the-Loop Gates

Tier 3 validation is where most teams procrastinate, because it requires decisions that feel premature — until the first incident forces them retroactively.

The core questions to answer before your agents go live:

- **What is the maximum action your agent is authorized to take autonomously?** If it can send emails, what's the maximum recipient count per run? If it can modify records, what's the maximum number of records it can change without review?
- **What confidence threshold triggers a human review queue?** If your agent returns a confidence score below 0.75, does it proceed anyway? Or does it route to a review queue?
- **What outputs are categorically blocked, regardless of confidence?** PII in a field that flows to a public-facing system. Negative dollar values in any invoice field. Competitor mentions in any customer-facing content.

These rules don't require a framework. They're code. What they require is *intentionality* — writing them down before something goes wrong, rather than reverse-engineering them from an incident. This is the same discipline behind the [interrupt pattern](/blog/tech-tuesday-interrupt-pattern-agent-design-2026/) — defining the boundaries before the agent ships, not after it finds one for you.

### NVIDIA NeMo Guardrails: Programmable Policy Rails

For teams building conversational or multi-turn agentic systems where the agent controls its own action space, [NVIDIA NeMo Guardrails](https://github.com/NVIDIA-NeMo/Guardrails) (open source) offers a more structured approach to Tier 3 policy enforcement.

NeMo Guardrails introduces a domain-specific language called Colang that lets you define explicit "rails" — rules that govern what an agent is allowed to say, what topics it can engage with, and what actions it's permitted to take. Rails run as input filters (before the LLM sees a message), dialogue flow controls (during the conversation), and output filters (before the response is returned).

The practical use case for ops teams: you can define a rail that says "this agent is not allowed to discuss pricing, contracts, or legal matters" and have it enforced at the infrastructure level — not just via prompt engineering that can be overridden by sufficiently creative inputs. NeMo's [benchmarks](https://developer.nvidia.com/nemo-guardrails) show up to 1.4× improvement in policy compliance detection versus prompt-only approaches, at roughly 500ms of added latency.

## A Practical Validation Architecture for Production Agents

Putting the three tiers together, here's what a production validation flow looks like for a document-extraction agent:

1. **Pre-call input validation:** Sanitize the input document. Check for prompt injection patterns (user-controlled text that contains instruction-like language). Strip or escape known dangerous patterns. Log the raw input for audit.
2. **Structured output + Tier 1:** Use the provider's native structured output mechanism (OpenAI JSON schema mode, Anthropic tool use) with a Pydantic model as the target type. This catches format and type errors.
3. **Tier 2 field validators:** Run field-level semantic validators via Instructor or Guardrails AI. If validation fails and the error is correctable, retry with error context (max 2–3 attempts). If validation fails after retries, route to a dead letter queue — don't silently proceed.
4. **Tier 3 policy check:** Before the output triggers any downstream action (CRM write, email send, API call), run your business logic rules. If the output violates any hard policy rule, block it. If it's in a review zone (below confidence threshold), route to the human review queue and don't proceed automatically.
5. **Audit log:** Write the full input → output → validation result chain to your observability layer. This is the data you need when something goes wrong at 3 AM.

None of this requires a specific vendor. The pattern works with any LLM provider, any orchestration framework, any deployment environment. What it requires is treating validation as a first-class system component — designed upfront, tested with known failure cases, and monitored in production — not an afterthought you add after the first bad data incident.

## The Cost Conversation

Adding validation layers costs something. Instructor retries cost additional LLM tokens. Model-based Guardrails AI validators add latency. NeMo Guardrails adds infrastructure complexity. These are real tradeoffs worth quantifying.

The framing that helps: compare validation costs to incident costs. A single bad run that corrupts 500 CRM records doesn't just cost the cleanup time — it costs the confidence of the team in the agent system, which often translates to reduced automation scope or full rollback. For most business-critical workflows, Tier 2 semantic validation adds <5% to total LLM cost and pays for itself the first time it catches something that would have been a data incident.

Start with Tier 2 validators on every output field that directly writes to a system of record. Add Tier 3 policy gates before any irreversible action. Treat both as part of the definition of "done" for an agent, not optional polish to add later. Our [agent ops runbook](/blog/systems-sunday-agent-ops-runbook/) includes validation checkpoints alongside the rest of the pre-ship checklist.

Structured outputs are a great foundation. A real validation layer is what makes agents production-ready.

## Frequently Asked Questions

### What's the difference between structured outputs and output validation for AI agents?

Structured outputs — offered by providers like OpenAI (`response_format: json_schema`), Anthropic (forced tool use), and Google Gemini (`responseSchema`) — guarantee that an LLM's response conforms to a JSON schema. They ensure correct types and required fields, but they make no guarantees about the semantic correctness of the values. Output validation (using tools like Instructor, Guardrails AI, or custom Pydantic validators) adds a second layer: checking that values are actually valid for your domain — correct formats, plausible ranges, consistent cross-field logic, and compliance with business rules.

### What is Instructor and how does it improve LLM structured output reliability?

[Instructor](https://python.useinstructor.com/) is an open-source Python library (Apache 2.0) that wraps LLM provider APIs and adds automatic retry with validation-error feedback when a Pydantic model fails to validate. Instead of a hard failure when a field doesn't pass validation, Instructor feeds the specific error message back to the model and requests a corrected response — typically resolving in 1–2 retries for fixable errors. It supports OpenAI, Anthropic, Gemini, Mistral, and most major providers through a unified API surface.

### What does Guardrails AI validate that JSON schema validation doesn't?

[Guardrails AI](https://guardrailsai.com/) provides a composable pipeline of semantic validators that operate beyond schema compliance. The [Guardrails Hub](https://hub.guardrailsai.com/) includes pre-built validators for PII detection (using Microsoft Presidio), profanity filtering, SQL injection detection, topic relevance scoring, hallucination detection, and more. These validators can be combined into a Guard and applied to both input and output independently of how the LLM was called — making it compatible with any orchestration framework or provider. The core library is Apache 2.0 open source and self-hostable.

### When should I use NVIDIA NeMo Guardrails vs. Guardrails AI?

They solve different problems. [NVIDIA NeMo Guardrails](https://github.com/NVIDIA-NeMo/Guardrails) is designed for *policy and dialogue control* in conversational and multi-turn agentic systems — using the Colang DSL to define explicit rules about what an agent is allowed to say or do, enforced at the infrastructure level rather than via prompt engineering. Guardrails AI is designed for *output content validation* — checking specific fields for specific validator criteria (PII, format, safety, accuracy). In practice, many production systems use both: NeMo for high-level policy rails, Guardrails AI for field-level semantic validation of structured outputs.

### How do you handle agent validation failures without disrupting the whole pipeline?

The key distinction is between *retryable* failures (Tier 2 semantic errors that the model can correct with feedback) and *hard failures* (Tier 3 policy violations that should never proceed automatically). Retryable failures should trigger an Instructor-style retry loop with error context, capped at 2–3 attempts. Hard failures should route to a dead letter queue for human review — never silently proceed or silently fail. This pattern, combined with idempotent agent actions, means validation failures add latency and cost but don't corrupt downstream systems. See also: [When Agents Fail: Retry Logic, Circuit Breakers, and Dead Letter Queues](https://supergood.solutions/blog/systems-sunday-agent-failure-recovery-2026/).

### Does adding validation layers significantly increase LLM costs?

Tier 1 validation (schema enforcement via structured outputs) adds negligible cost. Tier 2 semantic validation via Pydantic field validators adds no LLM cost — these are local code checks. Instructor retries add tokens only when validation fails, which in well-designed schemas is a small percentage of calls. The expensive layer is model-based Guardrails AI validators (e.g., hallucination detection using an LLM judge), which can add 200–600ms of latency and secondary LLM costs. Apply those selectively — on high-stakes fields only — and your total validation overhead typically stays under 5–8% of base LLM cost for most production workloads.

### Sources:

- [OpenAI — Introducing Structured Outputs in the API](https://openai.com/index/introducing-structured-outputs-in-the-api/)
- [Instructor — Multi-Language Library for Structured LLM Outputs](https://python.useinstructor.com/)
- [Instructor — GitHub (567-labs/instructor)](https://github.com/567-labs/instructor)
- [Guardrails AI — Framework for Production GenAI](https://guardrailsai.com/)
- [Guardrails Hub — Validator Registry](https://hub.guardrailsai.com/)
- [NVIDIA NeMo Guardrails — GitHub](https://github.com/NVIDIA-NeMo/Guardrails)
- [NVIDIA NeMo Guardrails — Developer Overview](https://developer.nvidia.com/nemo-guardrails)
- [Pydantic — Using Pydantic for LLM Validation](https://pydantic.dev/articles/llm-intro)
- [Structured Output Comparison Across LLM Providers (Medium)](https://medium.com/@rosgluk/structured-output-comparison-across-popular-llm-providers-openai-gemini-anthropic-mistral-and-1a5d42fa612a)
- [StackAI — How to Design AI Agent Guardrails](https://www.stackai.com/insights/how-to-design-ai-agent-guardrails-best-practices-for-input-validation-output-filtering-and-safety-controls)

Running agents in production and wondering if your validation layer is actually solid? [Let's do a quick audit](mailto:ryan@supergood.solutions) — most teams find 2–3 high-risk gaps in under an hour.

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
