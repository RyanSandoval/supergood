---
title: "Your Agent's Reliability Gap Is a Math Problem, Not a Vibes Problem"
description: "Capability benchmarks measure single-shot success — but production agents chain dozens of steps together, and compounding failure rates will wreck you. Before y"
canonical: https://supergood.solutions/blog/your-agent-s-reliability-gap-is-a-math-problem-not-a-vibes-problem/
published: 2026-06-02
last-updated: 2026-10-29
---

DEPLOYMENT

# Your Agent's Reliability Gap Is a Math Problem, Not a Vibes Problem

Published June 02, 2026 — 4 min read

**TL;DR:** Capability benchmarks measure single-shot success — but production agents chain dozens of steps together, and compounding failure rates will wreck you. Before you ship, do the math.

## Key Insight

A model that completes a task correctly 90% of the time sounds impressive. It's an A- on any reasonable grading curve. Ship an agent that runs 20 of those steps in sequence, though, and your end-to-end success rate is 0.9²⁰ — about **12%**.

That's not a vibe. It's arithmetic.

Here's the compounding table teams should print out and tape above their laptops:

| Step accuracy | 5-step chain | 10-step chain | 20-step chain |

|---|---|---|---|

| 99% | 95% | 90% | 82% |

| 95% | 77% | 60% | 36% |

| 90% | 59% | 35% | 12% |

| 85% | 44% | 20% | 4% |

Most benchmarked agents — SWE-bench, WebArena, OSWorld — operate in the 50–70% single-task accuracy range on the task types enterprises actually care about. A 65%-accurate agent running a 15-step workflow has roughly a 1-in-640 shot of finishing cleanly. That is not a product. That is an expensive demo.

The contrarian framing: **stop asking "what's the benchmark score?" and start asking "how many steps does my production workflow have?"** Those are completely different questions with completely different answers.

## Why Teams Miss This

Two reasons, both understandable:

**1. Benchmarks are one-shot by design.** SWE-bench gives the model one GitHub issue to fix. WebArena gives it one browsing task. These are useful for comparing models, but they're not measuring what production agents actually do — which is string tasks together in sequences that can branch, fail, retry, and compound errors.

**2. Teams evaluate demos, not workflows.** The demo works: the agent reads a Slack message, drafts a Jira ticket, and sends a summary. That's 3-4 steps and it's coherent. Then someone tries to wire the same agent to a 20-step onboarding workflow and it falls apart by step 8. The demo wasn't lying — it just wasn't representative.

The vibes trap is real: you see the demo work three times in a row and you build your production assumptions around that streak. Three-in-a-row at 65% step accuracy is a 27% probability event. It happens. It's just not your baseline.

## How to Actually Do It

**Step 1: Map your task chain before you write any code.**

Write out every discrete action your agent will take. Be honest about what counts as a "step" — an LLM call, a tool call, a branch decision, a write operation. A "simple" customer support agent might touch 15–25 steps.

**Step 2: Estimate your per-step accuracy.**

Run 50–100 isolated evals on each step type, not end-to-end. This is tedious but it's the only way to get honest numbers. A one-hour eval sprint on 5 step types beats a one-week "vibe check" on the full workflow.

**Step 3: Compute your expected success rate.**

def expected\_chain\_success(step\_accuracy: float, num\_steps: int) -> float:

return step\_accuracy  num\_steps

print(f"{expected\_chain\_success(0.90, 15):.1%}") # → 20.6%

import math

target = 0.80

steps = 15

required = math.exp(math.log(target) / steps)

print(f"Required per-step accuracy: {required:.1%}") # → 98.5%

**Step 4: Design for the gap, don't wish it away.**

Once you have the number, you have three levers:

- **Reduce steps** — simplify the workflow so the chain is shorter
- **Improve per-step accuracy** — better prompts, tool design, guardrails, retrieval
- **Build retry/checkpoint logic** — not random retries, but idempotent checkpoints so a failure at step 14 doesn't restart from step 1

Most teams skip straight to retry logic (the quick fix) without addressing step count or per-step accuracy. Retries are a valid backstop but they don't change the math — they change the cost. A 12% success-rate chain with three retries still fails 27% of the time, and now it costs 3x to run.

**What 98%+ per-step accuracy actually looks like:**

It usually requires constrained tool interfaces (not open-ended), tight output schemas, human review at high-stakes branch points, and narrow task scope. That's not a limitation — it's good engineering.

## What We've Learned

Before your next agent ships, run this three-question audit:

1. **How many steps does this workflow actually have?** (Count them. Be honest.)
2. **What's our per-step accuracy on each step type?** (Measure it. Don't guess.)
3. **Given that math, what's our expected end-to-end success rate?** (If it's below 70%, fix the workflow before you fix the prompts.)

The teams we've seen ship reliable agents in production aren't the ones using the best models. They're the ones who treat reliability as an engineering constraint, budget for retries explicitly, and design short workflows with measurable steps. That's a math problem. It's solvable.

## Sources

- Kapoor, S. & Narayanan, A. — *AI Snake Oil* (aisnakeoil.com) — ongoing coverage of benchmark inflation and production deployment gaps
- SWE-bench Verified leaderboard (swebench.com) — single-task coding benchmark; top agents ~50–65% as of mid-2026
- WebArena / OSWorld benchmarks — web navigation and desktop automation; top agents ~35–50% on representative task samples
- "CRUX: Open-world evaluations for measuring frontier AI capabilities" — Kapoor & Narayanan, April 2026 — new eval framework for long, multi-step tasks

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
