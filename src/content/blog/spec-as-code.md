---
title: "Spec-as-Code: Publishing One Markdown Source to Notion, Confluence, ClickUp, and S3 from a Single Repo"
description: "Spec-as-code is the missing layer between 'docs as code' and the reality of multi-tool engineering orgs. One markdown source in git. Automatic fan-out to wherever your team actually reads."
pubDate: 2026-05-09
author: "mdspec team"
tags: ["Spec-as-Code", "Documentation", "GitHub Actions", "Markdown", "Developer Workflow"]
readingTime: "10 min read"
---

There's a pattern that quietly breaks in almost every engineering team after about twenty people:

Technical specs, ADRs, and runbooks get written in the repo. Engineers find them because engineers live in git. Product managers look in Notion. Security auditors look in Confluence. On-call engineers look in ClickUp or wherever the ops team decided to centralize runbooks. Customers — and increasingly, AI agents — look at wherever you've published structured documentation externally.

The spec is in one place. The readers are in four.

So what happens? The spec gets copied. Manually. Into Confluence by someone who remembered. Into Notion by someone else six months later. Into ClickUp, maybe, eventually. And then the original changes. And the copies don't.

This is [spec drift](/blog/spec-drift) — and it's not a discipline problem. It's an architectural one. No amount of "documentation culture" fixes a workflow that requires manual synchronization across four tools. The fix is architectural: treat your specs the same way you treat your code.

That's what spec-as-code is.

---

## Why "Docs as Code" Isn't Enough

"Docs as code" is a real and valuable practice. The principle — store your documentation in version-controlled text files, review it in pull requests, deploy it like software — has been mainstream since at least the Write the Docs community formalized it in the early 2010s.

But it's incomplete for the specific problem of *technical specifications* in multi-tool engineering orgs.

Here's the gap: docs-as-code tooling (GitBook, Mintlify, Fern, Bump.sh) is optimized for *publishing to the outside world*. It's great for API references, product documentation, developer portals. What it doesn't solve is the internal problem: your `/specs/` and `/docs/decisions/` folder sits in git, and the people who need those documents every day — product managers, on-call engineers, security reviewers, customer success teams — are not going to git to find them.

Spec-as-code is docs-as-code plus a fan-out layer: the ability to push from one authoritative source in git to wherever your org actually reads.

---

## Three Trends That Make This Inevitable

This isn't a new idea being forced onto teams. It's the natural convergence of three shifts already underway.

### 1. ADRs and design docs are landing in git

Architecture Decision Records have been quietly going mainstream. Caitie McCaffrey popularized them at Microsoft for the Azure Sphere project. Andrea Bergia made the case for keeping design docs in git rather than Confluence for long-term discoverability. Xebia's ADR tooling brought structured templates into standard practice.

The consensus: specs and decisions belong in the repository that holds the code they describe. Proximity to code makes docs easier to find, easier to update in the same PR, and easier to audit.

What teams haven't fully solved: once the ADR is in git, how does a non-engineer reviewer actually see it?

### 2. Native integrations are hitting hard walls

Every tool now claims to integrate with every other tool. In practice, those integrations are read-only, scoped to metadata, or limited to a single destination.

Notion's GitHub integration syncs pull requests and issues into a Notion database. It cannot publish markdown content from your repo into a Notion page. [Zapier confirmed](https://community.zapier.com/) it cannot transfer file contents between GitHub and Notion — users are pointed to perpetually-open feature requests. Make has the same limitation.

Confluence has better options — there are several open-source GitHub Actions that publish markdown to Confluence — but they're fragmented, require per-file frontmatter or manual page-ID mapping in code, and none of them publish to a second destination simultaneously.

ClickUp is the starkest case. Its own feedback board has years of unresolved requests for proper markdown support in Docs, and every third-party integration that claims to bridge GitHub and ClickUp operates on tasks, not documents.

The net result: teams that want to publish a spec from git to Notion *and* Confluence *and* ClickUp end up with three separate workflows, three separate authentication setups, and three separate things that can go wrong when a spec changes.

### 3. AI agents need machine-readable specs

This is the newest pressure, and it's accelerating fast.

AI coding agents — Cursor, Claude Code, Copilot Workspace — read context from URLs and file paths. They can't authenticate into your Confluence space or your Notion workspace. They need specs in a format they can reach: S3-hosted markdown, a raw GitHub URL, a public documentation endpoint.

If your authoritative spec is a manually-copied Confluence page that's three months behind the repo, you've given your AI agent a map from the wrong edition. It will give you suggestions based on behavior your team deprecated last quarter.

The solution isn't to change how AI agents work. It's to keep the authoritative spec in git and publish a machine-readable copy to S3 (or equivalent) on every merge — the same action that publishes the human-readable copy to Confluence and Notion.

---

## What Spec-as-Code Looks Like in Practice

The pattern has three components: a source folder, a config file, and a CI step.

### The source folder

Keep your specs and ADRs in a `/specs/` or `/docs/` folder in your repository. Plain markdown. One file per spec, named to be human-readable:

```
/specs/
  auth-service.md
  rate-limiting.md
  data-retention-policy.md
/docs/decisions/
  001-database-choice.md
  002-auth-strategy.md
  003-api-versioning.md
```

No special syntax. No proprietary format. Just markdown, because every tool in your stack can consume markdown, and every AI agent can read it.

### The config file: `.mdspecmap`

The `.mdspecmap` file is a single configuration file that declares where each spec should be published. It lives at the root of your repo.

Here's a complete example mapping one `/specs/` folder to four destinations:

```yaml
version: 1

sources:
  - path: specs/auth-service.md
    destinations:
      - type: confluence
        space: ENG
        parentPage: "Backend Services"
      - type: notion
        databaseId: "abc123..."
        pageTitle: "Auth Service Spec"
      - type: clickup
        listId: "def456..."
        docName: "Auth Service"
      - type: s3
        bucket: docs.yourcompany.com
        key: specs/auth-service.md

  - path: specs/rate-limiting.md
    destinations:
      - type: confluence
        space: ENG
        parentPage: "Backend Services"
      - type: s3
        bucket: docs.yourcompany.com
        key: specs/rate-limiting.md

  - path: docs/decisions/
    destinations:
      - type: confluence
        space: ENG
        parentPage: "Architecture Decisions"
      - type: notion
        databaseId: "ghi789..."
        pageTitle: auto  # uses the markdown H1
```

The structure is declarative: source path on the left, destination list on the right. You're not writing code. You're not managing page IDs in frontmatter across dozens of files. You're writing a map — once — and letting CI handle the rest.

### The CI step

The GitHub Actions step is a single line:

```yaml
- uses: mdspec/publish@v1
  with:
    map: .mdspecmap
  env:
    CONFLUENCE_TOKEN: ${{ secrets.CONFLUENCE_TOKEN }}
    NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
    CLICKUP_TOKEN: ${{ secrets.CLICKUP_TOKEN }}
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

Wire it to run on push to your main branch and you have spec-as-code: every merged change to a spec file triggers a synchronized publish to every destination declared in the map. Engineers work in git. Everyone else sees current content wherever they already look.

No manual copying. No "someone should update the Confluence page." No drift.

---

## What This Solves That Nothing Else Does

The reason this pattern doesn't exist as a general feature in any single tool is that each tool is optimized for its own destination. Confluence's GitHub Action publishes to Confluence. Notion's integration doesn't publish at all. ClickUp has no official publish path from git.

The gap is the *fan-out* — the ability to treat a single markdown file as the source and push it simultaneously to multiple destinations on every change.

This matters in practice because engineering orgs are almost never single-platform. The engineering team lives in Confluence. Product lives in Notion. Ops lives in ClickUp. And increasingly, AI agents need S3. No single docs platform owns the whole org, which means any solution that requires you to pick one platform just relocates the problem.

Spec-as-code sidesteps the platform consolidation argument entirely. You keep your specs in git, where they belong. You publish to wherever your readers are, without asking your readers to change their tools.

---

## How to Structure Your Specs Folder

A few patterns that work well in practice:

**By service or domain:**
```
/specs/
  payments/
    checkout-flow.md
    refund-policy.md
  auth/
    session-management.md
    oauth-flow.md
```

**By audience:**
```
/specs/
  engineering/    → publishes to Confluence ENG space
  product/        → publishes to Notion product database
  security/       → publishes to Confluence SEC space + S3
```

**By lifecycle (common for ADRs):**
```
/docs/decisions/
  proposed/
    004-new-caching-layer.md
  accepted/
    001-database-choice.md
    002-auth-strategy.md
  deprecated/
    003-old-api-versioning.md
```

The `.mdspecmap` config can handle any of these structures. You can map individual files, entire folders, or folder subsets — and you can map the same file to different destinations based on its path.

---

## The Connection to Spec Drift

Spec-as-code is the architectural answer to [spec drift](/blog/spec-drift).

Drift happens when specs have to be manually synchronized. If updating `auth-service.md` in git doesn't automatically update the Confluence page the security team reads, someone has to remember to do it. Nobody remembers every time. The copies diverge.

The spec-as-code pattern eliminates the manual step. The source is git. The CI is the synchronization mechanism. The destinations are always as current as the last merged commit.

This also changes the culture question. Teams don't need to ask "who's responsible for keeping Confluence up to date?" The answer is: nobody, because CI handles it. The question becomes "who's responsible for keeping the spec in git accurate?" — and that's a question engineers already know how to answer, because it's the same question as "who's responsible for keeping the code accurate?"

---

## Getting Started

The fastest path from zero to spec-as-code:

1. **Create a `/specs/` folder** in your existing repo. Move any markdown specs that currently live in Confluence, Notion, or locally into it. This is the source of truth from here on.

2. **Add a `.mdspecmap`** at the repo root. Start with one file and one destination. Get the CI step working end-to-end before mapping more destinations.

3. **Add the GitHub Actions step** and run it once manually with `workflow_dispatch` to verify your tokens and page mappings work.

4. **Expand the map** once the first destination is working. Adding a second destination to an existing source is one line in the config.

5. **Retire the manual copies.** Once your CI is reliably publishing to Confluence, delete or archive the manually-maintained pages. This is the step that actually ends drift — as long as the manual copies exist, someone will update them instead of the source.

For a detailed step-by-step on the Confluence side specifically, see [Publish Markdown to Confluence with GitHub Actions](/blog/markdown-to-confluence-github-actions). For the Notion integration and its limitations, see [Notion's GitHub Integration Is Read-Only](/blog/notion-github-integration-limitations). For the ClickUp path, see [Why ClickUp Docs Goes Stale](/blog/clickup-markdown-github-sync).

---

## Why This Is the Right Moment

The timing is better now than it was two years ago for three reasons.

First, markdown has won as the universal internal documentation format. Every tool that matters supports markdown import, at minimum. The friction of "but our team writes in Confluence natively" is lower now than it was when collaborative markdown editing was harder.

Second, GitHub Actions has made per-merge CI hooks essentially free to add. A publishing step that runs on every push to main has zero ongoing maintenance overhead once it's wired up.

Third, AI agents. Teams that adopt spec-as-code today get S3-hosted machine-readable specs as a side effect. Teams that don't are already accumulating AI context debt — the gap between what their agents can read and what their systems actually do.

Spec-as-code isn't a documentation tool. It's the plumbing that makes one source of truth actually work across the fragmented tool reality of a real engineering organization. The idea is simple. The problem it solves is the one that's been quietly breaking documentation workflows for years.

---

*mdspec is the tool that implements this pattern. The `.mdspecmap` config, the one-line GitHub Actions step, and the multi-destination publishing engine are all part of mdspec. [Get started here](https://mdspec.io).*
