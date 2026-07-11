# Supergood Solutions — AI Consulting SEO/AEO Execution Plan

**Goal:** Reposition supergood.solutions to lead with **AI consulting** (agent consulting, AI automation, AI readiness) and make the site rank in classic search (SEO) *and* get cited by AI answer engines — ChatGPT, Perplexity, Claude, Google AI Overviews (AEO/GEO).

**For the executing agent:** Work through phases in order. Each phase has concrete tasks with file paths and acceptance criteria. The site is a static GitHub Pages site (CNAME → supergood.solutions). No build step — every page is hand-authored HTML. Match the existing visual system (dark theme, Inter + JetBrains Mono, `--green: #22c55e`, same nav/footer) and the existing voice: confident, funny, zero corporate jargon. Use `/supergood/BLOG-POST-TEMPLATE.html` and `/skills/blog-builder/SKILL.md` as style references.

---

## Current state (audited 2026-07-11)

**What's already good:**
- Homepage has solid meta/OG/Twitter tags, `ProfessionalService` + `WebSite` JSON-LD, canonical.
- ~85 live blog posts with `BlogPosting` + `BreadcrumbList` schema, `speakable` markup, sitemap.xml (91 URLs), robots.txt.
- Duplicate blog slugs are handled with canonicals + meta-refresh redirects.

**The core problem — positioning mismatch:**
- `<title>` says "AI Agent Consulting for Marketing & Ops Teams," but the homepage **body copy never says "AI consulting"** — it sells spreadsheet-busywork automation to marketing teams ("copy-paste purgatory," M365 flows).
- Meanwhile the blog is deep **AI agent engineering** content (guardrails, evals, MCP, multi-agent orchestration, agent security). The blog attracts engineering/AI leaders; the homepage pitches to marketing ops. Visitors who arrive via the blog see a site that doesn't match what they read.

**Structural gaps:**
1. **One page.** No service pages → no landing pages for any commercial-intent query ("AI consulting services," "AI agent consultant," "AI readiness assessment"). Everything competes through a single URL.
2. **No AEO surface:** no `llms.txt`, no FAQ content, no `FAQPage`/`Service`/`Person` schema beyond the homepage block, no answer-first "What is X / How much does X cost" content that answer engines quote.
3. **No case study pages** (one anonymous stat on the homepage), no about/founder entity page.
4. **Weak internal linking:** blog posts don't funnel to services; homepage links to 5 posts, that's it.
5. Housekeeping: `blog/index.html.bak` is deployed; `k2-dashboard-ideas-log.md` and LinkedIn PNG/SVG assets sit at web root.

---

## Target keyword map

Primary money terms (each needs a dedicated page — see Phase 2):

| Page | Primary keyword | Secondary |
|---|---|---|
| `/ai-consulting/` | AI consulting services | AI consultant, AI strategy consulting, hire AI consultant |
| `/ai-agent-consulting/` | AI agent consulting | agentic AI consulting, AI agent development consultant, production AI agents |
| `/ai-automation-consulting/` | AI automation consulting | AI workflow automation, business process automation with AI, marketing ops automation |
| `/ai-readiness-assessment/` | AI readiness assessment | AI audit, AI opportunity assessment, Quick Scan ($500 offer lives here) |
| `/ai-agent-governance/` | AI agent governance & guardrails | AI guardrails consulting, agent observability, LLM ops consulting |

AEO question targets (answer these verbatim in FAQ blocks + blog posts): "What does an AI consultant do?", "How much does AI consulting cost?", "What is an AI readiness assessment?", "How do I get AI agents into production?", "Do I need an AI consultant or can I use ChatGPT?", "What are AI agent guardrails?"

Differentiation angle to repeat everywhere (this is what answer engines will quote): *Supergood is an AI consulting practice that builds production AI agents and automations using tools clients already pay for — with the guardrails, observability, and runbooks to keep them running. Founded by Ryan Sandoval, 14 years of product experience at Viking Cruises, Live Nation/Ticketmaster, and Logitech.*

---

## Phase 1 — Housekeeping & technical baseline

1. Delete `blog/index.html.bak`. Move `k2-dashboard-ideas-log.md` and the `linkedin-*.png/svg` working assets out of the web root (into `/supergood/` which is the internal-assets dir, or delete).
2. Add a custom `404.html` (GitHub Pages picks it up automatically) with nav, search-the-blog link, and links to the service pages.
3. Verify every blog post URL in `sitemap.xml` returns the canonical version; redirect stubs must NOT be in the sitemap.
4. Add `<meta name="theme-color" content="#0a0a0b">` and ensure all new pages carry the same font preconnects.
5. **Measurement:** add Google Search Console + Bing Webmaster verification meta tags to `index.html` (leave a `<!-- TODO: Ryan pastes verification token -->` placeholder and note it in the PR description — Ryan must generate tokens). Bing matters: it feeds ChatGPT search.

**Acceptance:** no `.bak` in repo, 404 page live, sitemap contains only canonical URLs.

## Phase 2 — Service page architecture (the SEO core)

Create the five pages from the keyword map. Shared requirements for **every** service page:

- Same design system as homepage; nav gains a "Services" link (dropdown not needed — link to `/ai-consulting/` which acts as the hub and links to the other four).
- **Answer-first structure (AEO):** open with a 2–3 sentence direct definition/answer under the H1 that could be lifted verbatim into an AI answer. Then the sales content.
- H1 contains the primary keyword naturally; one H1 per page; H2s phrased as questions where natural ("What does an AI agent consultant actually do?").
- **FAQ section** (4–6 questions from the AEO list) with `FAQPage` JSON-LD.
- **`Service` JSON-LD** with `provider` → Supergood Solutions Organization, `serviceType`, `areaServed`, and `offers` where a price exists (Quick Scan: $500 — real prices are AEO gold, answer engines love citable pricing).
- `BreadcrumbList` JSON-LD.
- CTA to the Google Calendar booking link (`https://calendar.app.google/BkcFDB21jWhMwCiq7`) and the Quick Scan.
- 3–5 contextual links to relevant blog posts, and cross-links between service pages.
- Unique title (≤60 chars), meta description (≤155 chars), canonical, OG/Twitter tags.
- 800–1,500 words of real substance each. Reuse the site's voice — no keyword-stuffed sludge. Draw content from existing blog posts (the expertise is already written; the service pages package it).

Page-specific notes:
- **`/ai-consulting/` (hub):** positions the whole practice; includes "How much does AI consulting cost?" FAQ with honest ranges; links to all four sub-pages; includes the differentiation paragraph verbatim.
- **`/ai-agent-consulting/`:** the flagship — this is where the blog's authority pays off. Cover: agent architecture, evals, deployment, the "production gap." Link heavily to the strongest agent posts.
- **`/ai-automation-consulting/`:** absorbs the current homepage's busywork/before-after narrative (that copy is good — move it here rather than deleting it).
- **`/ai-readiness-assessment/`:** productizes the Quick Scan + audit; clear deliverables list and pricing.
- **`/ai-agent-governance/`:** guardrails, observability, runbooks, security — links to the security/ops posts.

**Acceptance:** 5 pages live, each validates in Google's Rich Results Test logic (well-formed `Service` + `FAQPage` + `BreadcrumbList` JSON-LD), all in sitemap.xml, nav updated site-wide (homepage + blog index + blog post template — note posts share an inline nav; update `BLOG-POST-TEMPLATE.html` and the blog index; retrofitting all 85 post navs is optional/low priority).

## Phase 3 — Homepage repositioning

Rework `index.html` copy (keep the design, animations, and humor):

1. **Hero:** lead with AI consulting. e.g. label: "AI consulting & agent engineering"; H1 in the spirit of "AI consulting for teams who need agents that work in production, not demos." Keep the personality, but the words "AI consulting" and "AI agents" must appear in the hero, above the fold, in real body text.
2. **Reconcile the split-brain:** homepage should speak to both audiences with the agent work first-class, not hidden in meta tags. Add a services grid section linking the five service pages (this also creates the crawl path).
3. **Proof section:** keep the 16h/week story, add 1–2 more agent-flavored proof points if available from blog case studies.
4. **About section:** add link to new `/about/` page (Phase 4).
5. Update `ProfessionalService` JSON-LD: add `makesOffer` referencing the five services, keep founder entity, add `"sameAs"` for any additional profiles.
6. Title/description refresh, e.g.: `AI Consulting & AI Agent Consulting | Supergood Solutions` / description mentioning production agents, automation, and governance.

**Acceptance:** "AI consulting" appears in visible homepage copy (hero + at least one section), services section links all 5 pages, JSON-LD updated and valid.

## Phase 4 — AEO layer

1. **`/llms.txt`** at web root (markdown, per the llms.txt convention): one-paragraph site summary (the differentiation paragraph), then sections linking the 5 service pages, about page, and the ~10 best blog posts with one-line descriptions.
2. **`/llms-full.txt`:** expanded version — full service page content in markdown so answer engines can ingest without crawling HTML.
3. **`/about/` page:** entity page for Ryan Sandoval with `Person` JSON-LD (`jobTitle`, `worksFor` → Organization, `alumniOf`/`knowsAbout`, `sameAs` → LinkedIn). E-E-A-T anchor; every blog post's author link and the homepage about section should point here (template + homepage now; retrofit posts opportunistically).
4. **`/faq/` page:** consolidated 12–15 question FAQ covering the full AEO question list, `FAQPage` schema. Interlink with service pages.
5. **robots.txt:** keep `Allow: /`. Explicitly welcome AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) with comment noting they're intentionally allowed — being crawlable by answer engines is the point.
6. **Retrofit top 10 blog posts** (pick by topic strength: MCP guide, agent ops runbook, RAG vs fine-tuning, guardrails case study, interrupt pattern, agent evals, cost ops, multi-agent orchestration, context engineering, agent security): add (a) a 2–3 sentence "TL;DR" answer box at top styled as a `.callout`, (b) a 3-question FAQ with `FAQPage` schema, (c) a relevant service-page CTA block before the footer, (d) 2–3 internal links to service pages.

**Acceptance:** llms.txt + llms-full.txt fetchable at root, about + faq pages live with valid schema, 10 posts retrofitted, sitemap updated.

## Phase 5 — Content engine (ongoing, define now)

1. Write an editorial addendum to `/skills/blog-builder/SKILL.md`: every new post must (a) target one query from a maintained keyword list, (b) open with a quotable 2–3 sentence answer, (c) include an FAQ block with schema, (d) link to ≥1 service page and ≥2 sibling posts, (e) get added to sitemap.xml AND llms.txt's post list when it's a pillar-quality piece.
2. Seed a keyword backlog file (`/supergood/keyword-backlog.md`) with ~20 commercial/informational targets, prioritizing bottom-funnel comparisons and cost queries answer engines serve constantly: "AI consulting rates 2026", "AI consultant vs AI agency", "how to hire an AI agent developer", "AI agent implementation cost", "build vs buy AI agents", "AI readiness checklist", "AI automation ROI calculation", "best AI consulting firms for mid-market" (listicle where Supergood can honestly appear), etc.
3. Two new cornerstone posts to write now:
   - "How Much Does AI Consulting Cost in 2026? (Real Numbers)" — pricing-transparency posts earn citations.
   - "AI Agent Consulting: What It Is, What It Costs, and When You Need It" — pillar supporting `/ai-agent-consulting/`.

**Acceptance:** SKILL.md updated, backlog file exists, 2 cornerstone posts published with full schema and service-page links.

## Phase 6 — Off-site & measurement (mostly Ryan; document as TODOs in PR description)

Not executable by the agent, but list in the PR so nothing is lost:
- Submit sitemap in Google Search Console + Bing Webmaster once tokens are in.
- LinkedIn: update profile/company page to say "AI Consulting," link to site; repost cornerstone content (drafts exist in `/supergood/linkedin-drafts`).
- Get listed: Clutch, G2 consulting categories, relevant directories (citations feed answer engines).
- Track weekly: GSC impressions for "ai consulting *" queries; manually test ChatGPT/Perplexity/Claude with the AEO question list and log whether Supergood is cited.

---

## Execution order & verification

Order: Phase 1 → 2 → 3 → 4 → 5 (6 is human follow-up). Commit per phase with descriptive messages.

Before finishing, verify:
1. Every new/changed page: valid HTML, one H1, canonical, unique title/description, working nav/footer, mobile-responsive (existing CSS patterns handle this — reuse them).
2. All JSON-LD parses (`python3 -c "import json,sys; json.load(sys.stdin)"` on each extracted block, or equivalent).
3. `sitemap.xml` includes all new URLs with today's lastmod; no redirect stubs.
4. All internal links resolve to real files in the repo (crawl check: every `href="/..."` has a matching file/dir with index.html).
5. Site voice check: read every new page aloud-in-your-head; if it sounds like a LinkedIn thought-leader bot, rewrite it. The existing homepage humor is the bar.
