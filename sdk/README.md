# supergood-solutions

A JavaScript SDK and command line tool for the public API of [Supergood Solutions](https://supergood.solutions), an AI consulting practice for marketing and ops teams. Read the rate card and service list, dry-run a fit check against a sandbox, and get connection details for the hosted MCP server. Zero dependencies. Node 18 or newer.

The API is anonymous. There is no key, token or account.

## Install

```sh
npm install supergood-solutions
```

Or run the CLI without installing:

```sh
npx supergood-solutions pricing
```

## Examples

### 1. Read pricing from a terminal

```sh
npx supergood-solutions pricing
npx supergood-solutions services --json
```

`--json` prints the raw document, which is what an agent or a script wants.

### 2. Read pricing from code

```js
import { getPricing, getServices } from 'supergood-solutions';

const pricing = await getPricing();
for (const offer of pricing.offers) {
  console.log(offer.name, offer.price ?? `from ${offer.priceFrom}`, offer.unit);
}

const { services } = await getServices();
console.log(services.map((s) => s.id));
```

### 3. Dry-run a fit check

```sh
npx supergood-solutions fit-check \
  --name "Ada Lovelace" --email ada@example.com \
  --message "A Monday report rebuilt by hand from three spreadsheets" \
  --pays-for-tools Yes
```

```js
import { submitFitCheck, SupergoodError } from 'supergood-solutions';

try {
  const result = await submitFitCheck({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    handoff: 'A Monday report rebuilt by hand from three spreadsheets',
    paysForTools: 'Yes',
  });
  console.log(result); // { ok: true, sandbox: true, message: '...' }
} catch (err) {
  if (err instanceof SupergoodError) console.error(err.status, err.code, err.hint, err.requestId);
  else throw err;
}
```

## Sending a real fit check

**`--live` on the CLI and `{ sandbox: false }` in code send a real email to Ryan.** Use them only when you want Supergood to read and answer your note. One inquiry per person.

By default both the CLI and `submitFitCheck` use the sandbox. The sandbox runs the same validation as the real endpoint and sends nothing. The CLI prints a one-line warning when you pass `--live` and generates an `Idempotency-Key` so a retry of the same request does not send a second email.

```sh
npx supergood-solutions fit-check --live --name "Ada Lovelace" --email ada@example.com --message "..." --pays-for-tools Yes
```

```js
await submitFitCheck(body, { sandbox: false, idempotencyKey: crypto.randomUUID() });
```

## SDK

| Function | Returns |
| --- | --- |
| `getPricing(options?)` | The rate card from `/pricing.json` |
| `getServices(options?)` | The service list from `/services.json` |
| `submitFitCheck(body, { sandbox = true, idempotencyKey }?)` | `{ ok, sandbox, message }` from the sandbox, or `{ ok: true }` when `sandbox: false` |
| `mcpConfig()` | MCP URL, transport, tool names and ready-to-paste config objects |
| `createClient(defaults)` | The same functions with options bound |

Options: `baseUrl` (default `https://supergood.solutions`), `apiUrl` (default `https://api.supergood.solutions`), `fetch`, `timeoutMs`.

Errors are `SupergoodError` with `status`, `code`, `hint`, `body` (the API's error envelope), `requestId` (from `x-request-id` or `x-vercel-id` when the response has one) and `retryAfter`. Network failures have status 0 and code `network`. A 429 is retried once after the `Retry-After` delay, up to 30 seconds. Types ship in `index.d.ts` and follow the OpenAPI schemas.

## CLI

```
supergood-solutions pricing [--json]
supergood-solutions services [--json]
supergood-solutions fit-check --name <n> --email <e> --message <text> [--live]
supergood-solutions mcp [--json]
```

Exit codes: 0 ok, 1 usage error, 2 API or network error. Run `supergood-solutions --help` for every option.

## MCP

`supergood-solutions mcp` prints the connection details for the Supergood MCP server: `https://api.supergood.solutions/api/mcp`, Streamable HTTP, no key. Tools: `get_pricing` and `get_services` are read-only. `submit_fit_check` sends a real email, like `--live`.

```json
{
  "mcpServers": {
    "supergood": { "url": "https://api.supergood.solutions/api/mcp" }
  }
}
```

This package is a client for that hosted server. It does not run an MCP server itself.

## Links

- Supergood API documentation: https://supergood.solutions/developers/
- OpenAPI contract: https://supergood.solutions/openapi.json
- Supergood MCP server: https://api.supergood.solutions/api/mcp
- Pricing page: https://supergood.solutions/pricing/

## Tests

```sh
npm test
```

Unit tests stub `fetch`. Two live tests read production pricing and call the sandbox once. Set `SUPERGOOD_OFFLINE=1` to skip them. No test calls the real intake endpoint.

## License

MIT
