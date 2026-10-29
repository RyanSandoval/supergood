---
name: search-blog-corpus
description: List every Supergood blog post from sitemap.xml, then fetch the posts that match a topic such as AI consulting cost or agent evals.
---

# Search the blog corpus

Supergood has no search endpoint. To find posts on a topic, build the list yourself from the sitemap.

1. `GET https://supergood.solutions/sitemap.xml` (`application/xml`). Each `<url>` has a `<loc>` and a `<lastmod>`.
2. Keep the `<loc>` values that start with `https://supergood.solutions/blog/` and have a slug after it. The bare `/blog/` entry is the index page, not a post.
3. Match your topic against the slugs, which are descriptive (for example `how-much-does-ai-consulting-cost-2026`).
4. `GET` the matching post URL. Posts are `text/html` pages with the article in the body; there are no markdown twins.

For a curated starting point, `https://supergood.solutions/llms.txt` lists featured posts with a one-line summary each, and `https://supergood.solutions/blog/` is the human-facing index.

Posts cover AI agent architecture, evals, guardrails, cost and production operations.
