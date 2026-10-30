---
title: Privacy | Supergood Solutions
description: What the fit-check form sends, where that note goes, and the one analytics tag on supergood.solutions.
canonical: https://supergood.solutions/privacy/
last-updated: 2026-10-29
---

# Privacy

Supergood Solutions is Ryan Sandoval's consulting practice in Los Angeles. This page says what the site collects and what happens to it.

## The fit check

The form at [https://supergood.solutions/start/](https://supergood.solutions/start/) asks for a name, a work email, and a description of the work you would hand off. It also asks whether you are OK paying for the tools your workflows run on (Yes, Not sure, or No). Company, role, where the work sits today, how many people touch it, timeline, and budget are optional.

The page also sends how many milliseconds passed since you focused a field, and a source string (`supergood.solutions/start` from the form, `supergood.solutions/webmcp` from the in-page tool). A hidden field named `company` is a honeypot. Leave it empty. The employer name, if you give one, is `companyName`.

The browser posts that JSON to `https://supergood-intake.vercel.app/api/intake`. The function emails the note to Ryan through Resend. Resend carries that one message. The note is not added to a newsletter list, and it is not sold.

## Analytics

Pages load Google Analytics, measurement id `G-JLBDSQ3B4P`. That is the only analytics tag. The static pages do not run an account system of their own.

## Accounts and payment

The site has no accounts and no payment form. The rate card is public. Paying for a Quick Scan or a build happens after Ryan replies, off this domain.

## A note you already sent

Email ryan@supergood.solutions and say what you want done with it. He reads those. There is no login on this site that deletes a row, because the note lives in his inbox, not in a customer database on this domain.

Los Angeles, California. Last updated 2026-10-29.
