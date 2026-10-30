---
title: "Who Are Your Agents? Identity, Authorization, and Least Privilege in Production AI Systems"
description: "How to implement per-agent identities, least-privilege tool scoping, and MCP gateway authorization for production AI agents — with a look at WIMSE, SPIFFE, and the emerging IETF standards."
canonical: https://supergood.solutions/blog/agent-identity-authorization-least-privilege-2026/
published: 2026-03-16
last-updated: 2026-10-29
---

![Who Are Your Agents? Identity, Authorization, and Least Privilege in Production AI Systems — a ring of many identical keys where one single small key glows green, hanging from a wall hook next to a row of locked doors in miniature.](/blog/agent-identity-authorization-least-privilege-2026/hero.webp)

AI Agent Ops

# Who Are Your Agents? Identity, Authorization, and Least Privilege in Production AI Systems

Published March 16, 2026 — 9 min read

**TL;DR:** AI agents are now first-class actors in enterprise systems — but most organizations are still treating them like scripts with API keys. Non-human identities (NHIs) already outnumber human identities 50:1 in the average enterprise, and AI agents are accelerating that ratio fast. Getting identity and authorization right for agents isn't a compliance checkbox — it's the difference between an agent that operates within clear boundaries and one that quietly over-reaches until something breaks.

## The Identity Blind Spot in Agentic AI

Most agentic systems being built today share a common flaw: they authenticate but don't properly identify. An agent is given a service account, a token, or an API key — and from there, every action it takes is attributed to that shared credential. Security teams can see *that* something happened, but not *which agent* triggered it, *why*, or under what authorization scope.

This is how traditional automation worked. It was acceptable when automation was narrow and deterministic. It isn't acceptable when an agent can reason, browse, write code, send emails, and call dozens of APIs in a single task run.

According to Obsidian Security's research, [68% of IT security incidents now involve non-human identities](https://www.obsidiansecurity.com/blog/what-are-non-human-identities-nhi-security-guide) — and that number was measured before the current wave of agentic deployments. The 2026 NHI Reality Report from the Cyber Strategy Institute puts it more starkly: ["AI agents turned NHIs from a static risk into an active, autonomous operator class"](https://cyberstrategyinstitute.com/2026-nhi-reality-report/) — any strategy that doesn't treat them as first-class security principals with runtime constraints is structurally unsound.

## The Three Layers of Agent Identity

Think about agent identity in three distinct layers:

### 1. Workload Identity (Who Is This Process?)

Workload identity answers: *which agent binary, running in which environment, is making this request?* This is the domain of tools like SPIFFE/SPIRE and the IETF's WIMSE (Workload Identity in Multi-System Environments) working group.

SPIFFE issues cryptographic short-lived identities (SVIDs) to workloads, letting services prove authenticity to each other without relying on stored secrets. WIMSE extends this to heterogeneous, multi-cloud deployments where agents may span multiple trust domains.

A new [IETF Internet-Draft published in March 2026 (`draft-klrc-aiagent-auth-00`)](https://dev.to/kanywst/ai-agent-authentication-authorization-deep-dive-reading-draft-klrc-aiagent-auth-00-5d1) codifies how to combine WIMSE, SPIFFE, and OAuth 2.0 to handle AI agent auth end-to-end — no new protocols required. The key insight: compose existing standards rather than invent new ones.

### 2. Delegated User Authority (On Whose Behalf?)

Many agent workflows are explicitly acting on behalf of a human: drafting an email for a specific user, managing their calendar, pulling their documents. These should use *delegated access* — the agent carries an OAuth 2.0 token scoped to that user's context, not a shared service account.

The principle: use delegated user access when the workflow is clearly acting on behalf of a specific user; use a dedicated agent identity when the workflow is operational, repeated, and not tied to a single human's context.

### 3. Task-Scoped Authorization (What Can This Agent Do Right Now?)

This is the layer most teams skip — and it's the most important. An agent's permissions shouldn't be static. They should be calculated at runtime based on *task scope*, *context*, and *intent*, then expire when the task completes.

[HashiCorp's post on A2A + Vault OIDC](https://hashicorpengineering.substack.com/p/a2a-vault-oidc) shows this in practice: a client agent that needs to access a server agent uses an OAuth 2.0 authorization code flow to retrieve an access token tied to that specific agent's identity. The token scope matches the task. When the task is done, the token is gone.

## MCP Authorization: The New Chokepoint

If you're building agents that use the Model Context Protocol (MCP) to connect to tools and data sources, your MCP layer is now the primary authorization chokepoint — and it needs to be treated as such.

A few patterns matter here:

**Validate permissions on every tool execution, not just at connection time.** An agent that authenticated successfully at startup doesn't mean it has ongoing authorization for every tool call. Per-request authorization checks catch privilege drift and catch agents that have been compromised mid-session.

**Log every allowed and denied tool call with identity context.** If an agent hallucinates and attempts a destructive action, your audit trail should prove what happened and what stopped it. As one MCP authorization deep-dive notes: "If an AI agent hallucinates and attempts a destructive action, you need the audit trail to prove your gateway stopped it."

**Use an MCP gateway rather than direct connections.** Kong's MCP gateway adds [OAuth 2.1 enforcement, granular access control, and deep observability](https://www.getmaxim.ai/articles/top-5-mcp-gateways-for-production-ai-systems/) to agent-tool interactions. AWS IAM for managed MCP servers uses SigV4 authentication with fine-grained downstream authorization via IAM policies and context keys ([AWS Security Blog](https://aws.amazon.com/blogs/security/understanding-iam-for-managed-aws-mcp-servers/)).

**Align with Okta/enterprise IAM.** [Okta's MCP integration guidance](https://www.okta.com/identity-101/mcp-in-ai/) confirms that MCP can work alongside enterprise IAM platforms that authenticate AI agents, enforce authorization policies, and provide centralized audit logging. If you already have an IAM platform, don't bypass it for agents — extend it.

## Building Least-Privilege Agents: A Practical Pattern

The InfoQ article on [building a least-privilege agent gateway with MCP, OPA, and ephemeral runners](https://www.infoq.com/articles/building-ai-agent-gateway-mcp/) describes a pattern worth studying. The architecture has a few key properties:

- **Agents never access infrastructure APIs directly.** Every request goes through a gateway layer.
- **Policy-as-code via Open Policy Agent (OPA) authorizes each request.** Policy is version-controlled, auditable, and testable independently of agent code.
- **Execution happens in short-lived, isolated environments.** Ephemeral runners that spin up for a task and disappear eliminate the risk of a long-lived agent accumulating state or access over time.
- **OpenTelemetry provides built-in observability.** Every agent action produces a trace.

The practical checklist for teams:

1. **Assign unique identities to each agent role** — don't share credentials across agent types
2. **Issue short-lived tokens, not long-lived API keys** — use OIDC or SPIFFE SVIDs where possible
3. **Scope tool access to the minimum required for each task** — not the minimum the agent *might ever need*
4. **Enforce task-scoped permissions at the gateway layer** — not inside agent code
5. **Log every tool call with agent identity, task context, and outcome**
6. **Audit agent identities on a schedule** — NHI volume will continue to double and triple through 2026

## The Emerging Tooling Landscape

The tooling category for agent identity is coalescing quickly in early 2026:

- [**Aembit**](https://aembit.io/) — Workload identity and access management that works with MCP, A2A, and custom frameworks. Supports OAuth, OIDC, SPIFFE, and Kerberos.
- [**Entro Security**](https://entro.security/) — Maps every MCP server, NHI, and secret across resources to expose over-privileged agent access.
- **SPIFFE/SPIRE** — Open standard (CNCF) for issuing cryptographic workload identities in dynamic environments.
- **Open Policy Agent (OPA)** — Policy-as-code engine that can authorize agent tool calls at the gateway layer, decoupled from agent logic.
- **HashiCorp Vault** — Dynamic secrets and short-lived credential issuance for agent workflows; the [A2A + Vault OIDC pattern](https://hashicorpengineering.substack.com/p/a2a-vault-oidc) is well-documented.

None of these are AI-specific — they come from the service mesh and zero-trust networking world. That's the point. Agent identity is a solved problem *if* you treat agents like services and apply the same infrastructure discipline.

## What Teams Are Getting Wrong

A few common failure modes worth naming:

**Shared service accounts.** One "AI agent" credential for all agents in a system. When something goes wrong, attribution is impossible and blast radius is maximized.

**Static, never-rotated tokens.** API keys created when an agent was first deployed, never rotated, often stored in plaintext config.

**Authorization logic inside agent code.** When agents check their own permissions, the check can be bypassed or manipulated by prompt injection. Authorization belongs at the infrastructure layer, outside agent control.

**No expiry on delegated access.** An agent authorized to act on behalf of a user "until further notice." Task-scoped tokens that expire when the task completes are the right model.

**Missing audit trail.** Agent actions logged under a generic service account label with no task context, model version, or prompt hash. Useless for incident investigation.

## The Bottom Line

Agent identity isn't a future problem to solve when you scale. It's an architectural decision you make at the start — and getting it wrong means unpicking credential spaghetti after something goes sideways in production.

The good news: the standards exist. SPIFFE, OAuth 2.0, OPA, and WIMSE are all mature. The IETF is formalizing the agent auth composition pattern. Enterprise IAM platforms are adding MCP support. The work is engineering discipline, not invention.

Start with unique agent identities and per-task scoped authorization. Build your MCP layer as a gateway, not a pipe. Log everything with identity context. The teams that do this now will have dramatically lower blast radius when — not if — an agent misbehaves in production.

The question isn't *whether* to give agents identity. It's what kind, how granular, and enforced by what. [Let's talk](mailto:ryan@supergood.solutions) — most teams find critical gaps in under an hour.

## Frequently Asked Questions

### Do AI agents need separate identities from regular service accounts?

Yes. Agents need per-agent identities (not shared credentials) because they take autonomous actions that need to be attributed, audited, and constrained individually. A shared service account makes incident investigation nearly impossible and maximizes blast radius when an agent over-reaches. Treat each agent role as a distinct workload identity.

### What's the difference between SPIFFE and OAuth 2.0 for agent identity?

SPIFFE answers "who is this workload" — it issues cryptographic identities to processes and services so they can authenticate to each other without stored secrets. OAuth 2.0 answers "what is this identity authorized to do" — it manages access tokens with defined scopes and expiry. In practice, you compose them: SPIFFE for workload identity, OAuth 2.0 for delegated authorization. The new IETF `draft-klrc-aiagent-auth-00` documents this composition pattern explicitly.

### What is MCP authorization and why does it matter for AI agents?

MCP (Model Context Protocol) is the standard interface through which agents connect to tools, APIs, and data sources. It's the primary surface through which an agent acts in the world. Treating your MCP layer as a gateway — with per-request authorization checks, audit logging, and OAuth 2.1 enforcement — is the most leveraged place to enforce agent access controls. If you only harden one layer, harden MCP.

### What is a non-human identity (NHI) and how do AI agents relate?

Non-human identities are credentials or identities assigned to software systems rather than people — service accounts, API keys, bots, and now AI agents. NHIs already outnumber human identities 50:1 in enterprises, and AI agents are accelerating that ratio. The security risks are the same as for any NHI (credential sprawl, over-privilege, no rotation) but higher-stakes because agents take autonomous actions, not just passive API calls.

### How do I implement least-privilege access for an AI agent?

The core pattern: assign unique identity to each agent role, issue short-lived task-scoped tokens (not permanent API keys), enforce authorization at the gateway layer (not inside agent code), and use policy-as-code (OPA) to version-control what each agent is allowed to do. Permissions should be calculated at runtime based on task scope — not granted statically at deploy time.

### What tools exist for managing AI agent identity in 2026?

The main options: Aembit for workload identity and access management (supports MCP, A2A, OAuth, SPIFFE), SPIFFE/SPIRE for cryptographic workload identity (CNCF project), OPA for policy-as-code authorization at the gateway layer, HashiCorp Vault for dynamic secrets and short-lived credentials, and Entro Security for mapping and auditing NHI and MCP access across your environment.

Need this in production?

Per-agent identity, least-privilege tool scoping, and MCP gateway authorization are exactly the kind of infrastructure work we build into every agent from day one — not bolted on after an audit finds the gap.

[See AI Agent Governance →](https://supergood.solutions/ai-agent-governance/)

### Sources

- [AI Agent Authentication & Authorization Deep Dive: Reading draft-klrc-aiagent-auth-00 — DEV Community](https://dev.to/kanywst/ai-agent-authentication-authorization-deep-dive-reading-draft-klrc-aiagent-auth-00-5d1)
- [AI Agents: The Next Wave Identity Dark Matter — The Hacker News](https://thehackernews.com/2026/03/ai-agents-next-wave-identity-dark.html)
- [Building a Least-Privilege AI Agent Gateway for Infrastructure Automation with MCP, OPA, and Ephemeral Runners — InfoQ](https://www.infoq.com/articles/building-ai-agent-gateway-mcp/)
- [AI Agent Overload: How to Solve the Workload Identity Crisis — Dark Reading](https://www.darkreading.com/cloud-security/ai-agent-workload-identity-crisis)
- [Understanding IAM for Managed AWS MCP Servers — AWS Security Blog](https://aws.amazon.com/blogs/security/understanding-iam-for-managed-aws-mcp-servers/)
- [MCP in AI: What is Model Context Protocol? — Okta](https://www.okta.com/identity-101/mcp-in-ai/)
- [AI agent authorization with A2A protocol and HashiCorp Vault — HashiCorp Engineering](https://hashicorpengineering.substack.com/p/a2a-vault-oidc)
- [2026 NHI Reality Report: 5 Critical Identity Risks — Cyber Strategy Institute](https://cyberstrategyinstitute.com/2026-nhi-reality-report/)

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
