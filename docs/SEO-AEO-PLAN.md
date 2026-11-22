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
- Older service-page body copy still reads mid-market or enterprise. See the Service page rewrite plan below. That work is planned, not shipped.
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

## Service page rewrite plan

Written 2026-11-21. This is a plan only. No service-page body copy has been rewritten yet. After Ryan agrees the order, ship the rewrites in a later PR, not this one.

In that later PR, update the HTML page, its `.md` twin, any FAQ schema that mirrors visible FAQ text, and the matching section of `llms-full.txt`, in the same commit. CTA stays `/start/`. Follow the standing rules above.

Search Console: a fresh per-page query export was not pulled (the GSC connector is not connected). Known sitewide baseline from 2026-11-21: average position about 20; the query "ai automation consulting" had 482 impressions and 0 clicks. That query maps to `/ai-automation-consulting/`. Other pages below have no per-query evidence in this file yet.

### Priority 1. `/ai-automation-consulting/` - rewrite (medium, about half a day)

- URL: https://supergood.solutions/ai-automation-consulting/
- Current audience/tone: marketing and ops teams. H1 is "Your team wastes 20 hours a week on work a robot should do." The FAQ still says "Run starts at $900" (old offer name) and points people to the Quick Scan first. Setup Sprint is missing from the main ladder.
- GSC: strongest evidence we have. "ai automation consulting" is on page 2 with 482 impressions and 0 clicks. The title and snippet are likely why it gets seen and not clicked: they still sound like a mid-size ops pitch, not an owner who wants help this week.
- Recommendation: rewrite. Keep this URL. It is already ranking for a money term.
- New target query and title: query "ai automation consulting". Title: "AI Automation Consulting for Owner-Run Businesses | Supergood Solutions".
- Key copy changes:
  1. Change the H1 and lede from "marketing or ops teams" to an owner-run shop drowning in admin, inquiries, and reports.
  2. Lead the offer with the $500 Sidekick Session, then Setup Sprint from $2,500 and Sidekick Monthly from $900/month. Put Quick Scan ($1,000) and Build (from $4,000) in a clearly labeled "teams of 10 or more" block.
  3. Replace every "Run" leftover with Sidekick Monthly.
  4. Keep the before/after busywork examples (copy-paste, unread reports, broken handoffs), but write them as the owner's week, not a marketing department's.
  5. CTA: "Book a free 20-minute call" or "See the $500 Sidekick Session," both to `/start/`.
- Offer to push: Sidekick Session first.

### Priority 2. `/ai-consulting/` - rewrite body (medium, about half a day)

- URL: https://supergood.solutions/ai-consulting/
- Current audience/tone: titles and meta already say owner-run businesses of 1 to 20. The H1 and body still do not: "AI consulting for teams who need agents that work, not a strategy deck," production-agent language, "mid-market marketing and ops teams are the core focus," and a founding-client line (no dollar amount).
- GSC: no per-page query data pulled. This is the services hub, so it should match the homepage even if it ranks later than the automation page.
- Recommendation: rewrite the body and H1. Keep the URL and the existing title ("AI Consulting for Owner-Run Businesses | Supergood Solutions").
- New target query and title: query "AI consulting" / "AI consultant." Keep the current title.
- Key copy changes:
  1. New H1 in the same voice as the homepage, aimed at owners, not "teams who need agents."
  2. Replace the mid-market industry FAQ answer with owner-run service businesses of 1 to 20 people.
  3. Lead the rate card with Intro call, Sidekick Session, Setup Sprint, and Sidekick Monthly. Keep Quick Scan and Build only for teams of 10 or more.
  4. Drop or recast the founding-client line so it cannot be read as a special public price. Do not add a dollar amount.
  5. Cross-link to the automation page (busywork), the agent page (something that has to run on its own), and the LA bars page as a worked example.
- Offer to push: Sidekick Session, then Setup Sprint and Sidekick Monthly.

### Priority 3. `/ai-agent-consulting/` - rewrite and retarget (medium, about half a day)

- URL: https://supergood.solutions/ai-agent-consulting/
- Current audience/tone: engineering and product teams "shipping agents that survive contact with production." Architecture, evals, and observability are the pitch. Prices are already updated in the FAQ, but the H1 and lede still assume a team that already has an agent demo.
- GSC: no per-page query data pulled. "AI agent consulting" is a real money term and the blog supports it, but most owner-run buyers will not arrive thinking in those words.
- Recommendation: rewrite and keep the URL. Do not merge it into the hub. Soften the buyer: an owner who wants a job to run without them babysitting it. Keep the production-gap point, in plain language.
- New target query and title: query "AI agent consulting." Title: "AI Agent Consulting for Small Teams | Supergood Solutions."
- Key copy changes:
  1. New H1: an agent that does the job every day, not a demo that dies in a week.
  2. Translate architecture, evals, and guardrails into what the owner gets: what it is allowed to do, how you know it is right, and what happens when it is unsure.
  3. Lead with Sidekick Session and Setup Sprint, not "Build from $4,000" or the Quick Scan.
  4. Say when a simple workflow is the better first step, and link to the automation page.
  5. Keep a short path for teams of 10 or more (Quick Scan and Build).
- Offer to push: Sidekick Session, then Setup Sprint.

### Priority 4. `/ai-readiness-assessment/` - rewrite and re-ladder offers (medium, about half a day)

- URL: https://supergood.solutions/ai-readiness-assessment/
- Current audience/tone: still productizes the $1,000 Quick Scan as the main assessment. "Who this is actually for" says marketing or ops teams with a Microsoft 365 stack, and "not a good fit yet" includes teams with only one or two recurring workflows. That screens out the owner-run 1-20 buyer.
- GSC: no per-page query data pulled. "AI readiness assessment" is still a useful question for answer engines.
- Recommendation: rewrite and keep the URL. Do not merge it. Flip the default offer to the Sidekick Session. The Quick Scan stays only for teams of 10 or more.
- New target query and title: query "AI readiness assessment." Title: "AI Readiness Assessment for Small Businesses | Supergood Solutions."
- Key copy changes:
  1. H1 and lede: find out where AI helps, before you spend on a build, written for an owner, not a mid-market ops lead.
  2. Rewrite "who this is for" so a 1-20 person service business with a couple of painful workflows is a good fit.
  3. Make the $500 Sidekick Session the default assessment (90 minutes, one workflow live, a one-page list of the next three jobs).
  4. Move Quick Scan ($1,000) and Build (from $4,000) into a teams-of-10-or-more section.
  5. Remove mid-market and Big Four price comparisons if they make the page feel like an enterprise pitch. Honest ranges can stay if they help an owner decide.
- Offer to push: Sidekick Session. Quick Scan only for teams of 10 or more.

### Priority 5. `/ai-agent-governance/` - rewrite, keep as a supporting page (medium-low, about two to three hours)

- URL: https://supergood.solutions/ai-agent-governance/
- Current audience/tone: technical ("guardrails, observability, and runbooks"). The meta already says "Built for small teams too," but the body still reads like an ops/security page. Prices in the FAQ are current.
- GSC: no per-page query data pulled. This is more of an AEO page (it answers "what is AI agent governance?") than a client-winning page.
- Recommendation: rewrite and keep the URL. Do not merge it. Lower its weight in the hub nav. Write it in plain language: what happens when the AI is wrong, and how you keep customer-facing work from going out unchecked.
- New target query and title: query "AI agent governance" / "AI agent guardrails." Title can stay close to the current question-style title: "What Is AI Agent Governance? Guardrails for Small Teams | Supergood."
- Key copy changes:
  1. Open with the owner's risk (a wrong email, a bad quote, a silent failure), not a tool-allowlist lecture.
  2. Tie the one-page AI policy in the Setup Sprint to this page, and say Ryan checks agent output before it reaches customers.
  3. Lead offers with Setup Sprint (from $2,500) and Sidekick Monthly (from $900/month). Mention the Sidekick Session as the way in.
  4. Keep Quick Scan and Build only for teams of 10 or more.
  5. Leave the deeper blog links; they support the page without making the pitch feel enterprise.
- Offer to push: Setup Sprint, with Sidekick Session as the entry.

### Priority 6. `/faq/` - companion update (low, about one to two hours)

- URL: https://supergood.solutions/faq/
- Current audience/tone: prices are current, but "What industries does Supergood work with?" still says "Marketing and ops teams at mid-market companies are the core focus."
- GSC: no per-page query data pulled.
- Recommendation: rewrite the mid-market answers in the same PR as the hub. Keep the page. This is not a service landing page, but answer engines and buyers will read it.
- New target query and title: keep "FAQ | Supergood Solutions." No title change needed.
- Key copy changes:
  1. Industry answer: owner-run service businesses of 1 to 20 people.
  2. Scan remaining answers for mid-market or department-level wording and align them with the homepage FAQ.
  3. Keep the rate card consistent with `/pricing/`.
  4. CTA stays the `/start/` form, then a free call or a Sidekick Session.
- Offer to push: Sidekick Session.

### Priority 7. `/ai-automation-la-bars-event-services/` - keep, light polish (low, about one to two hours)

- URL: https://supergood.solutions/ai-automation-la-bars-event-services/
- Current audience/tone: already aimed at LA bar, mobile bartending, and event-service owners. Offers and the Butler Service Bar example (already on the homepage) are in good shape. The Build and Quick Scan blocks are still a bit prominent next to the owner path.
- GSC: no per-page query data pulled. This is a local niche page, not a head-term page.
- Recommendation: keep. Light polish only. Use this page as the model for any later niche page.
- New target query and title: keep "AI automation for LA bars and event services." No title change.
- Key copy changes:
  1. Make Sidekick Session and Setup Sprint visually first; keep Quick Scan and Build in a teams-of-10-or-more note.
  2. Keep the Butler Service Bar proof, since it is already public on the homepage. Do not add other client names without Ryan's OK.
  3. CTA language should match the homepage ("Book a free 20-minute call") rather than leaning on "the paid Quick Scan."
- Offer to push: Sidekick Session, then Setup Sprint.

### New niche pages

Do not add a second LA event-services page. That page already exists.

One later page is worth considering: AI for solo coaches and consultants (intake, follow-ups, content busywork). It matches the 1-20 positioning. Only start it after Ryan decides whether a coach example can be described, with or without a name. Until then, do not ship it. No other new niche pages in this pass.

### What Ryan needs to decide

- Confirm this order, or say if any page should be merged instead of rewritten. The recommendation is to keep all six service URLs.
- Whether to add the solo-coaches page later, and whether a coach example can be used (named or anonymized). Do not publish a client name without OK.
- Whether Butler Service Bar stays as the proof on the LA page (it is already on the homepage).
