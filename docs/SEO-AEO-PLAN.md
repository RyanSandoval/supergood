# Supergood SEO and AEO plan

Living plan for https://supergood.solutions. Read this instead of relying on chat memory.

This file supersedes `AI-CONSULTING-SEO-AEO-PLAN.md` (July 2026), which targeted generic mid-market "AI consulting" service pages. Useful pieces from that plan (service-page map, FAQ schema, llms.txt, GSC/Bing) are folded in below. The old root file is now a pointer here.

The repo is public and GitHub Pages will serve this path. Do not put secrets, credentials, unpublished client names, or private prices in this file. `robots.txt` disallows `/docs/` so crawlers should not index it.

Last reviewed: 2026-11-21.

## Positioning (Option A)

Shipped in [PR #17](https://github.com/RyanSandoval/supergood/pull/17), merged 2026-11-21.

Ryan Sandoval is the AI sidekick for owner-run service businesses of 1 to 20 people. Homepage H1: "I'm Ryan. I'll be your AI sidekick." He sets up AI, stays on to keep it working, and checks what his agents produce before it reaches the client or their customers. Based in Los Angeles. Works remotely. Caps the practice at four monthly clients.

## Offers and prices

Public rate card: https://supergood.solutions/pricing/ and `/pricing.json`. If a price changes, update the pricing page, `pricing.json`, `pricing.md`, and every other place that quotes it, in one edit (see `AGENTS.md`).

- Intro call: free, 20 minutes. Requested on `/start/`.
- Sidekick Session: $500 for 90 minutes. Credited in full to a Setup Sprint signed within 14 days.
- Setup Sprint: from $2,500.
- Sidekick Monthly: from $900/month, 3-month minimum. Optional 10-20% of measured gain on tracked workflows, capped at 1.5x the retainer.
- Quick Scan: $1,000, for teams of 10 or more, credited toward a build if signed within 14 days.
- Build: from $4,000 per workflow, for teams of 10 or more.

Clients pay for tools on their own accounts. The CTA on the site is the `/start/` form, not a separate booking link.

## What's set up

- Hosting: static GitHub Pages from [RyanSandoval/supergood](https://github.com/RyanSandoval/supergood). No build step. GitHub Pages cannot do server redirects; `/fit-check/` is a noindex refresh page that points to `/start/` and is kept out of `sitemap.xml`.
- GA4: measurement id `G-JLBDSQ3B4P`, property `557180424`, under the "Sell with Lo" account (`393616441`). Tag plus `/assets/analytics.js` on key pages.
- Google Search Console: property `sc-domain:supergood.solutions`. Sitemap submitted.
- Bing Webmaster Tools: site added, sitemap submitted. IndexNow key file: `/50bfa49bfe4807b66b12bfa3b8a627dc.txt`. Deploy workflow: `.github/workflows/indexnow.yml`.
- DuckDuckGo: nothing to submit; it relies mostly on Bing.
- `robots.txt`: allows Googlebot, Bingbot, GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Google-Extended, and Applebot-Extended. Disallows `/docs/`.
- `llms.txt` and `llms-full.txt`: should match current positioning and the public rate card.
- Schema in use: `ProfessionalService` (Organization), `Person` (Ryan, with headshot `/assets/img/ryan-sandoval.jpg`, sameAs LinkedIn https://www.linkedin.com/in/RyanSandoval and https://ryan-sandoval.com), `Service` / `Offer` / `OfferCatalog` with the prices above, `FAQPage` on the homepage (matching the visible FAQ) plus service and pricing pages, plus `WebSite` / `WebPage` / `BreadcrumbList`.
- Canonical, Open Graph, and Twitter tags on key pages. `og:image` is `https://supergood.solutions/og-image.png`.

## Baseline (90 days, pulled 2026-11-21)

- GA4: 1,568 sessions. 78% direct. 24 organic search sessions.
- Search Console: average position about 20 (page 2). Query "ai automation consulting": 482 impressions, 0 clicks.

The site gets visits, almost none from search. The earlier positioning was generic and enterprise-aimed. Distribution (LinkedIn and referrals) still has to do most of the work; search is a lagging channel.

## 30 / 60 / 90-day targets

By 19 February 2027: 3 paying clients and 100 search clicks. The 30/60/90 breakdown and draft LinkedIn posts live on the positioning Page: https://cursor.com/canvas/store-6fda2370-55b9-40c6-93e8-925dc10ce146/fe64e770-dd67-46d2-831b-17330ce12bfd

## Standing rules

- Copy follows no-ai-slop. No em dashes in new copy.
- No Viking text outside the homepage logo strip. The day-job line may say "large travel company" and must not name the employer. Blog author bios still need a publisher-template fix (see open items).
- Never publish the $250 founding-client price on public site pages. The public rate card is the source of truth.
- No client names on the site or in posts without Ryan's OK.
- Get Lo's sign-off before publishing any new Sell With Lo numbers or details.
- Do not hand-edit blog posts, `blog/index.html`, or post entries in `sitemap.xml`. Those come from the automated publisher.
- Do not invent prices. Change them only as `AGENTS.md` requires.

## Recurring checklist

Weekly:

- Check Google Search Console queries and pages, especially "ai automation consulting" and other money terms.
- Check GA4 sessions by source (direct, organic, referral/LinkedIn).
- After any merge to main, confirm GitHub Pages is serving the new commit (homepage still says "AI sidekick"; prices still match `pricing.json`).
- If pages changed, list the live URLs to ping with IndexNow (the deploy workflow may already do this).

Monthly:

- Progress against the 19 February 2027 targets (3 paying clients, 100 search clicks).
- Confirm `llms.txt`, `llms-full.txt`, and JSON-LD still match the public rate card and Option A positioning.
- Review GSC coverage and 404s.
- Confirm the sitemap in GSC and Bing is still current.

## Open items

- Blog author description still mentions Viking. Fix it in the blog publisher's template, not by hand-editing posts. The publisher is not in this repo.
- The hosted MCP `get_pricing` offer enum still lists older offers (`fit-check`, `quick-scan`, `build`, `run`). That lives in the intake/API project, not this static repo.
- Search Console listed other 404s besides `/fit-check/`. The exact URLs have not been pulled yet.
- Some older service-page body copy still reads mid-market or enterprise. Homepage, pricing, titles/meta, schema, and llms openings use Option A. Leave a full copy pass for a later PR unless Ryan asks for it now.
- About page still uses an initials tile in the layout; the headshot is on the homepage and in Person schema.

## IndexNow URLs to ping after this SEO/AEO PR merges

Do not ping until this PR is merged and GitHub Pages has deployed.

- https://supergood.solutions/
- https://supergood.solutions/pricing/
- https://supergood.solutions/about/
- https://supergood.solutions/ai-consulting/
- https://supergood.solutions/start/
- https://supergood.solutions/faq/
- https://supergood.solutions/llms.txt
- https://supergood.solutions/llms-full.txt
- https://supergood.solutions/pricing.json
- https://supergood.solutions/services.json
- https://supergood.solutions/sitemap.xml
- https://supergood.solutions/robots.txt
- https://supergood.solutions/ai-agent-consulting/
- https://supergood.solutions/ai-automation-consulting/
- https://supergood.solutions/ai-readiness-assessment/
- https://supergood.solutions/ai-agent-governance/
