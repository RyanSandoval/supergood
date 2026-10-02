/**
 * Supergood Solutions — /start/ intake webhook (Google Apps Script)
 *
 * DEPLOY STEPS (do these once, in order):
 *
 *   1. Create a new Google Sheet. Name it something like "Supergood intake".
 *   2. Copy the Sheet ID out of its URL and paste it into SHEET_ID below.
 *      The URL looks like:
 *        https://docs.google.com/spreadsheets/d/<THIS_PART_IS_THE_ID>/edit
 *   3. Put your own address in NOTIFY_EMAIL below.
 *   4. In that Sheet: Extensions → Apps Script. Delete the stub Code.gs
 *      contents and paste this whole file in. Save (the project name does not
 *      matter).
 *   5. Deploy → New deployment → Select type: Web app.
 *        Description:      supergood intake
 *        Execute as:       Me (your account)
 *        Who has access:   Anyone
 *      Click Deploy, approve the permission prompt (it needs Sheets + Gmail
 *      to append rows and send you the notification).
 *   6. Copy the Web app URL it hands back. It looks like
 *        https://script.google.com/macros/s/AKfy..../exec
 *   7. Paste that URL into WEBHOOK_URL at the top of the <script> block in
 *      /start/index.html, replacing PASTE_APPS_SCRIPT_WEB_APP_URL_HERE.
 *   8. Commit, push, then submit the live form once and confirm a row lands in
 *      the Sheet and the email arrives.
 *
 *   Re-deploying after an edit: Deploy → Manage deployments → pencil icon →
 *   Version: New version → Deploy. The URL stays the same.
 *
 * SPAM NOTE: this endpoint is public and unauthenticated by design. The site is
 * static HTML on GitHub Pages, so there is no server to hold a shared secret and
 * anything in the page's JS is readable by anyone. Defense is three layers:
 * a honeypot field, a minimum-fill-time check in the browser, and required-field
 * validation on both sides. If spam ever gets through, the upgrade path is
 * Cloudflare Turnstile: drop the free widget on /start/ and verify the token
 * here with a UrlFetchApp call to siteverify before appending the row.
 */

const SHEET_ID = 'CHANGE_ME_SHEET_ID';
const SHEET_NAME = 'Sheet1'; // tab name — change if your tab isn't "Sheet1"
const NOTIFY_EMAIL = 'CHANGE_ME@example.com';

const HEADERS = [
  'timestamp', 'name', 'email', 'company', 'role', 'handoff',
  'currentState', 'teamSize', 'timeline', 'budget', 'source', 'ua'
];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'empty body' });
    }

    const data = JSON.parse(e.postData.contents);

    // Honeypot. The browser hides this field, so anything in it is a bot.
    if (str(data.company).length > 0) {
      return json({ ok: false, error: 'rejected' });
    }

    const name = str(data.name);
    const email = str(data.email);
    const handoff = str(data.handoff);

    if (!name || !email || !handoff) {
      return json({ ok: false, error: 'missing required field' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return json({ ok: false, error: 'invalid email' });
    }

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      return json({ ok: false, error: 'sheet tab not found: ' + SHEET_NAME });
    }

    // Write the header row once, so a fresh Sheet is readable without setup.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
    }

    sheet.appendRow([
      new Date(),
      name,
      email,
      str(data.companyName),
      str(data.role),
      handoff,
      str(data.currentState),
      str(data.teamSize),
      str(data.timeline),
      str(data.budget),
      str(data.source),
      str(data.ua)
    ]);

    try {
      const who = str(data.companyName) || '(no company)';
      const subject = 'New Supergood intake: ' + name + ' at ' + who;
      const body = [
        'Name: ' + name,
        'Email: ' + email,
        'Company: ' + str(data.companyName),
        'Role: ' + str(data.role),
        '',
        'What they would hand off:',
        handoff,
        '',
        'Where it is today: ' + str(data.currentState),
        'People who touch it: ' + str(data.teamSize),
        'Timeline: ' + str(data.timeline),
        'Budget: ' + str(data.budget),
        '',
        'Source: ' + str(data.source),
        'Submitted at: ' + str(data.submittedAt),
        'UA: ' + str(data.ua)
      ].join('\n');
      MailApp.sendEmail(NOTIFY_EMAIL, subject, body);
    } catch (mailErr) {
      // The row is already saved, so a failed notification is not a failed
      // submission. Log it and still return ok.
      console.error('Email send failed:', mailErr);
    }

    return json({ ok: true });
  } catch (err) {
    console.error('doPost failed:', err);
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return ContentService
    .createTextOutput('Supergood intake webhook — POST only')
    .setMimeType(ContentService.MimeType.TEXT);
}

function str(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
