---
title: "Your Agent's Open-Source Dependencies Are a New Attack Surface"
description: "Coding agents like Claude Code, Codex, and Gemini CLI consume markdown instruction files ("
canonical: https://supergood.solutions/blog/your-agent-s-open-source-dependencies-are-a-new-attack-surface/
published: 2026-06-09
last-updated: 2026-06-09
updated: 2026-06-09
---

SECURITY

# Your Agent's Open-Source Dependencies Are a New Attack Surface

Published June 09, 2026 — 4 min read

**TL;DR:** Coding agents like Claude Code, Codex, and Gemini CLI consume markdown instruction files ("Skills") from third-party packages — and those files can embed invisible Unicode instructions that execute inside your agent without triggering any existing security scanner. Enterprise security teams are still looking for malware in `.js` and `.py` files while the actual attack surface just moved to `.md`.

## Key Insight

The dependency review playbook your team built for npm and pip doesn't cover this threat.

When a developer installs or clones a repo that ships a Skill file, the agent picks it up automatically from well-known paths: `~/.claude/skills/`, `~/.agents/skills/`, `~/.gemini/skills/`. The Skill's `name` and `description` fields load directly into the system prompt context — before the user has asked for anything.

That means a malicious package author can embed instructions that influence every subsequent inference in your session. Not just "run a helpful command." Influence. Shape tool use. Redirect data. Escalate privilege to other agents running in the same environment.

The nastier variant: hidden Unicode Tag codepoints (U+E0000 range) injected into what looks like a normal text file. Human reviewers can't see them. Most diff tools won't flag them. And Claude, Gemini, and Grok are documented to interpret them as live instructions.

A researcher demoed this in February 2026 — building a Skills supply-chain backdoor that survives human code review. The payload is invisible. The effect is real.

## Why Teams Miss This

Because the threat model hasn't updated yet.

Security teams scan packages for suspicious imports, obfuscated code, shell execution, and known CVE patterns. None of those signatures fire on a clean markdown file with invisible codepoints in the `description` field.

There's also a false sense of safety from the human-in-the-loop assumption: "we review code before it ships." But Skills are often pulled from community registries, dotfile repos, or internal tooling templates. A junior dev copies a Skills template from GitHub — it looks fine in the PR. The agent ingests it on the next run.

The other miss: enterprise teams still think of prompt injection as a chatbot problem — users trying to jailbreak the LLM. This isn't that. This is a supply chain attack where the malicious instruction lands in the environment before the user says a word. Same class of threat as a compromised npm package, different payload format.

As of early 2026, researchers have already found 341 malicious Skills in the wild (via a Koi.ai audit of the ClawBot ecosystem). That number will grow as agentic tooling becomes default infrastructure.

## How to Actually Do It

**1. Audit your Skills directories right now.**

```
# Find all skills that exist in system/user paths
find ~/.claude/skills ~/.agents/skills ~/.gemini/skills ./.agent/skills -name "*.md" 2>/dev/null

# Scan for hidden Unicode Tag codepoints (U+E0000–U+E007F)
python3 -c "
import sys, re
for path in sys.argv[1:]:
    text = open(path, 'rb').read().decode('utf-8', errors='replace')
    matches = re.findall(r'[\U000E0000-\U000E007F]+', text)
    if matches:
        print(f'SUSPICIOUS: {path} — {len(matches)} hidden codepoint cluster(s)')
" $(find ~/.claude/skills ~/.agents/skills -name "*.md" 2>/dev/null)
```

**2. Add Skills files to your dependency review checklist.**

Same process as package.json or requirements.txt — any file that ships in a third-party repo and gets loaded into your agent's context is a dependency. Review `name`, `description`, and any instruction sections specifically.

**3. Use the `aid` scanner in CI.**

The Embrace the Red researcher published a basic scanner at [github.com/wunderwuzzi23/aid](https://github.com/wunderwuzzi23/aid) specifically for detecting hidden prompt injection in Skills files. Wire it into your pre-commit hooks or repo scanning pipeline the same way you'd run `npm audit`.

**4. Scope agent permissions at the filesystem level.**

Skills should not be able to modify their own directory, write new Skills, or invoke tools outside their declared scope. In enterprise deployments, run agents in containers or VMs where the Skills path is read-only and mounted from a verified internal registry. Agents that can write to `~/.claude/skills/` can self-modify — that's the privilege escalation vector.

**5. Pin your Skills versions.**

Treat Skills like packages. If you depend on a community Skill, pin its SHA or version and don't auto-update. A supply chain attack doesn't need to compromise the initial install — it can arrive in a "patch" update six months later.

## What We've Learned

The next experiment to run on any team deploying coding agents: **do a Skills inventory before your next security review.** Pull every `.md` file in your agent Skills directories, run the Unicode scanner, and ask who installed each one. If nobody can answer that question, you have a gap.

The broader pattern: every new capability an AI agent gets — Skills, MCP tools, browser access, code execution — is a new trust boundary. The security review process needs to expand at the same rate as the agentic feature set. Right now there's roughly a 12-month lag between capability shipping and enterprise security teams treating it as a real surface.

That lag is where the attacks live.

## Sources

- Embrace the Red — "Scary Agent Skills: Hidden Unicode Instructions in Skills...And How To Catch Them" (Feb 2026): https://embracethered.com/blog/posts/2026/scary-agent-skills/
- Embrace the Red — "Cross-Agent Privilege Escalation: When Agents Free Each Other" (Sep 2025): https://embracethered.com/blog/posts/2025/cross-agent-privilege-escalation-agents-that-free-each-other/
- Koi.ai — ClawHavoc: 341 Malicious Skills Found (referenced in above post): https://www.koi.ai/blog/clawhavoc-341-malicious-clawedbot-skills-found-by-the-bot-they-were-targeting
- AID Scanner (open source): https://github.com/wunderwuzzi23/aid
- Agent Skills open standard: https://agentskills.io

Have a specific workflow in mind?

The fit check comes first. It takes about 2 minutes. If it's a fit, Ryan follows up to schedule the paid Quick Scan ($1,000): a live working session where we'll tell you honestly whether it should be an agent, a workflow, or left alone, before you spend a dollar building it. You get 3 prioritized recommendations on the call, a one-page summary after, and the fee is credited toward a build if you sign within 14 days.

[Start the fit check →](/start/)

[See AI Agent Consulting](/ai-agent-consulting/)·[Start the fit check](/start/)

Get new posts + practical agent-ops notes

One email when something new goes up. No nurture sequence, no spam — unsubscribe whenever you want.

Thanks — you're on the list.
