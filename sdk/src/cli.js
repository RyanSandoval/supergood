import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { getPricing, getServices, submitFitCheck, mcpConfig, SupergoodError } from './index.js';

const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

const HELP = `supergood-solutions ${VERSION}
Read Supergood Solutions pricing and services, dry-run a fit check, or print MCP config.

Usage:
  supergood-solutions pricing [--json]
  supergood-solutions services [--json]
  supergood-solutions fit-check --name <n> --email <e> --message <text> [options]
  supergood-solutions mcp [--json]

fit-check dry-runs against the sandbox by default. It sends nothing.
  --live                    Send for real. This emails Ryan.
  --sandbox                 Explicit dry run (the default)
  --message <text>          What manual work you want off your plate (alias: --handoff)
  --pays-for-tools <v>      Yes, Not sure, or No
  --company-name <text>     --role <text>   --current-state <text>
  --team-size <text>        --timeline <text>   --budget <text>
  --source <text>           --idempotency-key <key>   (live runs generate one)

Global options:
  --json                    Machine-readable output
  --api-url <url>           Override https://api.supergood.solutions
  --base-url <url>          Override https://supergood.solutions
  -h, --help                Show this help
  -v, --version             Show the version

Exit codes: 0 ok, 1 usage error, 2 API or network error.
Docs: https://supergood.solutions/developers/
`;

const BOOLEAN_FLAGS = new Set(['json', 'live', 'sandbox', 'help', 'version']);
const VALUE_FLAGS = new Set([
  'name', 'email', 'message', 'handoff', 'pays-for-tools', 'company-name', 'role', 'current-state',
  'team-size', 'timeline', 'budget', 'source', 'idempotency-key', 'api-url', 'base-url',
]);

class UsageError extends Error {}

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    let arg = argv[i];
    if (arg === '-h') arg = '--help';
    if (arg === '-v') arg = '--version';
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    let [key, inline] = arg.slice(2).split(/=(.*)/s, 2);
    if (BOOLEAN_FLAGS.has(key)) {
      flags[key] = true;
    } else if (VALUE_FLAGS.has(key)) {
      const value = inline ?? argv[++i];
      if (value === undefined) throw new UsageError(`--${key} needs a value`);
      flags[key] = value;
    } else {
      throw new UsageError(`Unknown option --${key}`);
    }
  }
  return { flags, positional };
}

function table(rows) {
  const widths = rows[0].map((_, c) => Math.max(...rows.map((r) => String(r[c]).length)));
  return rows.map((r) => r.map((cell, c) => String(cell).padEnd(widths[c])).join('  ').trimEnd()).join('\n');
}

const money = (n) => `$${Number(n).toLocaleString('en-US')}`;

function priceLabel(offer) {
  if (offer.price === 0) return 'Free';
  if (offer.price != null) return money(offer.price);
  if (offer.priceFrom != null) return `from ${money(offer.priceFrom)}`;
  return '';
}

function formatPricing(doc) {
  const rows = [['OFFER', 'PRICE', 'UNIT'], ...doc.offers.map((o) => [o.name, priceLabel(o), o.unit])];
  const notes = doc.offers.map((o) => `  ${o.id}: ${o.summary}`).join('\n');
  return `${doc.provider} rate card (${doc.currency}, updated ${doc.updated})\n\n${table(rows)}\n\n${notes}\n\n${doc.tooling}\n${doc.url}`;
}

function formatServices(doc) {
  const rows = [['SERVICE', 'URL'], ...doc.services.map((s) => [s.name, s.url])];
  const notes = doc.services.map((s) => `  ${s.id}: ${s.summary}`).join('\n');
  return `${doc.provider} services (updated ${doc.updated})\n\n${table(rows)}\n\n${notes}`;
}

function formatMcp(cfg) {
  return [
    `Supergood MCP server`,
    `  URL:        ${cfg.url}`,
    `  Transport:  Streamable HTTP (stateless, no API key)`,
    `  Tools:      ${cfg.tools.join(', ')}`,
    `  Note:       submit_fit_check emails Ryan. get_pricing and get_services are read-only.`,
    ``,
    `Cursor and other clients with remote server support:`,
    JSON.stringify(cfg.clientConfig, null, 2),
    ``,
    `Claude Desktop (stdio, bridged with the mcp-remote package):`,
    JSON.stringify(cfg.stdioBridgeConfig, null, 2),
  ].join('\n');
}

/**
 * Run the CLI. Returns the exit code. `io` lets tests capture output and stub fetch.
 */
export async function run(argv, io = {}) {
  const out = io.stdout ?? ((s) => process.stdout.write(s));
  const err = io.stderr ?? ((s) => process.stderr.write(s));
  const log = (s) => out(`${s}\n`);
  const warn = (s) => err(`${s}\n`);

  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (e) {
    warn(`${e.message}\nRun supergood-solutions --help for usage.`);
    return 1;
  }
  const { flags, positional } = parsed;

  if (flags.help) {
    log(HELP.trimEnd());
    return 0;
  }
  if (flags.version) {
    log(VERSION);
    return 0;
  }
  const [command, ...extra] = positional;
  if (!command) {
    warn(HELP.trimEnd());
    return 1;
  }
  if (extra.length) {
    warn(`Unexpected argument: ${extra[0]}`);
    return 1;
  }

  const clientOptions = {
    baseUrl: flags['base-url'],
    apiUrl: flags['api-url'],
    fetch: io.fetch,
    sleep: io.sleep,
  };
  const emit = (data, human) => log(flags.json ? JSON.stringify(data, null, 2) : human(data));

  try {
    switch (command) {
      case 'pricing':
        emit(await getPricing(clientOptions), formatPricing);
        return 0;
      case 'services':
        emit(await getServices(clientOptions), formatServices);
        return 0;
      case 'mcp':
        emit(mcpConfig(clientOptions), formatMcp);
        return 0;
      case 'fit-check': {
        if (flags.live && flags.sandbox) {
          warn('Use either --sandbox or --live, not both.');
          return 1;
        }
        const handoff = flags.message ?? flags.handoff;
        const missing = [['name', flags.name], ['email', flags.email], ['message', handoff]].filter(([, v]) => !v).map(([k]) => `--${k}`);
        if (missing.length) {
          warn(`fit-check needs ${missing.join(', ')}`);
          return 1;
        }
        const body = {
          name: flags.name,
          email: flags.email,
          handoff,
          ...(flags['pays-for-tools'] && { paysForTools: flags['pays-for-tools'] }),
          ...(flags['company-name'] && { companyName: flags['company-name'] }),
          ...(flags.role && { role: flags.role }),
          ...(flags['current-state'] && { currentState: flags['current-state'] }),
          ...(flags['team-size'] && { teamSize: flags['team-size'] }),
          ...(flags.timeline && { timeline: flags.timeline }),
          ...(flags.budget && { budget: flags.budget }),
          ...(flags.source && { source: flags.source }),
        };
        const live = flags.live === true;
        let idempotencyKey = flags['idempotency-key'];
        if (live) {
          warn('WARNING: --live sends a real email to Ryan at Supergood Solutions.');
          idempotencyKey ??= randomUUID();
        }
        const result = await submitFitCheck(body, { ...clientOptions, sandbox: !live, idempotencyKey });
        emit({ live, idempotencyKey: idempotencyKey ?? null, ...result }, (r) =>
          r.live
            ? `Sent. Ryan has your note. Idempotency-Key: ${r.idempotencyKey}`
            : `Sandbox OK. Validated, nothing sent.${r.message ? ` ${r.message}` : ''}\nAdd --live to send for real.`,
        );
        return 0;
      }
      default:
        warn(`Unknown command: ${command}\nRun supergood-solutions --help for usage.`);
        return 1;
    }
  } catch (e) {
    if (e instanceof SupergoodError) {
      if (flags.json) {
        warn(JSON.stringify({ ok: false, status: e.status, error: e.code, message: e.message, hint: e.hint, requestId: e.requestId }));
      } else {
        warn(`Error${e.status ? ` ${e.status}` : ''}${e.code ? ` (${e.code})` : ''}: ${e.message}`);
        if (e.hint) warn(`Hint: ${e.hint}`);
        if (e.requestId) warn(`Request id: ${e.requestId}`);
      }
      return 2;
    }
    throw e;
  }
}
