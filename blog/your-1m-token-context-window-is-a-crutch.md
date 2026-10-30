---
title: "Your 1M Token Context Window Is a Crutch"
description: "Every model vendor is racing to sell you a bigger context window — and most enterprise teams are using it as a substitute for building real retrieval systems. T"
canonical: https://supergood.solutions/blog/your-1m-token-context-window-is-a-crutch/
published: 2026-05-01
last-updated: 2026-10-29
---

![Your 1M Token Context Window Is a Crutch — a toy robot leaning on a crutch made of an endlessly unrolled paper scroll with a green rubber tip.](/blog/your-1m-token-context-window-is-a-crutch/hero.webp)

Enterprise AI

# Your 1M Token Context Window Is a Crutch

Published May 01, 2026 — 3 min read

**TL;DR:** Every model vendor is racing to sell you a bigger context window — and most enterprise teams are using it as a substitute for building real retrieval systems. That's slow, expensive, and fragile at scale.

## Key Insight

The AI industry has successfully convinced teams that "just fit everything in context" is a strategy. It's not — it's a prototype. When Gemini 2.5 Pro, Claude, and GPT-4.1 all advertise million-token windows, the implicit message is: retrieval is a solved problem, just dump your docs in. But in production, long-context retrieval degrades. Studies show LLMs perform significantly worse on relevant facts buried in the middle of long contexts (the "lost in the middle" problem, documented by Liu et al.). Worse, at enterprise scale, stuffing 500k tokens into every request costs 50–200x more per call than a well-tuned RAG pipeline.

The contrarian take: **context window size is a benchmarking metric, not an architecture.**

## Why Teams Miss This

Three failure modes:

1. **Prototype-to-production blindness.** A dev stuffs an entire codebase into context, it works in testing, they ship it. At 10,000 daily users, the inference bill is catastrophic.

2. **Retrieval is "too hard."** RAG has a reputation for complexity — chunking strategies, embedding models, reranking. Teams skip it and reach for the big context window as an easier button.

3. **Benchmark confusion.** "Our model supports 1M tokens" gets conflated with "our model performs well at 1M tokens." Supported ≠ performant.

## How to Actually Do It

**Step 1: Classify your use case**

- Static, small knowledge base (<50 pages, rarely updated) → full context is fine
- Dynamic, large, or frequently updated corpus → you need retrieval, no exceptions

**Step 2: Implement a hybrid retrieval layer**

from llama\_index.core import VectorStoreIndex, SimpleDirectoryReader

from llama\_index.retrievers.bm25 import BM25Retriever

from llama\_index.core.retrievers import QueryFusionRetriever

vector\_index = VectorStoreIndex.from\_documents(docs)

vector\_retriever = vector\_index.as\_retriever(similarity\_top\_k=5)

bm25\_retriever = BM25Retriever.from\_defaults(docstore=vector\_index.docstore, similarity\_top\_k=5)

retriever = QueryFusionRetriever(

[vector\_retriever, bm25\_retriever],

similarity\_top\_k=5,

num\_queries=1,

mode="reciprocal\_rerank",

)

**Step 3: Set a context budget**

Hard-cap your retrieved context to 8–16k tokens. Measure answer quality. You'll likely find it matches or beats full-document stuffing — at 10–50x lower cost.

**Step 4: Rerank before you stuff**

Add a cross-encoder reranker (Cohere Rerank, `ms-marco-MiniLM`) as a second pass. It takes your top-20 retrieved chunks and scores them against the query. This alone typically recovers 5–15% accuracy on enterprise knowledge tasks.

## What We've Learned

Run a cost audit on your top 3 AI features. Calculate avg tokens per request × daily call volume × $/1k tokens. If any feature exceeds $0.05/user/day, it's a retrieval architecture problem, not a model problem. Fix retrieval before you upgrade models.

**Next experiment:** Take your worst-performing long-context use case, implement hybrid retrieval with a 12k token cap, run 50 queries side-by-side. Report back.

## Sources

- Liu et al. (2023), "Lost in the Middle: How Language Models Use Long Contexts" — https://arxiv.org/abs/2307.03172
- Anthropic docs on prompt caching and context efficiency — https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- LlamaIndex hybrid retrieval docs — https://docs.llamaindex.ai/en/stable/examples/retrievers/reciprocal\_rerank\_fusion/
- Cohere Rerank API — https://docs.cohere.com/docs/rerank-overview
- OpenAI "needle in a haystack" performance analysis — various community benchmarks (GPT-4.1, April 2025)

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
