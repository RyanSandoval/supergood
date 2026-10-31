---
title: "Your AI Agent Made a Mistake. Who Is Liable?"
description: "The debate over AI legal personhood is a thought experiment for law journals. The debate over who eats the cost when your deployed agent books the wrong…"
canonical: https://supergood.solutions/blog/your-ai-agent-made-a-mistake-who-is-liable/
published: 2026-09-21
last-updated: 2026-10-05
updated: 2026-10-05
---

![](/blog/your-ai-agent-made-a-mistake-who-is-liable/hero.svg)

GOVERNANCE

# Your AI Agent Made a Mistake. Who Is Liable?

Published September 21, 2026 · Updated Oct 5, 2026 — 4 min read

**TL;DR:** The debate over AI legal personhood is a thought experiment for law journals. The debate over who eats the cost when your deployed agent books the wrong refund, sends the wrong wire amount, or promises a discount that doesn't exist is happening in production right now — and most teams have no documented answer.

## Key Insight

Skip the personhood question entirely. No court, regulator, or insurer is going to let an LLM hold liability, own assets, or sit in a deposition. The only entity that can be held accountable is the one that deployed the system, and that was already true before agents existed. What's changed isn't *who* is liable, it's that agentic workflows now take actions (booking, refunding, emailing, editing records) fast enough and autonomously enough that the gap between "the agent did something wrong" and "someone in your org finds out" has widened. Liability didn't move. Detection latency did.

## Why Teams Miss This

Most teams treat agent liability like a legal abstraction to worry about "later," when it's actually an engineering and ops question they're already answering by default, usually badly.

The precedent is already on the books. In *Moffatt v. Air Canada* (2024 BCCRT 149), the airline argued its chatbot was "a separate legal entity responsible for its own actions." The BC Civil Resolution Tribunal rejected that outright. Air Canada was liable for what its own tool told a customer, full stop. The tribunal didn't need a novel AI liability doctrine. Ordinary negligence and misrepresentation law covered it, because the chatbot was legally indistinguishable from a company webpage. That's the pattern that will keep repeating. Agent errors get judged under existing liability frameworks (negligence, product liability, breach of contract, agency law), not a special AI carve-out. Waiting for AI-specific regulation to tell you who's responsible is waiting for permission that already isn't required.

The second mistake is architectural. Teams ship agentic workflows with no record of *why* the agent did what it did. When the error surfaces, there's no way to distinguish "the model reasoned badly" from "a tool call had a bug" from "the prompt gave it bad instructions" from "a human approved this and shouldn't have." Without that trail, every incident becomes a blame argument instead of a five-minute log lookup.

## How to Actually Do It

Treat agent liability as an operational requirement, not a legal footnote. Concretely:

1. **Log every decision point, not just outcomes.** Capture the input, the tool calls made, the reasoning trace if your model exposes one, and the final action taken. If you can't reconstruct why the agent did something six months later, you don't have an audit trail. You have a black box with a legal bill attached.

2. **Define a human-in-the-loop threshold by dollar amount or blast radius, not by "vibes."** Decide in advance: which actions can the agent take autonomously (draft an email, tag a ticket) versus which require sign-off (issue a refund over $500, modify a contract, send an external communication). Write the threshold down. "We generally have someone check" is not a policy a regulator, insurer, or court will accept as documented oversight.

3. **Assign an accountable human owner per agent, not per team.** Diffuse ownership ("the platform team manages agents generally") is exactly what produces the Air Canada outcome. Nobody specifically owned the chatbot's accuracy, so nobody caught it. Name a person or role that owns each production agent's error rate and incident response.

4. **Build the rollback path before you build the automation.** If the agent sends a wrong invoice or edits the wrong record, what's the correction workflow? If the answer is "we'd have to figure that out," that's the liability gap, not the model's confidence score.

```
Minimum viable agent audit trail:
- timestamp + agent/version ID
- input context (what triggered the action)
- tool calls + parameters
- model reasoning/output (if available)
- action taken + system(s) affected
- human approval status (auto vs. reviewed vs. overridden)
```

## What We've Learned

The Cloud Security Alliance's framing on this is the one worth internalizing. Deploying an agent doesn't transfer liability to the agent, it concentrates accountability on the deploying organization, under a "reasonable oversight" standard. You're liable unless you can show documented, operable monitoring was in place *at the time the agent acted*. That's a bar you can meet with logging and defined escalation thresholds, not with legal theory. Next experiment: pick your highest-blast-radius agent in production today and check whether you could actually produce that audit trail if asked next week. If you can't, that's the fix to make before you scale it further, not after.

## Sources

- Case background: [Moffatt v. Air Canada, 2024 BCCRT 149 — Wikipedia](https://en.wikipedia.org/wiki/Moffatt_v._Air_Canada)
- Deeper legal analysis: [The Air Canada Chatbot Ruling: What the Tribunal Actually Decided](https://multigrid.ai/learn/air-canada-chatbot-tribunal-ruling)
- Enterprise accountability standard: [AI Liability Inflection: Enterprise Accountability in the Agentic Era — Cloud Security Alliance](https://labs.cloudsecurityalliance.org/research/csa-research-note-ai-liability-enterprise-accountability-age/)
- Legal accountability landscape: [United States: Legal Accountability for AI Agents — Baker McKenzie](https://www.bakermckenzie.com/en/insight/publications/2026/06/united-states-legal-accountability-for-ai-agents)

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
