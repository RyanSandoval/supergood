# Blog Builder Skill

## ⚠️ CRITICAL RULE #1: USE THE TEMPLATE

**ALWAYS start with `supergood/BLOG-POST-TEMPLATE.html`**

Do NOT improvise. Do NOT use old posts as reference. Do NOT create HTML from scratch.

**Steps:**
1. Copy `supergood/BLOG-POST-TEMPLATE.html` to `supergood/site/blog/{{SLUG}}/index.html`
2. Replace ALL `{{PLACEHOLDERS}}` with actual content
3. Deploy

If you do not follow this, the blog post will have styling issues and we will have the same argument again tomorrow.

## Purpose
Create blog posts for supergood.solutions using the single authoritative template. Ensures 100% consistency across all posts.

## Design System Rules

### Required Elements
All blog posts MUST include:
1. **Proper dark theme colors** (see color variables below)
2. **Navigation with supergood wordmark and dots**
3. **Article structure**: tag, title, subtitle, meta, content
4. **Consistent typography** (Inter + JetBrains Mono)
5. **Schema.org structured data**
6. **Open Graph meta tags**

### Color Variables (REQUIRED)
```css
:root {
  --bg: #0a0a0b;
  --surface: #111113;
  --surface-2: #18181b;
  --border: #27272a;
  --text: #fafafa;
  --text-2: #a1a1aa;
  --text-3: #71717a;
  --green: #22c55e;
  --mono: 'JetBrains Mono', monospace;
}
```

### Typography Rules
- **Body**: Inter font family, 1rem size, --text-2 color
- **Headings**: Inter, specific weights, --text color
- **Code**: JetBrains Mono, --green color
- **Links**: --green color with underline

## Process

### 1. Content Creation
- Research topic thoroughly with proper citations
- Write in established brand voice (direct, opinionated, no corporate speak)
- Include practical takeaways and specific examples
- Add proper source links and citations

### 2. HTML Generation
- Use the blog post template (see template.html)
- Ensure dark theme styling matches existing posts
- Include proper meta tags and structured data
- Add navigation and footer

### 3. File Structure
```
supergood/site/blog/
├── post-slug/
│   └── index.html
└── index.html (updated with new post)
```

### 4. Update Process
1. Create post directory: `mkdir supergood/site/blog/post-slug`
2. Generate HTML file using template
3. Update blog index page with new post entry
4. Update sitemap.xml with new post URL
5. Commit and push to GitHub

## Templates

### Blog Post HTML Template
See `template.html` in this directory for the complete template.

### Blog Index Entry Template
```html
<a href="/blog/post-slug/" class="post-card">
  <div class="tag">Category · Topic</div>
  <h2>Post Title</h2>
  <p>Post description or excerpt.</p>
  <div class="meta">Date · Read time</div>
</a>
```

### Sitemap Entry Template
```xml
<url>
  <loc>https://supergood.solutions/blog/post-slug/</loc>
  <lastmod>YYYY-MM-DD</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>
```

## Template Checklist (DO THIS FIRST)
- [ ] Started with `supergood/BLOG-POST-TEMPLATE.html` (not an old post)
- [ ] Replaced ALL `{{PLACEHOLDERS}}` 
- [ ] Nav shows "superg●●d." with green dots (not plain text)
- [ ] Fixed positioning nav at top
- [ ] Dark theme colors working
- [ ] Article padding: 140px top, 80px bottom
- [ ] Sources section included
- [ ] CTA box included
- [ ] Footer included

## Brand Voice Checklist
Before publishing, verify:
- [ ] Direct, no-fluff writing
- [ ] Specific examples and data
- [ ] Proper source citations
- [ ] No corporate jargon
- [ ] Opinionated takes when appropriate
- [ ] Practical, actionable advice

## SEO Checklist
- [ ] Title tag optimized for keywords
- [ ] Meta description under 160 characters
- [ ] H1, H2, H3 structure for readability
- [ ] Internal links where relevant
- [ ] External links to authoritative sources
- [ ] Schema.org Article markup
- [ ] Open Graph tags for social sharing

## ⚠️ CRITICAL: Update Blog Index (MANDATORY)

After creating a new blog post, you **MUST** add it to `/supergood/site/blog/index.html`.

### How to Update Blog Index:

1. Open `supergood/site/blog/index.html`
2. Find the `<div class="post-list">` section (around line 80)
3. Add the new post card as the **FIRST** post (newest first)
4. Use this template:

```html
<a href="/blog/{{SLUG}}/" class="post-card">
  <div class="tag">{{TAG}} · {{CATEGORY}}</div>
  <h2>{{TITLE}}</h2>
  <p>{{DESCRIPTION}}</p>
  <div class="meta">{{MONTH DD, YYYY}} · {{X}} min read</div>
</a>
```

### Example Tags by Day:
- **Monday:** `Manual Work Monday · Workflows`
- **Tuesday:** `Tech Tuesday · Updates`
- **Wednesday:** `AI Wednesday · News`
- **Thursday:** `Case Study Thursday`
- **Friday:** `Future Friday · Trends`
- **Other:** `Guide · Power Platform`, `Guide`, etc.

### Deployment:
```bash
cd supergood/site
git add blog/index.html blog/{{SLUG}}/index.html
git commit -m "Add {{TITLE}} to blog"
git push origin main
```

**DO NOT SKIP THIS STEP** - The blog index must be updated or the new post won't show on the blog page.

## Common Mistakes to Avoid
❌ **Don't use light theme** - all posts must use dark theme
❌ **Don't create generic templates** - use the specific design system
❌ **Don't skip citations** - every claim needs a source
❌ **Don't use corporate speak** - write like a human
❌ **Don't forget mobile responsiveness** - test on small screens

## Examples
Good examples of properly formatted posts:
- `/blog/power-automate-for-marketing/` - matches design system perfectly
- Dark theme with proper color variables
- Consistent navigation and typography
- Proper article structure

## Files in This Skill
- `SKILL.md` - This instruction file
- `template.html` - Complete HTML template for blog posts
- `example-content.md` - Sample content structure