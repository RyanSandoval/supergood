// Types match https://supergood.solutions/openapi.json (API 1.1.0).

export interface Range {
  min: number;
  max: number;
}

export interface Offer {
  id: string;
  name: string;
  /** Fixed price in currency. Present when the offer has a single price. */
  price?: number;
  /** Lowest published price in currency. The quoted price can be higher. */
  priceFrom?: number;
  unit: string;
  summary: string;
  url?: string;
  creditedTowardBuildIfSignedWithinDays?: number;
  gainSharePercent?: Range;
  gainShareCapMultiple?: number;
  minimumMonths?: number;
}

export interface PricingDocument {
  provider: string;
  url: string;
  /** ISO 4217 currency code. */
  currency: string;
  /** YYYY-MM-DD */
  updated: string;
  offers: Offer[];
  tooling: string;
}

export interface Service {
  id: string;
  name: string;
  url: string;
  summary: string;
}

export interface ServicesDocument {
  provider: string;
  url: string;
  updated: string;
  services: Service[];
}

export type PaysForTools = 'Yes' | 'Not sure' | 'No';
export type CurrentState =
  | ''
  | 'Entirely manual'
  | 'Spreadsheets and a few Zaps'
  | 'A pilot that stalled'
  | "Running, but we don't trust it"
  | 'Not sure yet';
export type TeamSize = '' | 'Just me' | '2-5' | '6-20' | '20+';
export type Timeline = '' | 'Just exploring' | 'Next quarter' | "Now, it's blocking us";
export type Budget =
  | ''
  | 'Under $4k (Quick Scan only)'
  | '$4k-$10k (one workflow)'
  | '$10k+ (multiple workflows)'
  | 'Not sure yet';

export interface FitCheckRequest {
  /** Person to reply to. */
  name: string;
  /** Work email Ryan should reply to. */
  email: string;
  /** The manual work they want off the team's plate, in their words. */
  handoff: string;
  /** The form and the MCP tool require it. The endpoint accepts a request without it. */
  paysForTools?: PaysForTools;
  /** Honeypot. The SDK sends an empty string for you. */
  company?: '';
  /** Employer. */
  companyName?: string;
  role?: string;
  currentState?: CurrentState;
  teamSize?: TeamSize;
  timeline?: Timeline;
  budget?: Budget;
  source?: string;
  /** Milliseconds since the person started the form. Values under 3000 are dropped without sending. */
  elapsedMs?: number;
}

/** Response from the real endpoint. */
export interface FitCheckAccepted {
  ok: true;
}

/** Response from the sandbox endpoint. */
export interface SandboxAccepted {
  ok: true;
  sandbox: true;
  message: string;
}

export type FitCheckErrorCode =
  | 'method'
  | 'origin'
  | 'not_found'
  | 'json'
  | 'required'
  | 'email'
  | 'paysForTools'
  | 'idempotency_key'
  | 'idempotency_conflict'
  | 'idempotency_in_progress'
  | 'rate_limited'
  | 'server'
  | 'send';

/** The API's error envelope. */
export interface FitCheckError {
  ok: false;
  error: FitCheckErrorCode;
  message: string;
  hint: string;
}

export interface ClientOptions {
  /** Static host for pricing.json and services.json. Default https://supergood.solutions */
  baseUrl?: string;
  /** Intake and MCP host. Default https://api.supergood.solutions */
  apiUrl?: string;
  /** Custom fetch implementation. Default globalThis.fetch. */
  fetch?: typeof fetch;
  /** Per-request timeout in milliseconds. Default 15000. */
  timeoutMs?: number;
  /** Longest Retry-After, in seconds, the client will wait for its single 429 retry. Default 30. */
  maxRetryWaitSeconds?: number;
  /** Replacement for the 429 wait, mainly for tests. Receives milliseconds. */
  sleep?: (ms: number) => Promise<void>;
  userAgent?: string;
}

export interface SubmitFitCheckOptions extends ClientOptions {
  /**
   * Default true: validates against the sandbox and sends nothing.
   * Pass false to hit the real endpoint, which EMAILS Ryan.
   */
  sandbox?: boolean;
  /** Sent as the Idempotency-Key header (1 to 200 printable characters, no spaces). */
  idempotencyKey?: string;
}

export const DEFAULT_BASE_URL: string;
export const DEFAULT_API_URL: string;

export class SupergoodError extends Error {
  name: 'SupergoodError';
  /** HTTP status, or 0 for network failures. */
  status: number;
  /** The envelope's error code, or "network", "http_error", "invalid_response". */
  code: FitCheckErrorCode | 'network' | 'http_error' | 'invalid_response' | 'no_fetch' | null;
  hint: string | null;
  /** The parsed error envelope when the API sent one. */
  body: FitCheckError | null;
  /** x-request-id or x-vercel-id response header, when present. */
  requestId: string | null;
  /** Retry-After in seconds, when present. */
  retryAfter: number | null;
  cause?: unknown;
}

export function getPricing(options?: ClientOptions): Promise<PricingDocument>;
export function getServices(options?: ClientOptions): Promise<ServicesDocument>;

export function submitFitCheck(
  body: FitCheckRequest,
  options: SubmitFitCheckOptions & { sandbox: false },
): Promise<FitCheckAccepted>;
export function submitFitCheck(
  body: FitCheckRequest,
  options?: SubmitFitCheckOptions,
): Promise<SandboxAccepted>;

export interface McpServerEntry {
  url?: string;
  command?: string;
  args?: string[];
}

export interface McpConfig {
  name: string;
  url: string;
  transport: 'streamable-http';
  auth: 'none';
  tools: Array<'get_pricing' | 'get_services' | 'submit_fit_check'>;
  /** For clients with native remote server support, such as Cursor. */
  clientConfig: { mcpServers: Record<string, McpServerEntry> };
  /** For stdio-only clients, such as Claude Desktop, via the mcp-remote package. */
  stdioBridgeConfig: { mcpServers: Record<string, McpServerEntry> };
}

export function mcpConfig(options?: Pick<ClientOptions, 'apiUrl'>): McpConfig;

export interface Client {
  getPricing(options?: ClientOptions): Promise<PricingDocument>;
  getServices(options?: ClientOptions): Promise<ServicesDocument>;
  submitFitCheck(body: FitCheckRequest, options: SubmitFitCheckOptions & { sandbox: false }): Promise<FitCheckAccepted>;
  submitFitCheck(body: FitCheckRequest, options?: SubmitFitCheckOptions): Promise<SandboxAccepted>;
  mcpConfig(options?: Pick<ClientOptions, 'apiUrl'>): McpConfig;
}

export function createClient(defaults?: ClientOptions): Client;
