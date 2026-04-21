---
title: "The Easy Way to Manage Specs in Your Repo"
description: "From Backstage to Confluence to plain wikis — managing engineering specs is a solved problem with many overcomplicated solutions. Here's a comparison, and a frictionless alternative."
pubDate: 2026-04-07
author: "mdspec team"
tags: ["Specs", "Developer Tools", "Documentation", "Workflow"]
readingTime: "8 min read"
---

Every engineering team eventually hits the same wall: the specs that describe your system don't live where your system lives.

Your code is in GitHub. Your specs are in Confluence, or Notion, or a shared Google Doc, or a Backstage service catalog, or all four simultaneously and none of them agree. Nobody wrote them in the first place because the overhead was too high, and now nobody updates them because the overhead got higher.

This is a genuinely hard problem that the industry has been trying to solve for years. Let's look at the main approaches — and be honest about what each one actually costs.

## The Landscape of Spec Management Tools

### 1. Confluence (and similar wikis)

**What it is:** The classic enterprise documentation platform. Nested pages, rich editor, permissions, search.

**What works:** It's familiar. Everyone in the org can read it. Product, design, support, and engineering all have access. Search is decent.

**What doesn't:** Engineering specs in Confluence are almost always out of date. The workflow to update them is: finish the feature → remember to update the doc → open Confluence → find the right page → edit in a WYSIWYG editor that doesn't render code well → save.

That workflow has too many steps and too much context switching. So it doesn't happen.

**Also:** Confluence docs don't live in version control. You can't review a spec change the same way you review a code change. You can't see the history in context with the code that changed. There's no diff. There's no PR.

**Verdict:** Great for distribution. Terrible for authoring and maintaining engineering specs. Works well as a *destination*, not as a source of truth.

---

### 2. Notion

**What it is:** Flexible workspace for notes, docs, databases, and wikis.

**What works:** Genuinely pleasant to write in. The database views are powerful for tracking specs by service, team, or status. Non-engineers actually use it.

**What doesn't:** Same fundamental problem as Confluence — the authoring workflow is disconnected from the development workflow. Engineers have to context-switch out of their code editor, navigate to the right database, and update a page manually.

Notion also has an API, which tempts teams to build their own sync automation. This usually results in a fragile custom script that breaks quietly and gets blamed six months later when specs are discovered to be wildly wrong.

**Verdict:** Excellent reading experience. Poor at keeping engineering specs current over time.

---

### 3. Backstage

**What it is:** Spotify's open-source developer portal. A full platform for service catalogs, documentation, and developer tooling.

**What works:** Deeply integrated with your engineering infrastructure. The `catalog-info.yaml` approach means services self-describe. TechDocs renders markdown docs from repos directly in the portal.

**What doesn't:** Backstage is heavy. Deploying and maintaining a Backstage instance is a significant infrastructure investment. It requires a dedicated platform team or at least an engineer willing to own it. The ROI is real at scale, but at small or medium teams it's overkill.

Also: TechDocs requires `mkdocs.yml` in your repo and specific directory conventions. It's opinionated in ways that require retrofitting existing projects.

**Verdict:** Excellent at scale for organizations with platform engineering resources. Too much overhead for most teams.

---

### 4. Plain markdown in the repo (no sync)

**What it is:** Just commit `.md` files to `docs/` and call it done.

**What works:** Zero overhead. No external dependencies. Version-controlled. Co-located with the code. AI tools can read it. This is genuinely the best authoring experience — you never leave your editor.

**What doesn't:** Nobody outside engineering reads GitHub. Your PM isn't opening `docs/specs/payment-service.md` on a Tuesday afternoon. So the specs are perfectly authored and completely invisible to half the people who need them.

**Verdict:** The right authoring workflow. Incomplete distribution story.

---

### 5. Custom CI scripts

**What it is:** Teams write their own GitHub Actions workflows to push markdown to Confluence, Notion, or S3 via API.

**What works:** In theory, everything. In practice, it works until the API changes, the token expires, the page structure changes, or the person who wrote it leaves.

**What doesn't:** Maintenance burden is real. The Confluence API, Notion API, and ClickUp API all have quirks. Handling updates vs. creates, page parents, frontmatter parsing, error states — it adds up. And this script is never someone's primary job, so it gets neglected.

**Verdict:** Solves the problem temporarily. Accrues operational debt.

---

## What the Ideal Solution Looks Like

Given the above, the ideal spec management approach has these properties:

- **Authoring in the repo.** Markdown in your editor, version-controlled, co-located with code. No context switching.
- **Sync, not copy.** Changes in the repo automatically propagate to wherever the team reads docs. No manual steps.
- **Managed with code.** The sync configuration is a file in the repo. It can be reviewed in PRs, versioned, understood by new engineers.
- **Unintrusive.** Doesn't require restructuring your directory layout. Doesn't add a new concept to your mental model. Doesn't require a dedicated platform team.
- **Works with the tools people already use.** Notion, Confluence, ClickUp, S3 — meet the team where they are.

## mdspec: The Frictionless Alternative

[mdspec](https://mdspecr2-web.vercel.app) is built on exactly this model.

You drop two files into your repo:

**`.mdspecmap`** — defines which folders sync where:

```yaml
mappings:
  - folder: docs/specs
    integration: notion
    parent: engineering-docs

  - folder: docs/decisions
    integration: confluence
    parent: adr-space
```

**`.github/workflows/mdspec.yml`** — one CI step:

```yaml
- name: Publish specs
  run: npx mdspeci publish --project ${{ vars.PROJECT_ID }}
  env:
    MDSPEC_TOKEN: ${{ secrets.MDSPEC_TOKEN }}
```

Every push to `main`, mdspec detects which files changed (via git diff) and syncs only those. If you update `docs/specs/auth.md`, that page in Notion updates. If you haven't touched `docs/specs/billing.md`, it doesn't run.

No custom scripts. No maintenance burden. No new tool for engineers to learn — you're still writing markdown in your editor. The `.mdspecmap` file is managed like any other config: versioned, reviewed in PRs, co-located with the code it describes.

And because mdspec supports multiple integrations, you can sync the same spec to Notion *and* Confluence simultaneously — different audiences getting the same canonical content from the same source.

## The Right Mental Model

Stop thinking of spec management as an authoring problem. The authoring is solved: write markdown in your repo.

The problem is **distribution** — getting specs to the people who need them, in the tools they already use, without manual effort.

The answer isn't a heavier tool. It's a thin sync layer that connects the repo (where specs belong) to the destinations (where people read them).

Two files. One step. Done.
