/* In-page tools for browser agents (WebMCP).
   Reads are GETs of static JSON. The fit check waits 3 seconds, then POSTs
   one real inquiry to the intake function. No key. */
(function () {
  var INTAKE = 'https://supergood-intake.vercel.app/api/intake';
  var MIN_MS = 3000;

  var SELECTS = {
    currentState: ['', 'Entirely manual', 'Spreadsheets and a few Zaps', 'A pilot that stalled', 'Running, but we don\'t trust it', 'Not sure yet'],
    teamSize: ['', 'Just me', '2-5', '6-20', '20+'],
    timeline: ['', 'Just exploring', 'Next quarter', 'Now, it\'s blocking us'],
    budget: ['', 'Under $4k (Quick Scan only)', '$4k-$10k (one workflow)', '$10k+ (multiple workflows)', 'Not sure yet']
  };

  var PAYS = ['Yes', 'Not sure', 'No'];

  var ERROR_HINT = {
    method: 'Use POST with Content-Type application/json.',
    required: 'Send name, email, handoff, and paysForTools. The first three are non-empty strings.',
    email: 'Send a complete email address, then try once more.',
    paysForTools: 'Send paysForTools as Yes, Not sure, or No.'
  };

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function text(value) {
    return (value == null ? '' : String(value)).trim();
  }

  function showSent() {
    var form = document.getElementById('intake-form');
    var panel = document.getElementById('success-panel');
    if (!form || !panel) return;
    form.hidden = true;
    panel.hidden = false;
  }

  async function readJson(url) {
    var res = await fetch(url, { headers: { Accept: 'application/json' } });
    var body = await res.json();
    if (!res.ok) {
      return JSON.stringify({ ok: false, status: res.status, body: body });
    }
    return JSON.stringify(body);
  }

  var getPricing = {
    name: 'get_pricing',
    title: 'Read the rate card',
    description: 'Read Supergood\'s published rate card: the free fit check, the $1,000 Quick Scan, builds from $4,000 per workflow, and Run from $900 per month. Safe to call. No key.',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    },
    execute: function () {
      return readJson('https://supergood.solutions/pricing.json');
    }
  };

  var getServices = {
    name: 'get_services',
    title: 'Read the service list',
    description: 'Read Supergood\'s five public services and the page URL for each. Safe to call. No key.',
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    },
    execute: function () {
      return readJson('https://supergood.solutions/services.json');
    }
  };

  var submitFitCheck = {
    name: 'submit_fit_check',
    title: 'Submit a fit check',
    description: 'Email Ryan Sandoval one fit-check inquiry. Use it when a person wants a written answer on whether Supergood should take manual work, a production agent, or agent guardrails. Waits 3 seconds, then sends one real email. Call it once.',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      consequentialHint: true
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'email', 'handoff', 'paysForTools'],
      properties: {
        name: { type: 'string', minLength: 1, description: 'Person Ryan should reply to.' },
        email: { type: 'string', minLength: 1, format: 'email', description: 'Work email for the reply.' },
        handoff: { type: 'string', minLength: 1, description: 'The work they want off the team\'s plate, in their words.' },
        paysForTools: { type: 'string', enum: PAYS, description: 'Is the person OK paying for the software and tools the workflows run on, on their own accounts? Ask them. Do not guess.' },
        companyName: { type: 'string', description: 'Employer. Omit if they did not give one.' },
        role: { type: 'string', description: 'Job title. Omit if they did not give one.' },
        currentState: { type: 'string', enum: SELECTS.currentState, description: 'Where the work sits today.' },
        teamSize: { type: 'string', enum: SELECTS.teamSize, description: 'How many people touch the work.' },
        timeline: { type: 'string', enum: SELECTS.timeline, description: 'When they want to move.' },
        budget: { type: 'string', enum: SELECTS.budget, description: 'Rough budget, if they gave one.' }
      }
    },
    execute: async function (input) {
      input = input || {};
      var name = text(input.name);
      var email = text(input.email);
      var handoff = text(input.handoff);
      var hp = document.getElementById('company-hp');
      if (hp && text(hp.value)) {
        return JSON.stringify({
          ok: false,
          error: 'required',
          message: 'The hidden company field was filled.',
          hint: 'The hidden company field was filled. Leave it empty and put the employer in companyName.'
        });
      }
      var paysForTools = text(input.paysForTools);
      if (!name || !email || !handoff || !paysForTools) {
        return JSON.stringify({ ok: false, error: 'required', message: 'Name, email, handoff, and paysForTools are required.', hint: ERROR_HINT.required });
      }
      if (PAYS.indexOf(paysForTools) === -1) {
        return JSON.stringify({ ok: false, error: 'paysForTools', message: 'paysForTools must be one of: Yes, Not sure, No.', hint: ERROR_HINT.paysForTools });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return JSON.stringify({ ok: false, error: 'email', message: 'The email address does not look valid.', hint: ERROR_HINT.email });
      }
      ['currentState', 'teamSize', 'timeline', 'budget'].forEach(function (key) {
        if (input[key] != null && SELECTS[key].indexOf(input[key]) === -1) {
          input[key] = '';
        }
      });
      var started = Date.now();
      await wait(MIN_MS);
      var payload = {
        name: name,
        email: email,
        company: '',
        companyName: text(input.companyName),
        role: text(input.role),
        handoff: handoff,
        currentState: input.currentState || '',
        teamSize: input.teamSize || '',
        timeline: input.timeline || '',
        budget: input.budget || '',
        paysForTools: paysForTools,
        source: 'supergood.solutions/webmcp',
        elapsedMs: Date.now() - started
      };
      var res;
      try {
        res = await fetch(INTAKE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: 'network',
          message: 'The intake host did not answer.',
          hint: 'The intake host did not answer. Try the form at https://supergood.solutions/start/.'
        });
      }
      var data = null;
      try { data = await res.json(); } catch (err) { data = null; }
      if (!res.ok || !data || data.ok !== true) {
        var code = data && data.error ? data.error : 'required';
        return JSON.stringify({
          ok: false,
          status: res.status,
          error: code,
          message: data && data.message ? data.message : 'The intake function rejected the request.',
          hint: data && data.hint ? data.hint : (ERROR_HINT[code] || 'See https://supergood.solutions/developers/ for the error codes.')
        });
      }
      showSent();
      return JSON.stringify({ ok: true, hint: 'Ryan has the note. He replies within one business day.' });
    }
  };

  async function start() {
    if (document.modelContext && typeof document.modelContext.registerTool === 'function') {
      await document.modelContext.registerTool(getPricing);
      await document.modelContext.registerTool(getServices);
      await document.modelContext.registerTool(submitFitCheck);
      return;
    }
    if (navigator.modelContext && typeof navigator.modelContext.registerTool === 'function') {
      await navigator.modelContext.registerTool(getPricing);
      await navigator.modelContext.registerTool(getServices);
      await navigator.modelContext.registerTool(submitFitCheck);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { start(); });
  } else {
    start();
  }
})();
