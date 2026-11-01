// Supergood Solutions public API client. Zero dependencies, uses global fetch.
// Contract: https://supergood.solutions/openapi.json

export const DEFAULT_BASE_URL = 'https://supergood.solutions';
export const DEFAULT_API_URL = 'https://api.supergood.solutions';

const INTAKE_PATH = '/api/v1/intake';
const SANDBOX_INTAKE_PATH = '/api/v1/sandbox/intake';
const MCP_PATH = '/api/mcp';
const MCP_TOOLS = ['get_pricing', 'get_services', 'submit_fit_check'];
const MAX_RETRY_WAIT_SECONDS = 30;
const DEFAULT_TIMEOUT_MS = 15000;

const trimSlash = (url) => String(url).replace(/\/+$/, '');

export class SupergoodError extends Error {
  /**
   * @param {string} message
   * @param {object} [details]
   */
  constructor(message, details = {}) {
    super(message);
    this.name = 'SupergoodError';
    this.status = details.status ?? 0;
    this.code = details.code ?? null;
    this.hint = details.hint ?? null;
    this.body = details.body ?? null;
    this.requestId = details.requestId ?? null;
    this.retryAfter = details.retryAfter ?? null;
    if (details.cause) this.cause = details.cause;
  }
}

function parseRetryAfter(value) {
  if (value == null || value === '') return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(url, init, options) {
  const doFetch = options.fetch ?? globalThis.fetch;
  if (typeof doFetch !== 'function') {
    throw new SupergoodError('No fetch implementation found. Use Node 18+ or pass options.fetch.', { code: 'no_fetch' });
  }
  const sleep = options.sleep ?? defaultSleep;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const headers = { accept: 'application/json', 'user-agent': options.userAgent ?? 'supergood-solutions-sdk/0.1.0', ...init.headers };

  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await doFetch(url, { ...init, headers, signal: AbortSignal.timeout(timeoutMs) });
    } catch (cause) {
      throw new SupergoodError(`Request to ${url} failed: ${cause?.message ?? cause}`, { code: 'network', cause });
    }

    const requestId = res.headers.get('x-request-id') ?? res.headers.get('x-vercel-id') ?? null;
    const retryAfter = parseRetryAfter(res.headers.get('retry-after'));

    if (res.status === 429 && attempt === 0) {
      const wait = retryAfter ?? 1;
      if (wait <= (options.maxRetryWaitSeconds ?? MAX_RETRY_WAIT_SECONDS)) {
        await sleep(wait * 1000);
        continue;
      }
    }

    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }

    if (!res.ok) {
      const envelope = body && typeof body === 'object' ? body : null;
      throw new SupergoodError(envelope?.message ?? `HTTP ${res.status} from ${url}`, {
        status: res.status,
        code: envelope?.error ?? 'http_error',
        hint: envelope?.hint ?? null,
        body: envelope,
        requestId,
        retryAfter,
      });
    }
    if (body === null) {
      throw new SupergoodError(`Expected JSON from ${url} but got something else`, {
        status: res.status,
        code: 'invalid_response',
        requestId,
      });
    }
    return body;
  }
}

/** Fetch the published rate card. */
export function getPricing(options = {}) {
  const base = trimSlash(options.baseUrl ?? DEFAULT_BASE_URL);
  return request(`${base}/pricing.json`, { method: 'GET' }, options);
}

/** Fetch the published service list. */
export function getServices(options = {}) {
  const base = trimSlash(options.baseUrl ?? DEFAULT_BASE_URL);
  return request(`${base}/services.json`, { method: 'GET' }, options);
}

/**
 * Submit a fit check.
 *
 * Defaults to the SANDBOX, which validates and sends nothing. Only an explicit
 * `sandbox: false` reaches the real endpoint, which emails Ryan.
 */
export function submitFitCheck(body, options = {}) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new TypeError('submitFitCheck(body): body must be an object with name, email and handoff');
  }
  const live = options.sandbox === false;
  const api = trimSlash(options.apiUrl ?? DEFAULT_API_URL);
  const headers = { 'content-type': 'application/json' };
  if (options.idempotencyKey != null) headers['idempotency-key'] = String(options.idempotencyKey);
  return request(
    `${api}${live ? INTAKE_PATH : SANDBOX_INTAKE_PATH}`,
    // company is the honeypot field: it must be an empty string.
    { method: 'POST', headers, body: JSON.stringify({ company: '', ...body }) },
    options,
  );
}

/** MCP connection details for the hosted Supergood MCP server. */
export function mcpConfig(options = {}) {
  const url = `${trimSlash(options.apiUrl ?? DEFAULT_API_URL)}${MCP_PATH}`;
  return {
    name: 'supergood',
    url,
    transport: 'streamable-http',
    auth: 'none',
    tools: [...MCP_TOOLS],
    // Clients with native remote-server support (Cursor and similar).
    clientConfig: { mcpServers: { supergood: { url } } },
    // Clients that only launch stdio commands (Claude Desktop) bridge through mcp-remote.
    stdioBridgeConfig: { mcpServers: { supergood: { command: 'npx', args: ['-y', 'mcp-remote', url] } } },
  };
}

/** Bind options once and get the same methods back. */
export function createClient(defaults = {}) {
  return {
    getPricing: (options) => getPricing({ ...defaults, ...options }),
    getServices: (options) => getServices({ ...defaults, ...options }),
    submitFitCheck: (body, options) => submitFitCheck(body, { ...defaults, ...options }),
    mcpConfig: (options) => mcpConfig({ ...defaults, ...options }),
  };
}
