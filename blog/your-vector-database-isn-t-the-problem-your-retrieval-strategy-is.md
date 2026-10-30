---
title: "Your Vector Database Isn't the Problem — Your Retrieval Strategy Is"
description: "Pure vector search is the default for enterprise RAG, and it's the wrong default. Teams that ship reliable retrieval in production run hybrid search (BM25 + vec"
canonical: https://supergood.solutions/blog/your-vector-database-isn-t-the-problem-your-retrieval-strategy-is/
published: 2026-04-22
last-updated: 2026-10-29
---

AI Wednesday

# Your Vector Database Isn't the Problem — Your Retrieval Strategy Is

Published April 22, 2026 — 5 min read

**TL;DR:** Pure vector search is the default for enterprise RAG, and it's the wrong default. Teams that ship reliable retrieval in production run hybrid search (BM25 + vector) with a reranker — and the quality gap over pure embedding search is not subtle. If your RAG answers feel "close but wrong," this is almost always why.

## Key Insight

Embeddings are good at semantic similarity. They are bad at exact matches, rare terms, product SKUs, error codes, acronyms, and anything the model didn't see much of during pretraining. Enterprise corpora are *full* of those things.

The contrarian take: **vector search was never supposed to be the whole retrieval pipeline.** It's one signal among several. But the industry sold teams a vector DB as "the RAG stack," and now everyone's debugging bad answers by swapping embedding models when the actual fix is architectural.

Anthropic's September 2024 Contextual Retrieval work quantified this clearly: adding BM25 to vector search cut retrieval failures by ~49%. Adding a reranker on top cut them by ~67%. That's not a tuning gain. That's a different pipeline.

## Why Teams Miss This

Three reasons, in the order they usually bite:

1. **The vendor pitch conflates storage with retrieval.** Pinecone, Weaviate, Qdrant, and the rest are excellent vector *stores*. But "we have a vector DB" is not the same as "we have a retrieval strategy." Teams buy the store and stop thinking.

2. **Eval sets don't stress-test keyword-heavy queries.** Most internal RAG evals are written by the team that built the system, using natural-language questions they'd ask. Real users paste error messages, part numbers, internal acronyms, and half-sentences. Pure vector search quietly loses on all of those.

3. **"Just use a bigger embedding model" feels like progress.** Upgrading from `text-embedding-ada-002` to `text-embedding-3-large` or a Cohere v3 model will move your metrics 3–8%. Adding BM25 + rerank will move them 30–50%. Teams pick the smaller win because it's a config change, not an architecture change.

## How to Actually Do It

Here's the pipeline that works in production. It's not novel — it's just unevenly adopted.

**1. Index twice.** Same chunks, two indexes:

- BM25 (lexical) — use Elasticsearch, OpenSearch, or Postgres `tsvector` if you're small
- Dense vector — your embedding model of choice, stored anywhere

**2. Query both in parallel.** Pull top-K from each (K=25 is a reasonable default).

**3. Fuse the results.** Reciprocal Rank Fusion (RRF) is the boring, well-understood default:

def rrf(ranked\_lists, k=60):

scores = {}

for ranking in ranked\_lists:

for rank, doc\_id in enumerate(ranking):

scores[doc\_id] = scores.get(doc\_id, 0) + 1 / (k + rank + 1)

return sorted(scores.items(), key=lambda x: -x[1])

fused = rrf([bm25\_results, vector\_results])

RRF needs zero score normalization, zero learned weights, and works across heterogeneous scorers. Use it.

**4. Rerank the top 20–50.** A cross-encoder reranker (Cohere Rerank v3, Jina Reranker v2, or a local bge-reranker) reads query + document together and scores them. This is the step that actually reads semantics. Keep the top 5–10.

**5. Add contextual chunk prefixing if your corpus has heavy cross-references.** Anthropic's trick: before embedding, prepend each chunk with a 50–100 token LLM-generated summary of where it sits in the parent doc. Adds ~20% to indexing cost; cuts retrieval failure another 35% on top of hybrid+rerank.

That's the whole playbook. Five steps. None of them exotic.

## What We've Learned

The teams shipping good RAG in 2026 aren't winning on embedding model selection. They're winning on pipeline shape. If you're debugging hallucinations by A/B-testing embedding models, you're optimizing the wrong layer.

**Next experiment:** Pull 50 real user queries from your logs — especially the ones with error codes, part numbers, or acronyms. Run them through your current retrieval and hand-label whether the right chunk is in the top 5. Then bolt BM25 + RRF onto the front of your current vector pipeline and re-run. If the delta is under 15 percentage points, your corpus is unusually clean. If it's 30+ points, you now know what to build next.

One more thing: reranking latency is the usual objection. Cohere Rerank v3 adds ~200ms on 25 docs. If your end-to-end agent response is already 3–8 seconds, that's noise. Measure it before you dismiss it.

## Sources

- [Anthropic — Contextual Retrieval (Sept 2024)](https://www.anthropic.com/news/contextual-retrieval)
- [Microsoft Azure AI Search — Hybrid Search Documentation](https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview)
- [Cohere Rerank v3 Release Notes](https://docs.cohere.com/docs/rerank-2)
- [Cormack, Clarke, Buettcher — Reciprocal Rank Fusion (2009)](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)
- [Pinecone — Hybrid Search Blog](https://www.pinecone.io/learn/hybrid-search-intro/)

---

## FAQ

**Q: Do I need to replace my vector database?**

A: No. Hybrid search runs *alongside* your vector DB. Keep Pinecone/Weaviate/Qdrant for dense retrieval, add a lexical index (Elasticsearch, OpenSearch, or Postgres full-text), and fuse at query time. No data migration required.

**Q: Is Reciprocal Rank Fusion really better than learned weight tuning?**

A: For most teams, yes — because you don't have a labeled eval set large enough to tune weights without overfitting. RRF is parameter-free and robust. Move to learned fusion only after you have 1,000+ labeled query-doc pairs.

**Q: Can I skip the reranker to save cost and latency?**

A: You can, but you'll leave the biggest quality gain on the table. Reranking on 25 candidates adds ~200ms and a few cents per 1K queries with Cohere. Most teams burn more than that on a single unnecessary LLM retry.

**Q: What about long-context models — can't I just stuff everything in the prompt and skip retrieval?**

A: Long context works for small, static corpora (product manuals, a single contract). It collapses economically and accuracy-wise on any corpus over ~100K tokens. Retrieval is still the right tool for enterprise-scale knowledge.

**Q: Does this apply if I'm using a managed RAG product (e.g., Azure AI Search, Vertex AI Search)?**

A: Yes — and the managed products mostly already do hybrid + rerank under the hood. If you're using a DIY stack built around a vector DB only, you're giving up the quality floor that the managed products treat as table stakes.

**Q: Where does contextual chunking fit in the priority order?**

A: Last. Implement BM25 + RRF first, then reranking, then contextual chunking. The first two are cheap and compound. Contextual chunking adds indexing cost and only pays off once the rest of the pipeline is solid.

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
