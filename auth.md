---
title: "Supergood authentication"
description: "No authentication is needed for the public reads, the fit-check POST, or the MCP server. This page says so in the format agents look for."
canonical: https://supergood.solutions/auth.md
last-updated: 2026-10-30
---

# Supergood authentication

Public reads and the fit-check POST do not use authentication. Send no `Authorization` header, no API key, and no cookie. There is no account to sign in to.

The calls are:

- `GET https://supergood.solutions/pricing.json`
- `GET https://supergood.solutions/services.json`
- `POST https://supergood-intake.vercel.app/api/intake`
- MCP server (Streamable HTTP): `https://supergood-intake.vercel.app/api/mcp`. Server card: `https://supergood.solutions/.well-known/mcp/server-card.json`.

The request and response shapes are in [openapi.json](https://supergood.solutions/openapi.json). A prose walkthrough is on the [developers page](https://supergood.solutions/developers/).

## Discover

There is no protected-resource metadata and no authorization-server metadata, because these URLs are public. A call does not return `401` and does not send `WWW-Authenticate`. Do not look for an `agent_auth` block. None is published.

## Pick a method

The only method is to call the URL. `anonymous`, `identity_assertion`, `service_auth`, and `id-jag` are not offered. There is no identity to register and no assertion to mint.

## Register

Do not register a client. There is no `identity_endpoint`.

## Claim

There is no claim step and no claim URL. The fit check is the message itself: `name`, `email`, `handoff`, and `paysForTools` in the JSON body.

## Exchange

There is no token endpoint and nothing to exchange. Do not mint an access token.

## Use the access_token

There is no access token. Call the URLs above with `Content-Type: application/json` on the POST and no credential on any of them. The MCP server takes no `Authorization` header either.

## Errors

The intake function and the MCP tool return JSON: `{"ok":false,"error":"<code>","message":"...","hint":"..."}`. `error` is a stable code, `message` says what went wrong, and `hint` says how to fix it. No call here returns `401` or `WWW-Authenticate`.

- `400` `required`: `name`, `email`, or `handoff` was missing or empty.
- `400` `email`: the address was not complete.
- `400` `paysForTools`: send `Yes`, `Not sure`, or `No`.
- `400` `json`: the body was not a JSON object.
- `403` `origin`: a browser request from an origin other than supergood.solutions. Call from a server, or use the form.
- `405` `method`: use POST.
- `429` `rate_limited`: too many requests. Wait a minute.
- `500` `server` and `502` `send`: the endpoint or the email delivery failed. Try again later.

A missing path on `supergood.solutions` is an HTML 404 from GitHub Pages, not a JSON error.

## Revocation

There is no token to revoke and no revocation endpoint. A fit check that already returned `{"ok":true}` is an email in Ryan's inbox. To ask about that note, email ryan@supergood.solutions.
