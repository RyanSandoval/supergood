---
title: "You're Fine-Tuning When You Should Be Prompting, and Vice Versa"
description: "Most enterprise teams reach for fine-tuning when domain knowledge gets specialized — but the actual decision axis isn't domain specificity, it's update…"
canonical: https://supergood.solutions/blog/you-re-fine-tuning-when-you-should-be-prompting-and-vice-versa/
published: 2026-06-26
last-updated: 2026-10-29
---

![You're Fine-Tuning When You Should Be Prompting, and Vice Versa — a heavy wrench and a green sticky note side by side next to one tiny screw.](/blog/you-re-fine-tuning-when-you-should-be-prompting-and-vice-versa/hero.webp)

Architecture

# You're Fine-Tuning When You Should Be Prompting, and Vice Versa

Published June 26, 2026 — 4 min read

**TL;DR:** Most enterprise teams reach for fine-tuning when domain knowledge gets specialized — but the actual decision axis isn't domain specificity, it's update frequency. Getting this backwards means paying retraining costs for problems that a well-structured prompt would solve in an afternoon.

## Key Insight

The mental model most teams operate on: "our use case is domain-specific, so we need to fine-tune." The correct mental model: **ask whether the thing you're trying to teach the model changes over time**.

Here's the split that actually holds up in production:

- **Fast-changing information** (product catalog, pricing, customer data, recent research, policy docs) → belongs in the context window, not the weights. This is the job for RAG, tool calls, or structured prompting. Update it by updating your retrieval layer — no retraining required.
- **Stable procedural behavior** (output format, domain-specific reasoning patterns, tone calibration, task specialization) → belongs in the weights. This is where fine-tuning earns its cost. A LoRA adapter that teaches the model to produce structured JSON extraction in your schema, or to reason like a compliance analyst, won't go stale next quarter.

Most enterprise teams have this mapping exactly backwards. They fine-tune on their proprietary knowledge base (product docs, internal wikis, last year's support tickets) — baking it into weights that are frozen the moment training ends. Then six months later, they're paying for another fine-tuning run because Q3 pricing changed. Meanwhile, they're prompt-engineering 2,000-token system prompts to try to get consistent output formatting, a problem a small LoRA would have solved once and permanently.

## Why Teams Miss This

The word "domain-specific" is doing too much work. Teams hear it and jump to fine-tuning because that's what the ML literature has historically recommended for domain adaptation. But in the LLM era, "domain-specific knowledge" and "domain-specific behavior" are different problems that demand different tools.

Knowledge is dynamic. Behavior is static (or at least, slow-moving).

The second failure mode: teams treat fine-tuning as a quality upgrade rather than a behavioral tool. "Our prompts aren't reliable enough, so we'll fine-tune." That's a reasonable instinct, but it conflates two separate problems. If your model gives inconsistent answers about your product's return policy, the fix is not fine-tuning — it's injecting the return policy into context reliably (RAG, structured prompt, tool call). If your model refuses to produce output in a specific schema even when asked explicitly and consistently, *that's* when fine-tuning earns its place.

## How to Actually Do It

Run every candidate use case through two questions before picking a tool:

**1. Will this information change in the next 6 months?**

If yes: keep it out of the weights. Build a retrieval layer (vector search, structured database lookup, API call) and inject it at inference time. Fine-tuning that data is just scheduling your own technical debt.

**2. Is the problem about *what* the model knows, or *how* it behaves?**

"What" problems (facts, current state, proprietary data) → context window.

"How" problems (consistent format, specialized reasoning style, task-specific priors) → fine-tuning.

In practice, the decision tree looks like this:

```
Is the capability I need:
  └─ A fact, policy, or piece of current information?
      → RAG / retrieval / structured prompt
  └─ A behavioral pattern (format, reasoning style, task specialization)?
      └─ Is it achievable with 1-2 clear examples in the prompt?
          → Few-shot prompting (free, instant)
      └─ Does it require consistent behavior across thousands of calls?
          → LoRA / PEFT adapter (train once, reuse everywhere)
```

One concrete example: a legal team building a contract review assistant. They fine-tuned on 10,000 past contracts thinking the model needed to "learn" their legal domain. Three months in, they're re-running fine-tuning jobs every time contract templates change. The fix is to RAG the relevant templates and clauses at query time, and use a lightweight LoRA only for the formatting and risk-flagging *style* their team wants — which doesn't change when the templates do.

Parameter-efficient methods like LoRA make the behavioral-pattern use case genuinely cheap. You're not training a new model; you're adding a small adapter on top of frozen weights. [Hugging Face's PEFT library](https://huggingface.co/docs/peft/en/index) makes this accessible without GPU clusters. The knowledge-retrieval side has its own mature tooling in [LlamaIndex](https://www.llamaindex.ai/) and [LangChain](https://www.langchain.com/). The hard part is making the classification call correctly upfront — not the implementation.

## What We've Learned

Before your team starts any fine-tuning project, do a 30-minute audit: for every piece of "domain knowledge" you planned to bake into the model, ask whether it will still be accurate in 12 months. If the answer is "probably not," you're looking at a retrieval problem, not a training problem. Reserve your fine-tuning budget for behavioral patterns — the things you want the model to *do* differently, not just *know* differently. That shift alone tends to cut retraining costs in half and produce more durable systems.

## Sources

- [Hugging Face PEFT — Fine-tuning with LoRA and QLoRA](https://huggingface.co/blog/gemma-peft)
- [Hugging Face PEFT Library documentation](https://huggingface.co/docs/peft/en/index)
- [LlamaIndex — RAG and retrieval infrastructure](https://www.llamaindex.ai/)
- [LangChain — retrieval-augmented generation tooling](https://www.langchain.com/)

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
