# Supergood authentication

Public reads and the fit-check POST do not use authentication. Send no `Authorization` header, no API key, and no cookie. There is no account to sign in to.

Last updated: 2026-10-30.

The calls are:

- `GET https://supergood.solutions/pricing.json`
- `GET https://supergood.solutions/services.json`
- `POST https://api.supergood.solutions/api/intake`
- MCP server (Streamable HTTP): `https://api.supergood.solutions/api/mcp`. Server card: `https://supergood.solutions/.well-known/mcp/server-card.json`.

The request and response shapes are in [openapi.json](https://supergood.solutions/openapi.json). A prose walkthrough is on the [developers page](https://supergood.solutions/developers/).

## Discover

Fetch `https://api.supergood.solutions/.well-known/oauth-protected-resource` (RFC 9728). It returns `200` JSON. `authorization_servers` is an empty list because no authorization server exists. The `agent_auth` block is `{"skill":"https://supergood.solutions/auth.md","identity_types_supported":["anonymous"]}`. The same document is at `https://supergood.solutions/.well-known/oauth-protected-resource`. No call returns `401` and none sends `WWW-Authenticate`. There is no authorization-server metadata to fetch.

## Pick a method

`anonymous` is the only identity type. Use it by sending the request with no credential. `identity_assertion`, `service_auth`, and `id-jag` are not offered. There is no identity to mint and no assertion to sign.

## Register

Do not register a client. There is no `identity_endpoint` and no registration endpoint. An anonymous caller is already allowed.

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

A missing path on `api.supergood.solutions` returns the same JSON shape with status `404`. A missing path on `supergood.solutions` is an HTML 404 from GitHub Pages, not a JSON error. Send API calls to `api.supergood.solutions`.

## Revocation

There is no token to revoke and no revocation endpoint. A fit check that already returned `{"ok":true}` is an email in Ryan's inbox. To ask about that note, email ryan@supergood.solutions.
