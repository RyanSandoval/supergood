---
title: "Context Engineering: The Art of Deciding What Your Agent Actually Needs to Know"
description: "A bigger context window doesn't fix bad context management. Here's the emerging discipline of context engineering — compression strategies, selective injection, multi-agent handoffs, and a production checklist."
canonical: https://supergood.solutions/blog/ai-wednesday-context-engineering-2026/
published: 2026-03-04
last-updated: 2026-10-29
---

![Context Engineering: The Art of Deciding What Your Agent Actually Needs to Know — a backpack being packed with only a few carefully chosen green-tagged items while a huge pile of unneeded stuff sits beside it.](/blog/ai-wednesday-context-engineering-2026/hero.webp)

AI Wednesday · AI Tooling

# Context Engineering: The Art of Deciding What Your Agent Actually Needs to Know

A bigger context window doesn't fix bad context management. Here's the emerging discipline — compression strategies, selective injection, multi-agent handoffs, and the production checklist that keeps your agents sharp instead of confused.

Published March 4, 2026 — 10 min read

**TL;DR:** A bigger context window doesn't fix bad context management — it just lets the problem scale further before it breaks. Context engineering is the discipline of deliberately deciding what enters an agent's context window at runtime, combining techniques like RAG, prompt compression, selective injection, semantic chunking, and hierarchical summarization. The rule of thumb: treat the context window like a whiteboard, not a filing cabinet — only what the agent needs for the current task belongs on it.

There's a failure mode that almost every team hits around six weeks into running a production AI agent. The agent starts out sharp, fast, and surprisingly useful. Then, over time, it gets worse. Slower. More likely to repeat itself, miss the obvious, or confidently answer a question it should know is stale.

Nine times out of ten, the root cause isn't the model. It's the context.

Specifically: teams added information to the context window without a plan for removing it, compressing it, or deciding whether it belonged there in the first place. The model isn't getting dumber — it's getting overwhelmed. Buried under accumulated session history, verbose tool outputs, duplicate retrieved documents, and a system prompt that grew from 200 tokens to 4,000 tokens over three sprints.

This is the problem that **context engineering** is trying to solve. And in early 2026, it's becoming one of the most actively discussed disciplines in production AI development — because bigger context windows, it turns out, don't fix bad context management. They just let the problem scale further before it breaks.

TL;DR

- Context engineering is the practice of deliberately deciding what information enters an LLM's context window — not just storing it, but shaping it at runtime for relevance, density, and cost efficiency.
- The naive "append everything" approach fails under three compounding pressures: cost and latency spirals, signal degradation (the "lost in the middle" problem), and physical token limits that even 200K-token windows can't outrun at scale.
- Five core techniques address the problem: RAG for retrieval, prompt compression, selective context injection, semantic chunking, and hierarchical summarization. Production systems combine all five.
- Multi-agent systems introduce a new wrinkle: context handoff — how much of a parent agent's working memory should flow to a sub-agent, and in what form. This is now a first-class design decision in frameworks like Google ADK.
- The practical starting point: treat your context window like a whiteboard, not a filing cabinet. Only the stuff you actively need for the current task should be on it.

## Why "just use a bigger context window" is a trap

The standard response to context management problems is to reach for a model with a larger context window. GPT-4o at 128K tokens. Claude at 200K. Gemini Pro at 1M. Surely if we just give the agent enough space, the problem goes away?

It doesn't — and [Google's engineering team put it plainly](https://developers.googleblog.com/architecting-efficient-context-aware-multi-agent-framework-for-production/) in their Agent Development Kit architecture documentation: "Simply giving agents more space to paste text cannot be the single scaling strategy." There are three compounding pressures that make the "big window" approach untenable in production:

### 1. Cost and latency spirals

Model cost and time-to-first-token grow roughly linearly (sometimes super-linearly) with context size. "Shoveling" raw conversation history, verbose tool outputs, and uncompressed document retrievals into the window makes agents slow and expensive — fast. An agent running 100 requests per day at 80K tokens per request is burning through a very different budget than one at 8K tokens. The economics flip against you quickly.

### 2. Signal degradation

Larger doesn't mean better. [The "lost in the middle" research](https://arxiv.org/abs/2307.03172) (Liu et al., 2023) demonstrated that LLM retrieval accuracy drops significantly for information positioned in the center of very long contexts. Models are better at attending to the beginning and end of their context window than the middle — which means a bloated context doesn't just cost more, it actively makes answers worse. A context flooded with stale tool outputs, deprecated state, and irrelevant session history distracts the model from the current instruction.

### 3. Real-world workloads hit physical limits anyway

In long-running agents — the kind doing complex research, multi-step data processing, or extended user conversations — [Factory.ai's research](https://factory.ai/news/evaluating-compression) found that sessions can generate millions of tokens of conversation history. No context window is big enough for that. At some point, every production agent has to decide what to keep and what to compress or discard. The question is whether that decision is intentional or left to truncation by default.

**The real failure mode:** Naïve truncation — cutting context when it overflows the window, from the oldest entries forward — is the worst possible strategy. It discards initialization context, user preferences, and the reasoning that led to current decisions, while keeping verbose intermediate steps that are no longer relevant. If this is your current approach, you're losing the most valuable information first — a [readiness assessment](https://supergood.solutions/ai-readiness-assessment/) is a fast way to find out where you stand.

## What context engineering actually is

Context engineering is the practice of treating the context window as a *managed resource*, not an append-only log. Google's ADK team defines it as "treating context as a first-class system with its own architecture, lifecycle, and constraints."

That's a useful framing. It means context has a design, just like your database schema or your API surface. You decide what goes in, when it goes in, in what form, and when it gets replaced, compressed, or removed.

In practice, context engineering involves five core techniques — and production systems almost always need a combination of all five:

Technique 1

### Retrieval-Augmented Generation (RAG) for Fresh, Relevant Knowledge

Instead of stuffing your entire knowledge base into the system prompt, retrieve only what's relevant to the current query at runtime. RAG is now table stakes for any production agent that needs grounded answers — but execution quality varies enormously.

- **Hybrid retrieval outperforms pure vector search** on exact-match and keyword-heavy queries. Combining vector embeddings with BM25 keyword matching catches what each misses alone.
- **Agentic RAG** — where the agent decides whether to retrieve, what query to run, and whether to retrieve again — consistently outperforms naive "always retrieve once" patterns. The agent treats retrieval as a tool, not a mandatory preprocessing step.
- **Chunk size matters**: smaller chunks (256–512 tokens) improve precision; larger chunks (1K–2K) improve context coherence. The right answer depends on your content type. Most teams start with 512 and tune from there.

Technique 2

### Prompt Compression

Prompt compression reduces the token count of content before it enters the context window — without losing the information that matters. This is distinct from summarization (which rewrites content) and from truncation (which deletes it).

The practical approach: remove filler language, collapse verbose tool outputs to their essential facts, and use structured formats (JSON, bullet lists) instead of prose wherever the model doesn't need natural language reasoning over the content.

- Tool call results are a major compression target. A raw API response that returns 3,000 tokens of JSON often contains 50 tokens of information the agent actually needs. Extract and format those 50 tokens.
- System prompts tend to grow unbounded. Audit yours. Every sentence should earn its token cost — if you've added instructions that haven't changed agent behavior in 30 days, cut them.
- Libraries like [LLMLingua](https://github.com/microsoft/LLMLingua) (Microsoft Research) offer automated prompt compression that can reduce prompt length by 2–5x with minimal performance degradation on many tasks — worth evaluating before hand-engineering compression logic.

Technique 3

### Selective Context Injection

Not everything your agent *could* know needs to be in context right now. Selective injection means loading context conditionally based on the current task, the current step in a workflow, or the current user's profile — rather than always loading the same full context.

This is especially powerful in multi-step agent workflows, where early steps need different context than later ones. A research step needs broad retrieval context; a writing step needs a focused brief and style guide; a review step needs the output and the rubric. Different step, different context load.

- Implement context "slots" or structured sections in your system prompt: one slot for user preferences, one for task context, one for current working data. Load each slot independently, and only when needed for the current step.
- In multi-agent systems: sub-agents shouldn't receive the full parent context by default. Only pass what the sub-agent needs to complete its scoped task. Google ADK's `include_contents` handoff control is one example of this pattern made explicit in a framework.

Technique 4

### Semantic Chunking for Document Preprocessing

When your agent works with documents — reports, contracts, knowledge base articles — how you chunk them before embedding and retrieval determines what the agent actually sees. Fixed-size chunking (every 512 tokens, regardless of content) breaks semantic units apart. Semantic chunking splits at natural boundaries: paragraphs, sections, logical units.

The quality difference in retrieval between fixed-size and semantic chunking is substantial for structured content. A contract clause split mid-sentence across two chunks loses its legal meaning. A section header separated from its body is noise.

- Use document structure when available: HTML heading tags, Markdown headings, PDF section metadata, JSON schema boundaries.
- For unstructured prose, sentence-level embedding similarity (splitting when cosine distance spikes) outperforms fixed-size chunking on most retrieval benchmarks.
- Always include metadata with each chunk: source URL, last-updated timestamp, section header. That metadata filters retrieval and tells the model how to weight what it's reading.

Technique 5

### Hierarchical Summarization for Conversation History

This is the most impactful technique for long-running agents — and the one most teams implement last, usually after a production incident.

Rather than keeping a full verbatim transcript of a long agent session, hierarchical summarization compresses older conversation segments into structured summaries while preserving the full recent context. The right optimization target, as [Factory.ai's compression research](https://factory.ai/news/evaluating-compression) found, is *tokens per task* — not tokens per request. A well-structured summary that lets the agent avoid re-reading files and re-exploring dead ends is worth more than raw transcript fidelity.

- **The "3-2-1" pattern**: Keep the first 2 turns verbatim (initialization context matters), keep the last 5–10 turns verbatim (recency matters), and compress everything in the middle into a structured summary. This is the same pattern Anthropic uses in Claude's extended thinking sessions.
- Structured summaries — explicit sections for "files modified," "decisions made," "approaches tried," "current goal" — dramatically outperform free-form prose summaries for agent continuation tasks, per Factory.ai's probe-based evaluation framework.
- Test your compression strategy with probes: after compression, ask the agent "which files have we modified?" or "what approach did we already try?" If it can't answer, your summary isn't capturing the right information.

## The multi-agent context handoff problem

If you're running multi-agent pipelines — and increasingly, production teams are — context engineering gets more complex, which is where most [AI agent consulting](https://supergood.solutions/ai-agent-consulting/) engagements start. When a root agent hands off a task to a sub-agent, a new question arises: how much context should travel with the handoff?

Too little, and the sub-agent lacks the background it needs to do its job. Too much, and you're paying to send context the sub-agent will never use, while also risking that it gets confused by irrelevant parent-level state.

[Google's ADK architecture guidance](https://developers.googleblog.com/architecting-efficient-context-aware-multi-agent-framework-for-production/) describes this as a first-class design decision: their framework exposes an `include_contents` parameter on sub-agent handoffs that controls how much of the parent's working context flows down. The three modes — full context, summary only, or no inherited context — map to different task types:

- **Full context**: Use when the sub-agent's task is deeply dependent on understanding what the parent already did. Code review agents need the full diff context. Debugging agents need the full trace.
- **Structured summary**: Use when the sub-agent needs task framing but not full history. A writing sub-agent might need "we've decided to target CMOs with a focus on cost reduction" — not the 40-turn conversation that produced that conclusion.
- **Clean slate**: Use when the sub-agent's task is genuinely independent. A web search sub-agent doesn't need to know the parent's previous session history to run a query.

The principle: **design your context handoff like an API contract**. Define what the sub-agent needs, pass exactly that, and treat everything else as out of scope.

## Context engineering in practice: what production teams actually do

Across teams shipping agents at scale in early 2026, a few consistent patterns have emerged:

### Context budgeting

Teams that run agents cost-effectively treat the context window like a budget: the system prompt gets a fixed allocation, user context gets a fixed allocation, retrieved content gets a cap, and conversation history is whatever is left. When a section wants more than its allocation, it compresses — it doesn't push everything else out.

Concretely: a 32K token context window might be budgeted as 4K system prompt, 2K user profile, 8K retrieval, 16K conversation history (with compression kicking in when history exceeds that cap). These numbers are team-specific, but the discipline of having them matters enormously.

### Context tracing

You cannot improve what you cannot see. Production context engineering requires logging: not just "how many tokens did we use" but "which sections consumed what, and was what we retrieved actually useful?" Tools like [AgentOps](https://www.agentops.ai), [Langfuse](https://www.langfuse.com), and [LangSmith](https://docs.smith.langchain.com) all offer context-level tracing. If you're not running one of them (or equivalent custom logging), you're flying blind.

### The whiteboard mental model

The most useful framing for context engineering: treat the context window like a whiteboard. Only the stuff you actively need for the current task should be on it. When a task step is complete, wipe the parts that are no longer relevant. When you move to a new phase, set up the whiteboard for that phase. The whiteboard is not permanent storage — that's what your memory layer and external databases are for. ([We covered the full three-layer memory architecture last week](/blog/ai-wednesday-agent-memory-architecture-2026/) if you want the storage side of the equation.)

### Context Engineering Production Checklist

- Audit your system prompt — every instruction should earn its token cost; set a hard cap (e.g., 4K tokens) and stick to it
- Implement hybrid retrieval (vector + BM25 keyword) — pure vector search fails on exact-match and specific-term queries
- Add a last-updated timestamp to every chunk and filter retrievals by freshness — stale content is noise with confidence
- Compress tool call results before injecting them — extract the signal, discard the raw API response verbosity
- Implement the 3-2-1 pattern for conversation history: first 2 turns verbatim, last 5–10 verbatim, everything in between as a structured summary
- Use structured summaries (not prose) when compressing history — include explicit sections for decisions made, files/resources modified, approaches tried, and current goal
- Test your compression with probes: after compression, ask the agent task-completion questions and verify the answers are still correct
- Define context budgets per section (system prompt, user context, retrieval, history) and enforce them at the framework level — not via ad-hoc trimming
- Design multi-agent handoffs explicitly: for each sub-agent, specify whether it gets full parent context, a structured summary, or a clean slate
- Log token consumption per section per request from day one — this is the only way to identify your biggest cost and quality levers

## Where this is heading

Context engineering is still a young discipline, and most of the tooling is either hand-rolled or early-stage. But the problem it addresses — the gap between "technically possible" and "reliably useful" in production AI — is real and immediate.

The teams doing this well aren't necessarily the ones with the most capable models. They're the ones who treat context as infrastructure: designed, budgeted, traced, and continuously improved. The ones who ask "what should the agent know right now?" instead of "what can we fit in the window?"

That discipline — applying engineering rigor to something that feels soft and subjective — is what separates the demos from the products.

## Frequently Asked Questions

### What is context engineering in AI agents?

Context engineering is the practice of deliberately managing what information flows into an LLM's context window at runtime — rather than treating the context window as an append-only log. It includes techniques like prompt compression, selective context injection, retrieval-augmented generation, semantic chunking, and hierarchical summarization. The goal is to maximize the signal-to-noise ratio in what the model actually reads, which improves both answer quality and cost efficiency. For a deeper dive, see [Google's ADK context engineering writeup](https://developers.googleblog.com/architecting-efficient-context-aware-multi-agent-framework-for-production/).

### Why does a bigger context window not solve context management problems?

Larger context windows allow more information to fit, but they don't fix the underlying problems: cost grows with context size, model attention quality degrades for content buried in the middle of long contexts (the ["lost in the middle" effect](https://arxiv.org/abs/2307.03172)), and real-world long-running agent sessions can generate millions of tokens that exceed even the largest windows. The right answer is intentional context management — treating what goes in the window as a design decision, not a default accumulation.

### What is the best strategy for managing conversation history in a long-running AI agent?

The most effective strategy is hierarchical summarization with the "3-2-1" pattern: keep the first 2 turns verbatim (initialization matters), keep the last 5–10 turns verbatim (recency matters), and compress everything in the middle into a structured summary with explicit sections for decisions made, resources modified, and approaches already tried. [Factory.ai's research](https://factory.ai/news/evaluating-compression) found that structured summaries significantly outperform free-form prose summaries for agent task continuation — the agent retains the ability to answer "what have we already done?" far more reliably.

### How does context handoff work in multi-agent AI systems?

In multi-agent systems, context handoff refers to how much of a parent agent's working context flows to a sub-agent when a task is delegated. The best practice is to treat it as an explicit API contract: define what the sub-agent needs (full context, structured summary, or clean slate), and pass exactly that. Frameworks like [Google ADK](https://github.com/google/adk-python) expose handoff controls that make this decision explicit. The goal is to give sub-agents enough context to work effectively without loading them with irrelevant parent-level history that wastes tokens and can cause confusion.

### What tools exist for context tracing and observability in AI agents?

Several observability tools now support context-level tracing for AI agents, including [AgentOps](https://www.agentops.ai), [Langfuse](https://www.langfuse.com), and [LangSmith](https://docs.smith.langchain.com). These tools log which sections of context were loaded, how many tokens each consumed, what was retrieved and whether it was actually used, and how costs break down per request. This kind of visibility is the prerequisite for any meaningful context optimization — you can't improve what you can't measure.

### What is the difference between context engineering and prompt engineering?

Prompt engineering focuses on the wording and structure of instructions given to a model — how to phrase a task, what format to request, which examples to include. Context engineering is broader: it's the discipline of managing everything that enters the context window, including retrieved documents, conversation history, tool outputs, user profiles, and the prompts themselves. Prompt engineering is a component of context engineering — but context engineering also covers retrieval strategy, compression, memory architecture, and handoff design. As agents become more complex, context engineering is becoming the more consequential discipline.

### Sources:

- [Architecting Efficient Context-Aware Multi-Agent Framework for Production — Google Developers Blog (December 2025)](https://developers.googleblog.com/architecting-efficient-context-aware-multi-agent-framework-for-production/)
- [Evaluating Context Compression for AI Agents — Factory.ai Research (December 2025)](https://factory.ai/news/evaluating-compression)
- [Context is AI Coding's Real Bottleneck in 2026 — The New Stack (January 2026)](https://thenewstack.io/context-is-ai-codings-real-bottleneck-in-2026/)
- [Context Window Management: Strategies for Long-Context AI Agents — Maxim AI (November 2025)](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/)
- [Lost in the Middle: How Language Models Use Long Contexts — arXiv, Liu et al. (2023)](https://arxiv.org/abs/2307.03172)
- [5 AI Context Window Optimization Techniques — Airbyte](https://airbyte.com/agentic-data/ai-context-window-optimization-techniques)
- [LLMLingua: Prompt Compression for LLMs — Microsoft Research, GitHub](https://github.com/microsoft/LLMLingua)
- [Google Agent Development Kit (ADK) — GitHub](https://github.com/google/adk-python)

Running AI agents in production and hitting context-related bottlenecks? [Supergood Solutions](https://supergood.solutions) helps marketing and ops teams build agents that stay sharp at scale — not just in the demo. Let's talk.

Need this in production?

Most context bugs don't surface in a demo — they surface six weeks in, exactly like the failure mode this post opens with. We help teams turn context budgeting, compression, and multi-agent handoff design into production discipline instead of ad-hoc fixes.

[See AI Agent Consulting →](https://supergood.solutions/ai-agent-consulting/)

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
