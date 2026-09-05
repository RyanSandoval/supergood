// Supergood Solutions — GA4 custom event wiring.
//
// The gtag.js base tag lives in each page's <head> (injected by
// scripts/ga4_block.py in the source repo) and handles page_view on its own.
// GA4 Enhanced Measurement handles scroll (90%), outbound clicks, and file
// downloads with no code. This file adds only the events GA4 cannot infer:
// the ones tied to *this* site's actual conversion path.
//
// Events emitted here:
//   book_call_click   — click on the Google Calendar booking link (primary
//                       conversion; mark as a key event in GA4)
//   cta_click         — click on a service-page link inside a post's CTA card
//   newsletter_submit — subscribe form submitted and passed client validation
//   generate_lead     — subscribe form actually accepted by the webhook
//   read_complete     — reader reached 90% of an article, once per pageview
//
// Every event carries post_slug + page_type so blog posts can be ranked by
// which ones actually produce calls, rather than by pageviews.
(function () {
  'use strict';

  function gtag() {
    // gtag is defined by the base tag in <head>. If GA4 is blocked or the
    // base tag is missing, degrade silently — never throw on a content page.
    if (typeof window.gtag !== 'function') return;
    window.gtag.apply(null, arguments);
  }

  // "/blog/some-post/" -> "some-post". Root and section pages get "".
  function postSlug() {
    var m = window.location.pathname.match(/^\/blog\/([^/]+)\/?$/);
    return m ? m[1] : '';
  }

  function pageType() {
    var p = window.location.pathname;
    if (p === '/' || p === '') return 'home';
    if (/^\/blog\/[^/]+\/?$/.test(p)) return 'post';
    if (/^\/blog\/?$/.test(p)) return 'blog_index';
    return 'service';
  }

  var BASE = { post_slug: postSlug(), page_type: pageType() };

  function withBase(params) {
    var out = { post_slug: BASE.post_slug, page_type: BASE.page_type };
    for (var k in params) {
      if (Object.prototype.hasOwnProperty.call(params, k)) out[k] = params[k];
    }
    return out;
  }

  // --- Clicks -------------------------------------------------------------
  // One delegated listener rather than per-element binding, so the CTA block
  // can be re-rendered or backfilled without re-running any setup.
  document.addEventListener(
    'click',
    function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;

      var href = a.getAttribute('href') || '';

      if (href.indexOf('calendar.app.google') !== -1) {
        gtag('event', 'book_call_click', withBase({ link_url: href }));
        return;
      }

      // Service-page links. On a post these are the CTA card; elsewhere they
      // are nav/body links, and page_type separates the two in reporting.
      if (/^\/(ai-agent-consulting|ai-consulting|ai-automation-consulting|ai-readiness-assessment|ai-agent-governance)\/?$/.test(href)) {
        gtag('event', 'cta_click', withBase({ cta_target: href, link_text: (a.textContent || '').trim().slice(0, 100) }));
      }
    },
    true
  );

  // --- Subscribe form -----------------------------------------------------
  // newsletter_submit fires on any submit that clears client-side validation,
  // so there is signal even while the Apps Script webhook is unconfigured.
  // generate_lead fires only on a confirmed accept — lead-capture.js dispatches
  // `supergood:lead-captured` on the form after the webhook returns OK.
  document.addEventListener(
    'submit',
    function (e) {
      var form = e.target;
      if (!form || !form.hasAttribute || !form.hasAttribute('data-lead-capture')) return;
      var email = form.querySelector('[name="email"]');
      if (!email || !email.value.trim()) return;
      gtag('event', 'newsletter_submit', withBase({ form_location: BASE.page_type }));
    },
    true
  );

  document.addEventListener('supergood:lead-captured', function () {
    gtag('event', 'generate_lead', withBase({ method: 'blog_subscribe' }));
  }, true);

  // --- Read depth ---------------------------------------------------------
  // Fires once per pageview when the reader passes 90% of the scrollable
  // height. GA4's built-in scroll event fires at 90% of the *page*, which on
  // a post page includes the CTA + footer; this is close enough in practice,
  // but having our own event with post_slug attached makes the blog report
  // usable without a custom dimension on the built-in event.
  if (pageType() === 'post') {
    var fired = false;
    var ticking = false;

    function check() {
      ticking = false;
      if (fired) return;
      var d = document.documentElement;
      var max = d.scrollHeight - d.clientHeight;
      if (max <= 0) return;
      var y = window.scrollY || window.pageYOffset || d.scrollTop || 0;
      if (y / max < 0.9) return;
      fired = true;
      gtag('event', 'read_complete', withBase({ percent_scrolled: 90 }));
      window.removeEventListener('scroll', onScroll);
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(check);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  }
})();
