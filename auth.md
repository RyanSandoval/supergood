# Supergood authentication

Public reads and the fit-check POST do not use authentication. Send no `Authorization` header, no API key, and no cookie. There is no account to sign in to.

The calls are:

- `GET https://supergood.solutions/pricing.json`
- `GET https://supergood.solutions/services.json`
- `POST https://supergood-intake.vercel.app/api/intake`

The request and response shapes are in [openapi.json](https://supergood.solutions/openapi.json). A prose walkthrough is on the [developers page](https://supergood.solutions/developers/).

## Discover

There is no protected-resource metadata and no authorization-server metadata, because these URLs are public. A call does not return `401` and does not send `WWW-Authenticate`. Do not look for an `agent_auth` block. None is published.

## Pick a method

The only method is to call the URL. `anonymous`, `identity_assertion`, `service_auth`, and `id-jag` are not offered. There is no identity to register and no assertion to mint.

## Register

Do not register a client. There is no `identity_endpoint`.

## Claim

There is no claim step and no claim URL. The fit check is the message itself: `name`, `email`, and `handoff` in the JSON body.

## Exchange

There is no token endpoint and nothing to exchange. Do not mint an access token.

## Use the access_token

There is no access token. Call the three URLs above with `Content-Type: application/json` on the POST and no credential on any of them.

## Errors

The intake function returns JSON. `405` with `{"ok":false,"error":"method"}` means you used a method other than POST. `400` with `{"ok":false,"error":"required"}` means `name`, `email`, or `handoff` was missing or not a string. `400` with `{"ok":false,"error":"email"}` means the email did not look like a complete address. Fix the body and send one request. A missing path on `supergood.solutions` is an HTML 404 from GitHub Pages, not a JSON error.

## Revocation

There is no token to revoke and no revocation endpoint. A fit check that already returned `{"ok":true}` is an email in Ryan's inbox. To ask about that note, email ryan@supergood.solutions.
