# Google Search Console MCP — Setup & Runbook

The repo ships a `.mcp.json` that registers a Google Search Console MCP server
([AminForou/mcp-gsc](https://github.com/AminForou/mcp-gsc), PyPI package
`mcp-search-console`, run via `uvx`) in every Claude Code session on this repo —
local or web. It gives sessions read access to Search Console data: search
analytics (up to 25k rows/query), per-URL inspection **including rich-results
verdicts and issues**, and sitemap submit/status. One credential covers every
GSC property the service account has been granted access to.

**What no MCP/API can do** (Google doesn't expose it): click "Validate fix" on
an issue report, read the issue reports or their affected-URL lists, or
"Request Indexing" for normal pages. Those stay in the GSC UI. The API-side
recrawl nudge for regular content is a sitemap resubmit with updated lastmod.

## One-time setup (Ryan, ~10 minutes)

1. **Google Cloud project** — [console.cloud.google.com](https://console.cloud.google.com)
   → create (or pick) a project, e.g. `supergood-seo`.
2. **Enable the API** — APIs & Services → Library → search "Google Search
   Console API" → Enable.
3. **Service account + key** — IAM & Admin → Service Accounts → Create
   (name: `gsc-mcp`; no project roles needed) → open it → Keys → Add key →
   Create new key → JSON → download. Keep this file private.
4. **Grant it access to each property** — [search.google.com/search-console](https://search.google.com/search-console)
   → for EACH property you want covered: Settings → Users and permissions →
   Add user → paste the service account email (`gsc-mcp@<project>.iam.gserviceaccount.com`)
   → permission: **Full**. (~30 seconds per property; repeat for every site.)
5. **Put the key in the Claude environment** — claude.ai/code → cloud icon →
   your environment → Settings:
   - **Environment variable**: `GSC_SERVICE_ACCOUNT_JSON` = the entire JSON key
     as one line.
   - **Setup script**: add this so the key lands where `.mcp.json` expects it:

     ```bash
     mkdir -p /root/.config/gsc
     printf '%s' "$GSC_SERVICE_ACCOUNT_JSON" > /root/.config/gsc/service-account.json
     chmod 600 /root/.config/gsc/service-account.json
     ```

   ⚠️ Claude environments have no dedicated secrets store yet — the variable is
   visible to anyone who can edit the environment. This key only grants Search
   Console access for properties you explicitly added it to; revoke anytime by
   deleting the key in Google Cloud or removing the user in GSC.
6. **Verify** — start a NEW session on this repo, approve the `gsc` MCP server
   when prompted (first-session approval is expected), then ask:
   *"List my Search Console properties."*

Local use (laptop): same `.mcp.json` works if `uv` is installed and you either
set `GSC_CREDENTIALS_PATH` to your key's path or place it at the default path.

## Standing workflows once live

- **Fix validation sweep** (`supergood/gsc-fix-validation-urls.txt` holds the
  82 URLs from the July 2026 duplicate-`inLanguage` fix): batch-inspect the
  URLs; for each, record `richResultsResult` verdict/issues and
  `lastCrawlTime`. A lingering issue with `lastCrawlTime` BEFORE 2026-07-21 is
  stale (Google hasn't recrawled), not a regression. Success metric: % of the
  82 with lastCrawlTime after the fix AND no duplicate-property issue.
  Quota: 2,000 inspections/day per property — a daily sweep uses 4%.
- **Weekly Phase 6 report** (per AI-CONSULTING-SEO-AEO-PLAN.md): impressions/
  clicks/position for queries matching "ai consulting", "ai agent consulting",
  "ai readiness", "ai automation consulting"; top pages; week-over-week deltas;
  service-page performance. Use `dataState: all` for freshness.
- **Recrawl nudge after content fixes**: bump `<lastmod>` in sitemap.xml for
  changed URLs, deploy, then resubmit the sitemap via the MCP.

## Notes

- Server auth mode is pinned headless (`GSC_SKIP_OAUTH=true`) so scheduled/
  background sessions never hang on a browser flow.
- Quotas (per property): URL inspection 2,000/day & 600/min; analytics up to
  25k rows/request, 50k rows/day, 16 months of history. Multi-property use
  doesn't share these limits.
- Destructive tools (add/delete site, delete sitemap) are disabled by default
  by the server; leave them that way.
