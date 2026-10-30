---
title: "Your Prompt Isn't the Problem. Your Tools Are."
description: "Enterprise teams invest weeks refining system prompts while their agent tools ship with two-line docstrings and undefined edge cases. Anthropic's own engineers"
canonical: https://supergood.solutions/blog/your-prompt-isn-t-the-problem-your-tools-are/
published: 2026-05-17
last-updated: 2026-10-29
---

Deep Dive

# Your Prompt Isn't the Problem. Your Tools Are.

Published May 17, 2026 — 3 min read

**TL;DR:** Enterprise teams invest weeks refining system prompts while their agent tools ship with two-line docstrings and undefined edge cases. Anthropic's own engineers found they spent \*more\* time on tool design than on the overall prompt — and that gap is where most production failures actually live.

## Key Insight

Everyone treats the system prompt as the product. But for agents, the real interface is the tool layer — what the model can call, how parameters are named, what the function contract looks like when something goes wrong.

Here's the uncomfortable math: a vague tool spec doesn't just return a bad result. It sends the agent down a reasoning path built on a false premise, and by the time it surfaces an answer, the failure is three hops back in a chain you're not logging clearly enough to trace.

Anthropic calls this the ACI problem — **agent-computer interface**. It's the gap between "this tool technically works" and "this tool is legible to an LLM reasoning about what to do next." Most teams close the first gap and forget the second exists.

## Why Teams Miss This

The mental model is wrong from the start. Teams think of tools as plumbing — utilities the agent calls when it needs data. So they're designed like internal APIs: terse names, developer-readable docs, assume the caller knows the domain.

LLMs aren't developers. They're pattern-matching on your parameter names, your descriptions, and your example values to infer the contract. When you name a parameter `ts` instead of `timestamp\_utc\_iso8601`, the model has to guess. When your tool silently returns an empty array for an invalid query instead of a descriptive error, the model assumes the answer is "nothing exists" rather than "the query was malformed."

Common failure signatures in production:

- **Silent wrong inputs**: Model passes a date as `MM/DD/YYYY` when the API expects `YYYY-MM-DD`. Tool returns 400, agent retries with the same format, eventually hallucinates a fallback.
- **Ambiguous overlap**: Two tools with similar names and overlapping functionality. Model picks the wrong one 30% of the time. You notice when outputs randomly degrade.
- **Missing error semantics**: Tool throws an exception that becomes a generic "tool call failed" in the agent loop. Model has no idea whether to retry, reroute, or abort.

## How to Actually Do It

**1. Name parameters for an LLM, not a developer**

def get\_records(id, ts, fmt="json"):

...

def get\_customer\_records(

customer\_id: str, # UUID from the CRM system

since\_date\_utc: str, # ISO 8601 format: "2026-01-15T00:00:00Z"

output\_format: str = "json" # Options: "json" | "csv" | "summary"

) -> dict:

"""

Returns transaction records for a customer since a given date.

Returns an empty list if no records exist. Raises ValueError with

a descriptive message if customer\_id is not found.

"""

The docstring isn't for your team. It's the model's only window into what this function does and when to use it.

**2. Make errors informative, not silent**

except Exception:

return {"result": [], "error": True}

except CustomerNotFoundError:

raise ValueError(f"Customer '{customer\_id}' not found in CRM. "

f"Verify the ID is a valid UUID before retrying.")

except DateParseError:

raise ValueError(f"Could not parse since\_date\_utc='{since\_date\_utc}'. "

f"Expected ISO 8601 format, e.g. '2026-01-15T00:00:00Z'.")

The agent reads error messages and adjusts. Give it something to work with.

**3. Eliminate ambiguous overlap**

If you have `search\_products` and `find\_products` doing slightly different things, merge them or rename until the distinction is obvious from the name alone. When in doubt: fewer, broader tools with clear boundaries beat many narrow tools with fuzzy edges.

**4. Test your tools against LLM reasoning, not unit tests**

Write a short eval: give the model a description of the task and the tool list. Ask it to explain which tool it would use and why. If it hesitates, guesses wrong, or hedges — your tool spec is the problem, not the model.

## What We've Learned

Before your next agent sprint: do a tool audit. For every tool in your agent's toolkit, ask: *Could a smart non-technical person read this docstring and know exactly when to use it, what inputs are valid, and what a failure looks like?*

If the answer is no for any tool, fix that before touching the system prompt. You'll find more leverage there in an hour than in a week of prompt iteration.

## Sources

- Anthropic Engineering: [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) — source for ACI concept, tool-first investment finding, and SWE-bench tooling observations
- OpenAI Function Calling Best Practices: [Platform Docs](https://platform.openai.com/docs/guides/function-calling) — parameter naming conventions and tool contract design

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
