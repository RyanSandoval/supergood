---
title: "Your Agent's Tool Schema Is a Security Attack Surface"
description: "Enterprises hardening agentic systems pour effort into prompt injection defenses while shipping tool definitions with no field validation, unconstrained enums…"
canonical: https://supergood.solutions/blog/your-agent-s-tool-schema-is-a-security-attack-surface/
published: 2026-07-09
last-updated: 2026-07-11
updated: 2026-07-11
---

![](/blog/your-agent-s-tool-schema-is-a-security-attack-surface/hero.svg)

SECURITY

# Your Agent's Tool Schema Is a Security Attack Surface

Published July 09, 2026 · Updated Jul 11, 2026 — 5 min read

**TL;DR:** Enterprises hardening agentic systems pour effort into prompt injection defenses while shipping tool definitions with no field validation, unconstrained enums, and invented optional parameters — giving models a second, quieter path to capability hallucination. The real governance gap isn't your system prompt; it's your JSON schema.

## Key Insight

Every security conversation about AI agents eventually lands on prompt injection. Someone references the [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/) and the room nods. Prompt injection is real and worth defending. But there's a subtler attack surface sitting right next to it that almost nobody audits: the tool schema itself.

When you register a tool with a function-calling API — OpenAI, Anthropic, Gemini, it doesn't matter — you're handing the model a description of what it *can* do. If that description is loose, the model fills in the blanks. And "filling in the blanks" on a tool that talks to your database, calls your internal API, or sends emails is not a quality problem. It's a security problem.

Here's what loose looks like in practice:

```
{
  "name": "send_customer_email",
  "description": "Send an email to a customer",
  "parameters": {
    "type": "object",
    "properties": {
      "to": { "type": "string" },
      "subject": { "type": "string" },
      "body": { "type": "string" },
      "priority": { "type": "string" }
    }
  }
}
```

Three problems in six lines. `to` accepts any string, so a hallucinated or injected email address goes through. `priority` has no enum — a model reasoning about "urgency" might invent `"URGENT"`, `"high"`, `"critical"`, or `"bypass_filter"` depending on what's in its training data or the injected context. And there are no `required` fields, which means the model can call this tool with partial parameters and your downstream handler needs to be robust enough to catch that — or it silently misbehaves.

The attack surface isn't just adversarial. The more insidious version is *accidental*: a model reasoning through a multi-step task that produces a plausible-but-wrong parameter because the schema gave it nowhere to go wrong visibly.

## Why Teams Miss This

The mental model most teams carry is that the tool schema is documentation, not policy. The description field gets written like a docstring. Parameters get added "so the model knows what's available." Nobody runs the schema through a security review because it's not code — it's configuration.

But for a language model, the schema *is* the contract. The model reads your `description` field and decides what the tool is for. It reads your `parameters` and decides what values are plausible. If you define `action` as a free-form string instead of an enum, you've just told the model that any action name it can imagine is potentially valid. A compromised prompt — or even just an unusual user input — can steer that parameter somewhere you never tested.

Research on hallucination-as-security-risk (covered extensively in [beyondscale.tech's enterprise controls guide](https://beyondscale.tech/blog/ai-hallucination-security-risk-enterprise)) documents that LLMs repeat and elaborate on false premises injected into context rather than rejecting them — in up to 83% of tested cases with planted false inputs. Tool call parameters are context. An injected value in a user message becomes a plausible parameter value if your schema doesn't constrain it.

OWASP's LLM09:2025 formally categorizes misinformation risk as a control requirement. Most teams implementing that guidance focus on output validation. They're skipping the input side: the tool schema that defines what the model thinks it's allowed to invoke — exactly the layer that [agent governance](https://supergood.solutions/ai-agent-governance/) is supposed to lock down.

## How to Actually Do It

Schema discipline is a four-step audit you should run on every registered tool before it ships to production.

**1. Lock enums on anything categorical.**

```
"priority": {
  "type": "string",
  "enum": ["low", "normal", "high"]
}
```

If a valid value set has fewer than ~20 members, enumerate them. This is the single fastest fix and eliminates the largest class of hallucinated parameter values.

**2. Add `required` explicitly and minimize it.**

Every field that must be present should be in `required`. Every field that isn't *actually* needed should be deleted. Optional fields are surface area — if the model can fill them in, it will, and you'll get values you didn't anticipate.

```
"required": ["to", "subject", "body"]
```

**3. Validate at the handler boundary, not just in the schema.**

JSON Schema tells the model what's valid. It does not guarantee what arrives at your handler. Treat every tool invocation like an external API call: parse and validate the parameters in your tool handler before executing. Reject unexpected fields with an explicit error rather than ignoring them — silent field drops hide injection attempts.

**4. Audit descriptions for capability over-claiming.**

A description that says "can send to any internal or external email address, including aliases and distribution lists" is teaching the model that distribution lists are a valid target. If you don't want the model reasoning about distribution lists, don't mention them. The description field is policy, not marketing copy.

A minimal secure version of the earlier schema:

```
{
  "name": "send_customer_email",
  "description": "Send a transactional email to a verified customer email address",
  "parameters": {
    "type": "object",
    "properties": {
      "customer_id": {
        "type": "string",
        "description": "Verified customer ID; the handler resolves email address internally"
      },
      "template": {
        "type": "string",
        "enum": ["order_confirm", "shipping_update", "return_initiated"]
      },
      "locale": {
        "type": "string",
        "enum": ["en-US", "en-GB", "fr-FR", "de-DE"]
      }
    },
    "required": ["customer_id", "template"]
  }
}
```

Note what changed: the raw `to` address is gone entirely — the handler resolves it from `customer_id`, so a manipulated email address can't be passed in. The `template` enum means the model can't invent email content. And the description scopes the tool's purpose to "transactional" and "verified," which matters because models use descriptions to reason about whether invoking a tool is appropriate.

## What We've Learned

Run a tool schema audit against your current agent stack this week — the kind of audit our [AI agent consulting](https://supergood.solutions/ai-agent-consulting/) engagements start with. Count every `"type": "string"` property without an enum, every tool with no `required` block, and every description that claims a capability you haven't deliberately scoped. Each one is a place where a model under adversarial or unexpected input can do something you didn't intend.

The prompt hardening community is right that system prompts matter. But a model with a hardened system prompt and a loose tool schema is still a model that can be steered toward unintended actions — just through the parameters instead of the instructions. Schema discipline is the other half of agent security, and it's currently skipped in most enterprise deployments.

## Frequently Asked Questions

### Why is a tool schema a security risk instead of just documentation?

Most teams write the description field like a docstring and skip it in security review because it's configuration, not code. But for a language model, the schema is the contract — it reads your description to decide what a tool is for and your parameters to decide what values are plausible. A free-form string where there should be an enum, or a missing required list, tells the model that whatever it invents is fair game on a tool that might touch your database, internal APIs, or customer emails.

### What's the fastest way to stop a model from inventing tool parameter values?

Lock enums on anything categorical. If a field's valid values number fewer than about 20, enumerate them in the schema instead of leaving it as an open string — a priority field constrained to low, normal, or high can't be filled with an invented value like bypass\_filter. It's the single fastest fix, and it eliminates the largest class of hallucinated parameter values.

### Is tool schema hardening different from prompt injection defense?

Yes — it's a separate, quieter attack surface that sits right next to it. Prompt injection gets most of the attention, usually by way of the OWASP LLM Top 10, but a model with a hardened system prompt and a loose tool schema is still steerable toward unintended actions, just through the parameters instead of the instructions. Schema discipline is the other half of agent security, and it's currently skipped in most enterprise deployments.

## Sources

- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/) — the definitive community taxonomy for LLM security risks including LLM09:2025 (misinformation/hallucination controls)
- [AI Hallucination Security Risk: Enterprise Controls Guide](https://beyondscale.tech/blog/ai-hallucination-security-risk-enterprise) — hallucination as exploitable attack surface, adversarial counterfactual prompting, multi-agent amplification
- [OpenAI Function Calling Guide](https://developers.openai.com/api/docs/guides/function-calling) — canonical reference for JSON schema tool definitions
- [LLM Structured Outputs: JSON Schema Enforcement and Tool Calling](https://eastondev.com/blog/en/posts/ai/20260506-llm-structured-output/) — production-grade schema enforcement patterns across OpenAI, Claude, and Gemini
- [McKinsey: Deploying Agentic AI with Safety and Security](https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/deploying-agentic-ai-with-safety-and-security-a-playbook-for-technology-leaders) — enterprise governance playbook for agentic systems

Need this in production?

Locking down enums and required fields stops one class of failure — it doesn't add the tool allowlists, spend limits, and approval checkpoints an agent needs around it, and most teams aren't auditing any of it. AI Agent Governance builds and reviews the whole stack, schema discipline included, so a missing enum or an over-scoped description never becomes the incident.

[See AI Agent Governance →](https://supergood.solutions/ai-agent-governance/)

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
