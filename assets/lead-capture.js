// Supergood Solutions — shared blog lead-capture handler.
//
// Wires up every `<form data-lead-capture>` on the page (blog post pages +
// the blog index page) to POST straight from the browser to a Google Apps
// Script webhook — see scripts/blog-lead-intake.gs in the source repo for
// the backend that receives this payload and appends it to a Google Sheet.
//
// This is a static site (GitHub Pages, no server), so there is no way to
// keep LEAD_INTAKE_SECRET truly private — it is visible to anyone who views
// this file's source. That's an accepted tradeoff: the secret is only a
// weak spam deterrent (keeps the most naive bots from hitting the webhook
// directly), not real security. Do not treat it as one.
//
// ---------------------------------------------------------------------
// TO ACTIVATE: replace the two placeholder constants below with the real
// values you get after deploying scripts/blog-lead-intake.gs as a Google
// Apps Script Web App. This is the ONLY file that needs editing — every
// blog page (new and backfilled) already loads this file via
// <script src="/assets/lead-capture.js" defer></script>, so updating the
// two constants here instantly wires up every page at once.
// ---------------------------------------------------------------------
(function () {
  'use strict';

  var LEAD_WEBHOOK_URL = "REPLACE_WITH_DEPLOYED_APPS_SCRIPT_URL";
  var LEAD_INTAKE_SECRET = "REPLACE_ME";

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function showError(form, message) {
    var errEl = form.querySelector('[data-lead-error]');
    if (errEl) {
      errEl.textContent = message;
      errEl.style.display = 'block';
    }
  }

  function showSuccess(form) {
    var wrap = form.closest('[data-lead-capture-wrap]') || form.parentNode;
    var success = wrap ? wrap.querySelector('[data-lead-success]') : null;
    form.style.display = 'none';
    if (success) success.style.display = 'block';
  }

  function resetSubmitState(form) {
    var btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Subscribe';
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    var form = e.target;

    // Honeypot: real visitors never fill or even see this field.
    var honeypot = form.querySelector('[name="company"]');
    if (honeypot && honeypot.value.trim()) {
      showSuccess(form);
      return;
    }

    var emailField = form.querySelector('[name="email"]');
    var email = emailField ? emailField.value.trim() : '';
    if (!email || !EMAIL_RE.test(email)) {
      showError(form, "That email doesn't look right.");
      return;
    }

    var nameField = form.querySelector('[name="name"]');
    var name = nameField ? nameField.value.trim() : '';

    var payload = {
      name: name,
      email: email,
      source: window.location.href,
      ua: navigator.userAgent,
      submittedAt: new Date().toISOString(),
      secret: LEAD_INTAKE_SECRET
    };

    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
    }

    // Apps Script web apps generally don't return CORS-friendly responses
    // to cross-origin fetch(), so we can't reliably read res.ok here. Treat
    // the request completing (success or opaque failure) as success from
    // the visitor's point of view — the honeypot + secret handle spam, and
    // a failed webhook call isn't something a visitor can act on anyway.
    fetch(LEAD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    }).then(function () {
      showSuccess(form);
    }).catch(function (err) {
      console.error('[lead-capture] webhook fetch failed:', err);
      showSuccess(form);
    }).finally(function () {
      resetSubmitState(form);
    });
  }

  function isConfigured() {
    return LEAD_WEBHOOK_URL.indexOf('REPLACE_WITH') !== 0;
  }

  function init() {
    var forms = document.querySelectorAll('form[data-lead-capture]');

    // Until the Apps Script webhook is deployed there is nowhere to put an
    // address, so hide the subscribe card rather than render a form that
    // takes an email and drops it. The per-post CTA above it is unaffected
    // and keeps working, since booking a call needs no backend. Flipping
    // LEAD_WEBHOOK_URL to the real URL reveals the form on every page at
    // once, with no re-edit of any post.
    if (!isConfigured()) {
      console.warn('[lead-capture] LEAD_WEBHOOK_URL is still a placeholder — subscribe form hidden.');
      for (var h = 0; h < forms.length; h++) {
        var wrap = forms[h].closest('[data-lead-capture-wrap]');
        if (wrap) wrap.style.display = 'none';
      }
      return;
    }

    for (var i = 0; i < forms.length; i++) {
      forms[i].addEventListener('submit', onSubmit);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
