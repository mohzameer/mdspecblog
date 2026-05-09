# mdspec Content Writing Plan
> Source strategy: [may9th.md](may9th.md)
> Started: 2026-05-09 | Last updated: 2026-05-09

---

## Status Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done

---

## Main 5 Posts (Core Funnel)
Derived directly from the may9th.md keyword research. Published in the order that maximizes topical authority compounding.

### M1 — Category Hub (TOFU/MOFU) `[x]`
**Title:** Spec-as-Code: Publishing One Markdown Source to Notion, Confluence, ClickUp, and S3 from a Single Repo
**Slug:** `/blog/spec-as-code`
**Primary keyword:** spec as code
**Funnel:** Brand/category establishment — the hub post all others link back to
**Angle:**
- Frame spec-as-code as evolution of three trends: ADRs in markdown, failure of native integrations, multi-tool org reality
- Show a worked `.mdspecmap` mapping one `/specs` folder to four destinations
- End with the one-line GitHub Actions hook
- Reference Caitie McCaffrey ADR post, Andrea Bergia design-docs-in-git, Xebia ADR/Markdown
**Word count target:** 2,000–2,500
**Internal links out:** M2, M3, M4, M5
**Status notes:**

---

### M2 — Awareness/TOFU `[x]`
**Title:** Spec Drift: Why Your Markdown Files and Your Notion/Confluence Pages Stop Matching (And What to Do About It)
**Slug:** `/blog/spec-drift`
**Primary keyword:** spec drift (secondary: documentation drift)
**Funnel:** Reaches EMs and staff engineers who feel the pain but haven't named it yet
**Angle:**
- Multi-destination consistency framing (not just one-doc decay)
- Walk-through scenario: engineer updates `auth.md`, but Notion/Confluence/ClickUp copies all show old behavior
- Audit checklist readers can run on their own org (high shareability)
- Soft pivot to git-as-source-of-truth + automatic fan-out as the fix
**Word count target:** 1,800–2,200
**Internal links out:** M1 (hub), M3, M5
**Status notes:**

---

### M3 — Decision/BOFU `[x]`
**Title:** Publish Markdown to Confluence with GitHub Actions in One Line: A 2026 Setup Guide
**Slug:** `/blog/markdown-to-confluence-github-actions`
**Primary keyword:** markdown to confluence github actions
**Funnel:** Highest-intent traffic — people who already have Confluence + Atlassian token + CI pipeline
**Angle:**
- Side-by-side comparison table: mark vs markdown-confluence vs duo-labs vs mdspec (setup time, config style, image handling, ADF/HTML, multi-space, GitHub token required)
- Present "recommended modern setup" — the `.mdspecmap` one-line action
- Fall-through section: same config publishing to Notion or S3 simultaneously
**Word count target:** 2,000–2,800
**Internal links out:** M1 (hub), M2, M4
**Status notes:**

---

### M4 — Consideration/MOFU `[x]`
**Title:** Notion's GitHub Integration Is Read-Only: 5 Workarounds for Actually Publishing Markdown from Your Repo
**Slug:** `/blog/notion-github-integration-limitations`
**Primary keyword:** notion github integration (long-tail: notion github integration limitations)
**Funnel:** Captures buyers in active evaluation who've already hit the wall
**Angle:**
- Lead with brutal honesty about Notion's limits (no markdown content sync, read-only, free plan cap)
- Five approaches ranked by fit: Zapier/Make (metadata only) → tryfabric/markdown-to-notion → notionreposync → custom Node script → mdspec-style config
- Even-handed "if you outgrew option 2" positioning — earns trust, not just a sales pitch
**Word count target:** 1,800–2,200
**Internal links out:** M1 (hub), M3, M5
**Status notes:**

---

### M5 — Consideration/MOFU (long-tail capture) `[x]`
**Title:** Why ClickUp Docs Goes Stale (And How to Sync Markdown from GitHub Automatically)
**Slug:** `/blog/clickup-markdown-github-sync`
**Primary keyword:** clickup markdown (variants: sync github to clickup, clickup docs from github)
**Funnel:** Frustrated, motivated audience with zero good existing options — highest intent-to-conversion ratio
**Angle:**
- Validate pain first by quoting real ClickUp feedback board complaints
- Explain why it's hard technically (Docs vs Tasks API path difference; Pipedream/Zapier/Make can't bridge it)
- Show working pattern: `/specs/` in git → `.mdspecmap` → CI pushes to ClickUp Docs via API on merge
**Word count target:** 1,600–2,000
**Internal links out:** M1 (hub), M3
**Status notes:**

---

## Other 5 Posts (Supporting / Tactical)
These extend the funnel into use-case-specific and persona-specific angles not covered above.

### O1 — Developer Quickstart `[x]`
**Title:** mdspec in 5 Minutes: From Zero to Publishing Markdown on Every Merge
**Slug:** `/blog/mdspec-quickstart`
**Primary keyword:** publish markdown github actions
**Funnel:** Activation — developers who've heard of mdspec or landed on the homepage and want "show me it working"
**Angle:**
- Screencast-style walkthrough: create a repo, add one `.mdspecmap`, add the GitHub Actions step, push a commit, see it appear in Confluence/Notion
- Real copy-paste YAML throughout
- Benchmarks: total setup time under 5 minutes, no personal access tokens required on the target platform side
**Word count target:** 1,000–1,400 (shorter is fine — code-heavy)
**Internal links out:** M3, M1
**Status notes:**

---

### O2 — AI Agents Angle `[x]`
**Title:** Why AI Agents Need Your Specs in Git, Not Locked in a SaaS (And How to Serve Them from S3)
**Slug:** `/blog/ai-agents-markdown-specs`
**Primary keyword:** serve markdown to ai agents, llm documentation source of truth
**Funnel:** TOFU emerging — engineers building with Claude/GPT who need reliable context injection
**Angle:**
- Concrete problem: AI coding agents (Cursor, Claude Code, Copilot Workspace) read context from URLs or file paths — not Notion pages or Confluence spaces
- S3-hosted markdown as the canonical machine-readable layer
- `.mdspecmap` pattern: one source, fan out to S3 (AI reads) + Confluence (humans read) + Notion (PMs read)
- Include sample system prompt snippet showing how to pass an S3 spec URL to Claude
**Word count target:** 1,600–2,000
**Internal links out:** M1, M2
**Status notes:**

---

### O3 — Engineering Manager Persona `[x]`
**Title:** The Engineering Manager's Playbook for Ending Documentation Debt
**Slug:** `/blog/engineering-manager-documentation-debt`
**Primary keyword:** documentation debt engineering, reduce documentation debt
**Funnel:** TOFU — EMs searching for process solutions, not tools
**Angle:**
- Name the real cost: onboarding friction, on-call confusion from stale runbooks, security audit fails on old Confluence pages
- Three root causes of doc debt: no single owner, no enforcement hook, no easy publish path
- Framework: Git as the owner (no individual), CI as the enforcement hook, `.mdspecmap` as the publish path
- Practical: what to put in the ADR/spec template, how to structure `/specs/` in a monorepo
**Word count target:** 1,800–2,200
**Internal links out:** M2 (spec drift), M1 (hub), O4
**Status notes:**

---

### O4 — ADR Publishing Use Case `[x]`
**Title:** ADR Publishing Pipeline: From Architecture Decision to Confluence in 60 Seconds
**Slug:** `/blog/adr-publishing-pipeline`
**Primary keyword:** adr confluence, architecture decision record publishing
**Funnel:** MOFU — developers who already write ADRs and want to get them out of the repo graveyard
**Angle:**
- Why ADRs die: they're in git, only devs read git, stakeholders and PMs live in Confluence/Notion
- The 60-second pipeline: write ADR in `/docs/decisions/`, merge PR, ADR auto-publishes to Confluence space + Notion database
- Worked `.mdspecmap` example for an ADR workflow
- Bonus: tagging ADRs with status (proposed/accepted/deprecated) and how to reflect that in Confluence labels
**Word count target:** 1,400–1,800
**Internal links out:** M1 (hub), M3 (Confluence setup), O3 (EM playbook)
**Status notes:**

---

### O5 — Competitive/Comparison `[x]`
**Title:** GitBook vs Mintlify vs mdspec: Which One Actually Solves the Spec Drift Problem?
**Slug:** `/blog/gitbook-mintlify-mdspec-comparison`
**Primary keyword:** gitbook alternative, mintlify alternative developers
**Funnel:** BOFU — buyers comparing tools, high commercial intent
**Angle:**
- Honest comparison: GitBook and Mintlify are great for *external* product docs; they solve a different problem
- The gap: neither publishes your *internal* specs/ADRs/runbooks to where your team already lives (Confluence, Notion, ClickUp)
- Comparison table: target audience, markdown support, multi-destination, CI integration, pricing tier where feature appears
- End with clear recommendation matrix: "if your goal is X, use Y"
**Word count target:** 1,600–2,000
**Internal links out:** M1, M4, M3
**Status notes:**

---

## Publishing Order
1. **M1** — Hub post first (defines the category; all others link back)
2. **M2** — Spec drift (TOFU traffic; links down to hub)
3. **M3** — Confluence guide (highest-intent BOFU; links back to hub)
4. **O1** — Quickstart (developer activation; rides M3's traffic)
5. **M4** — Notion limitations (consideration buyers; cross-links M3 + M1)
6. **M5** — ClickUp (long-tail; links to M1 + M3)
7. **O4** — ADR pipeline (use-case depth; links to M1 + M3)
8. **O3** — EM playbook (persona; links to M2 + M1)
9. **O2** — AI agents (emerging angle; links to M1 + M2)
10. **O5** — Comparison post (BOFU mop-up; publish last when other posts are indexed)

---

## Quick Reference: All Posts

| ID | Status | Title (short) | Keyword | Funnel |
|----|--------|---------------|---------|--------|
| M1 | `[x]` | Spec-as-Code hub | spec as code | Brand/TOFU |
| M2 | `[x]` | Spec drift | spec drift | TOFU |
| M3 | `[x]` | Markdown to Confluence | markdown to confluence github actions | BOFU |
| M4 | `[ ]` | Notion GitHub limitations | notion github integration limitations | MOFU |
| M5 | `[ ]` | ClickUp markdown sync | clickup markdown | MOFU |
| O1 | `[x]` | mdspec quickstart | publish markdown github actions | Activation |
| O2 | `[x]` | AI agents + specs | llm documentation source of truth | TOFU |
| O3 | `[x]` | EM doc debt playbook | documentation debt engineering | TOFU |
| O4 | `[x]` | ADR pipeline | adr confluence | MOFU |
| O5 | `[x]` | GitBook vs Mintlify vs mdspec | gitbook alternative | BOFU |

---

## Session Log
| Date | Work done |
|------|-----------|
| 2026-05-09 | Plan created from may9th.md strategy research |
| 2026-05-09 | M1 written — spec-as-code.md (~2,400 words) |
| 2026-05-09 | M2 written — spec-drift.md (~2,100 words) |
| 2026-05-09 | M3 written — markdown-to-confluence-github-actions.md (~2,600 words) |
| 2026-05-09 | O1 written — mdspec-quickstart.md (~1,200 words) |
| 2026-05-09 | M4 written — notion-github-integration-limitations.md (~2,200 words) |
| 2026-05-09 | M5 written — clickup-markdown-github-sync.md (~2,000 words) |
| 2026-05-09 | O4 written — adr-publishing-pipeline.md (~1,800 words) |
| 2026-05-09 | O3 written — engineering-manager-documentation-debt.md (~2,300 words) |
| 2026-05-09 | O2 written — ai-agents-markdown-specs.md (~2,000 words) |
| 2026-05-09 | O5 written — gitbook-mintlify-mdspec-comparison.md (~2,000 words) |
| 2026-05-09 | ALL 10 POSTS COMPLETE |
