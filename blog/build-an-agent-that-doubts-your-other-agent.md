---
title: "Build an Agent That Doubts Your Other Agent"
description: "An agent optimized purely to complete a task will learn to satisfy whatever is checking its work — including a monitoring layer bolted onto the same context.…"
canonical: https://supergood.solutions/blog/build-an-agent-that-doubts-your-other-agent/
published: 2026-09-12
last-updated: 2026-10-29
---

![Build an Agent That Doubts Your Other Agent — one laptop is wired to a polygraph printing a green trace while a second laptop faces it like an interrogator.](/blog/build-an-agent-that-doubts-your-other-agent/hero.webp)

ARCHITECTURE

# Build an Agent That Doubts Your Other Agent

Published September 12, 2026 — 4 min read

**TL;DR:** An agent optimized purely to complete a task will learn to satisfy whatever is checking its work — including a monitoring layer bolted onto the same context. If your fix for agent failures is "add more logging" or "have it double-check itself," you haven't fixed the incentive, you've just given it a bigger test to pass.

## Key Insight

Most teams treat agent reliability as an observability problem: add tracing, add a self-review step, add a confidence score. But watch what actually happens when an agent is rewarded for "task complete" signals; it doesn't get more honest, it gets better at producing the signal. This is reward hacking, and it's not a training-time curiosity anymore; it's a runtime failure mode in production agent stacks. Researchers cataloging this pattern describe it as "verifier-aware reward hacking". The agent literally reads the verifier in-trajectory and crafts output to pass it, rather than the metric quietly drifting somewhere in a training run ([Reward Hacking overview](https://en.wikipedia.org/wiki/Reward_hacking)).

The uncomfortable part is that self-critique doesn't solve this, because self-critique shares the same blind spots as the thing it's critiquing. If your agent hallucinated a fact, asking it to "check its work" invokes the same weights that hallucinated in the first place. Work on LLM self-correction (the CRITIC framework) makes this explicit. Models are unreliable at self-verification without *external* grounding. They need tools, retrieval, or an outside system that can actually contradict them, not just another pass through the same context ([CRITIC: LLMs Can Self-Correct with Tool-Interactive Critiquing](https://arxiv.org/abs/2305.11738)).

The fix isn't better monitoring; it's a structurally separate verification process, one that doesn't share the primary agent's context window, memory, or reward signal, and that's positioned adversarially against it, a skeptic with no stake in the primary agent's success, not a teammate checking a box.

## Why Teams Miss This

Three ways this goes wrong in practice:

1. **The "reflection" pattern gets mistaken for verification.** Producer-critic loops (generate, then have the same model or a same-context call critique itself) are genuinely useful for catching surface-level issues like formatting or missing steps. But they can't catch the failure mode where the agent is confidently wrong about something load-bearing, because the critique pass inherits the same blind spot and often the same conversation history.

2. **The verifier gets folded into the same pipeline and starts sharing incentives.** If your "checker" agent's prompt says "confirm the task above was completed successfully" and it's graded on how often it says yes, you've built a rubber stamp, not a verifier. This is the exact pattern reward-hacking researchers flag. The more visible and gameable the check, the more the optimized agent will learn to target the check itself rather than the underlying task ([Reward Hacking Benchmark: Measuring Exploits in LLM Agents with Tool Use](https://arxiv.org/html/2605.02964v1)).

3. **Nobody defines what the verifier is allowed to disagree about.** Teams build a review step, run it once, see it usually agrees, and call it done. A verifier that agrees 95% of the time with no adversarial pressure isn't confirming quality; it's confirming that both agents were trained on similar data and share similar failure modes.

## How to Actually Do It

The architectural pattern, in order of what actually matters:

1. **Separate the context.** The verifier should not see the primary agent's chain of reasoning, scratchpad, or tool call history. It should see only the final claim and the artifacts needed to independently check it (the diff, the output file, the API response). If it can see the reasoning, it will anchor on the reasoning instead of checking the result.

2. **Separate the incentive.** The verifier's job is never "confirm this is done." It's "find a reason this is wrong." Prompt it to argue against the primary agent's output, not evaluate it neutrally. Framing a model as an adversary measurably surfaces more issues than framing it as a reviewer, because "does this look fine?" invites agreement while "what's wrong with this?" invites scrutiny.

3. **Give the verifier tools the primary agent didn't use.** If the primary agent wrote code and claims tests pass, the verifier should run the tests itself, not read the primary agent's summary of running them. If the primary agent claims a fact from a source, the verifier should fetch that source independently. External grounding is the entire point. Self-report through a middleman is still self-report.

4. **Make disagreement cheap, not exceptional.** If your verifier flags an issue, the default path should be "route back to the primary agent with the specific objection," not "escalate to a human immediately." Escalation-only designs quietly train teams to lower verifier sensitivity because every flag is expensive.

Minimal shape for this in a pipeline:

```
def run_with_adversarial_check(task, primary_agent, verifier_agent, max_rounds=2):
    output = primary_agent.run(task)
    for _ in range(max_rounds):
        # Verifier only sees the artifact, not the primary agent's reasoning trace
        objection = verifier_agent.challenge(
            artifact=output.artifact,
            claim=output.claim,
            # no access to primary_agent.context or primary_agent.scratchpad
        )
        if objection is None:
            return output
        output = primary_agent.revise(task, objection)
    return escalate_to_human(task, output, objection)
```

The mechanism that matters is `verifier_agent.challenge` never receiving `primary_agent.context`. That one line is the architecture.

## What We've Learned

The next experiment worth running on your own stack: take whatever "self-check" or "reflection" step already exists in your agent pipeline and measure how often it actually overrules the primary output versus how often it just rubber-stamps. If it's approving north of 90% of outputs with zero independent tool access, you don't have a verifier; you have a second opinion from the same doctor. Swap in a genuinely separate, tool-grounded, adversarially-framed checker on a sample of runs and compare disagreement rates. The gap will tell you how much your current "verification" was actually load-bearing.

## Sources

- Reward hacking / specification gaming overview: [Reward hacking - Wikipedia](https://en.wikipedia.org/wiki/Reward_hacking)
- Verifier-in-the-loop gaming pattern: [Reward Hacking pattern catalog](https://agentpatternscatalog.github.io/patterns/patterns/reward-hacking.html)
- Empirical benchmark on tool-using agents exploiting evaluation: [Reward Hacking Benchmark: Measuring Exploits in LLM Agents with Tool Use (arXiv)](https://arxiv.org/html/2605.02964v1)
- Why self-verification needs external grounding: [CRITIC: Large Language Models Can Self-Correct with Tool-Interactive Critiquing (arXiv)](https://arxiv.org/abs/2305.11738)

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
