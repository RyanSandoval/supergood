---
title: "Testing Your Agent Output Contracts Before Production"
description: "How to test agent output schemas before they hit production — validation patterns, error handling, and why contracts beat documentation."
canonical: https://supergood.solutions/blog/tech-tuesday-testing-agent-output-contracts-2026/
published: 2026-04-14
last-updated: 2026-10-29
---

![Testing Your Agent Output Contracts Before Production — a paper airplane in a little glass wind tunnel with green smoke streaming over the wing.](/blog/tech-tuesday-testing-agent-output-contracts-2026/hero.webp)

Tech Tuesday

# Testing Your Agent Output Contracts Before Production

Published April 14, 2026 — 8 min read

How to test agent output schemas before they hit production — validation patterns, error handling, and why contracts beat documentation. JSON Schema + Pydantic + strict validation catches misalignment before agents spiral into hallucinations and failed handoffs. Make output contracts explicit, testable, and version-controlled. Your debugging time will thank you.

## Why Agents Need Output Contracts

Agents succeed when the feedback loop is tight. An agent sends a message; the next agent receives it and acts. When that handoff breaks—missing fields, wrong types, hallucinated values—the downstream agent either rejects the input, wastes compute on retries, or does the wrong thing silently.

Unlike human-to-human APIs (where clients can tolerate loose contracts), agent-to-agent communication happens fast and at scale. A single malformed response cascades: Agent A hallucinates a JSON field, Agent B fails to parse it, Agent C gets garbage input, and your whole workflow crumbles. Structured output contracts prevent this.

## Defining Output Schemas as Executable Specs

A schema isn't documentation—it's a contract you enforce. Use **JSON Schema** or **Pydantic** to define what a valid response looks like, then validate every single output before handing it off.

**Example:** An agent that summarizes documents hands its output to a classifier agent. Define this upfront:

```
{
  "type": "object",
  "properties": {
    "summary": {
      "type": "string",
      "minLength": 50,
      "maxLength": 500
    },
    "topics": {
      "type": "array",
      "items": {"type": "string"},
      "minItems": 1,
      "maxItems": 5
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    }
  },
  "required": ["summary", "topics", "confidence"]
}
```

Now any output missing these fields or with invalid types gets rejected *before* it reaches the classifier. The contract is enforceable.

## Validation Patterns That Work

**1. Inline validation with Pydantic**

Define models in code, generate schemas on the fly, and validate outputs immediately after the LLM call:

```
from pydantic import BaseModel, Field

class DocumentSummary(BaseModel):
    summary: str = Field(..., min_length=50, max_length=500)
    topics: list[str] = Field(..., min_items=1, max_items=5)
    confidence: float = Field(..., ge=0, le=1)

# After the LLM call:
response_dict = json.loads(llm_response)
validated = DocumentSummary(**response_dict)  # Fails if schema violated
```

Pydantic will raise `ValidationError` if the LLM's output doesn't match. No ambiguity.

**2. Two-tier fallback strategy**

First attempt: Structured output mode (supported by Claude, GPT-4, etc.). If the model fails, retry with stricter prompt language and in-context examples:

```
try:
    result = model.generate(prompt, response_format=DocumentSummary)
except ValidationError:
    # Fallback: retry with explicit constraints in the prompt
    result = model.generate(
        prompt + "\nRespond ONLY with valid JSON matching this schema: " + schema_json,
        temperature=0.1
    )
```

**3. Version schemas like code**

Keep schemas in version control. When you change a contract—adding required fields, narrowing value ranges—bump the version and log it:

```
# outputs/summarizer_schema.v2.json
version: "2.0"
changed_at: "2026-04-10"
breaking_changes: ["confidence field now required"]
```

Agents should check the schema version and fail loudly if they expect v1 but get v2.

## Error Handling: Strict vs. Forgiving

**Strict mode:** Validation failure = task failure. Useful for critical handoffs (payment agents, compliance workflows).

```
validated = DocumentSummary(**response_dict)  # Raises on error
```

**Forgiving mode:** Validation failure = retry loop. Useful for best-effort tasks (content generation, recommendations).

```
try:
    validated = DocumentSummary(**response_dict)
except ValidationError as e:
    # Log the error, ask the model to try again with feedback
    retry_prompt = f"Your previous output was invalid: {e}\nHere's what's required..."
    validated = retry_with_constraints(retry_prompt)
```

Pick the mode based on stakes. High-stakes operations get strict validation. Exploratory agents can tolerate retries.

## Testing Contracts Before Production

Contracts only work if you test them. Use your eval harness to:

1. **Sample outputs** from each agent over 100+ examples
2. **Validate** against the schema; measure failure rate
3. **Inspect failures** and adjust either the schema or the prompt
4. **Document edge cases** (e.g., "topics can be empty if the document is too short")

If your agent fails validation 10% of the time, your contract is either too strict or your prompt is too weak. Fix it before it hits production.

## The One Rule: Contracts > Documentation

A schema in a README is a suggestion. A schema in code is a constraint. Enforce it at runtime. The 30 seconds it takes to add validation to your handoff pays dividends when your agent workflows run reliably.

## FAQ

**Q: Doesn't structured output mode in Claude/GPT-4 handle this?**  
A: Mostly. But structured output is a soft guarantee—the model *usually* complies, but edge cases slip through. Always validate on the receiving end. Don't trust the model; trust the contract.

**Q: What if the schema is wrong and breaks valid outputs?**  
A: Test against 100+ real examples before deploying. If edge cases appear in production, bump the schema version and add an escape hatch (e.g., `nullable` fields) rather than loosening validation retroactively.

**Q: Should every agent output have a schema?**  
A: Yes, if it's handed to another agent. If it's final output to a human, strict validation is less critical (humans tolerate messy JSON). But if Agent A feeds Agent B, enforce the contract.

**Q: How do I know if my schema is too strict?**  
A: Run it against 50+ real outputs from your agent. If >5% fail validation, the schema is too strict or the prompt isn't clear. Adjust one or both.

### Sources

- [Anthropic: Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) — Best practices on agentic workflows and tool design
- [LangChain: Structured Output](https://python.langchain.com/docs/how_to/structured_output/) — Error handling and schema validation patterns
- [Pydantic: JSON Schema](https://docs.pydantic.dev/latest/concepts/json_schema/) — Generating and customizing schemas from models
- [JSON Schema Specification](https://json-schema.org/) — Reference for schema constraints and validation rules

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
