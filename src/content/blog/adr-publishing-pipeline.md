---
title: "ADR Publishing Pipeline: From Architecture Decision to Confluence in 60 Seconds"
description: "ADRs die in the repo because only engineers read git. Here's how to wire a pipeline that publishes every merged ADR to Confluence (and Notion) automatically — with a worked .mdspecmap example."
pubDate: 2026-05-09
author: "mdspec team"
tags: ["ADR", "Architecture Decision Records", "Confluence", "GitHub Actions", "Documentation"]
readingTime: "7 min read"
---

Architecture Decision Records are one of the best documentation habits engineering teams can develop. They're also one of the most reliably abandoned.

The pattern is familiar: team adopts ADRs, engineers write them diligently for three months, then the ADR folder in the repo becomes a graveyard that only gets opened when someone new joins and goes looking for historical context. The decisions are recorded. Nobody reads them.

The reason isn't that ADRs are a bad idea. It's that ADRs in git are only visible to people who look in git. Stakeholders, product managers, and security reviewers — the people who most need to see architectural decisions — live in Confluence or Notion. They won't go to the repo. They can't find the ADRs. So from their perspective, the decisions aren't documented at all.

This post walks through a pipeline that fixes the visibility problem without changing how engineers write ADRs.

---

## Why ADRs Die in the Repo

ADRs are typically stored in a folder like `/docs/decisions/` or `/adr/`, named with a number prefix and a short title:

```
docs/decisions/
  001-database-choice.md
  002-auth-strategy.md
  003-api-versioning.md
  004-caching-layer.md
```

They're written in markdown, reviewed in pull requests, and merged. Excellent practice. The problem starts after the merge.

The engineer who wrote the ADR knows it's there. Their immediate teammates might know. Anyone who does `git log` or looks at the PR occasionally will encounter it. But the PM who asked "why did we choose Postgres over MySQL?" in the quarterly planning meeting doesn't know to look in `/docs/decisions/001-database-choice.md`. The security auditor who wants to understand the auth architecture doesn't know that `002-auth-strategy.md` exists.

What those stakeholders will do is open Confluence and search. If there's nothing there, they'll ask an engineer. The engineer will answer from memory or paste the content from the ADR into Slack. The Confluence space stays empty. The ADRs stay invisible. The cycle repeats.

The fix isn't to move ADRs to Confluence — then you lose the PR-review workflow and git history. The fix is to keep ADRs in git and automatically publish them to Confluence on merge.

---

## The Pipeline

Three components:

1. **A structured ADR folder** in git — nothing changes about how engineers write ADRs
2. **A `.mdspecmap` config** that declares which folder maps to which Confluence space
3. **A GitHub Actions step** that publishes on every merge to main

### The ADR Template

A clean ADR template that works well for Confluence publishing:

```markdown
# ADR-004: Introduce Redis for Session Caching

**Status:** Accepted  
**Date:** 2026-05-09  
**Deciders:** @engineerA, @engineerB, @em-name

## Context

Session lookups on the auth service are adding 40–80ms to every authenticated request because we're hitting Postgres on every check. With 2M daily active users, this is a meaningful latency contribution.

## Decision

Introduce Redis as a session cache in front of Postgres. Session tokens will be written to Redis on login and verified from Redis on subsequent requests. Redis entries expire after 7 days, matching session expiry. Postgres remains the source of truth.

## Alternatives Considered

**Memcached** — comparable performance, but less operational familiarity on the team and weaker persistence story for disaster recovery.

**Database connection pooling improvements** — addresses connection overhead but not the fundamental per-request latency from querying Postgres.

**JWT without server-side session store** — removes the session lookup entirely but loses the ability to invalidate sessions server-side (required for our security posture).

## Consequences

- Redis instance required in production and staging (Ops ticket #4521)
- Session invalidation path now requires Redis flush + Postgres update
- Read path latency target: under 5ms for cache hits
- Cache miss behavior: fall through to Postgres, write to Redis, return token
```

This template produces a Confluence page that's immediately useful to a non-engineer: the Status field tells them whether this decision is live, the Context section explains the problem, the Decision section explains what was chosen, and the Consequences section tells them what changed.

### The `.mdspecmap` Config

```yaml
version: 1

sources:
  - path: docs/decisions/
    destinations:
      - type: confluence
        space: ENG
        parentPage: "Architecture Decisions"
      - type: notion
        databaseId: "your-adr-database-id"
        pageTitle: auto
```

A few things worth noting:
- `path: docs/decisions/` — pointing at a folder, not individual files. Every `.md` file in that folder gets published. New ADRs are picked up automatically without changing the config.
- `pageTitle: auto` — mdspec uses the file's H1 as the page title. The `# ADR-004: Introduce Redis...` becomes the Confluence page title.
- Two destinations in one block — Confluence for engineering and security, Notion for product and leadership. Same source, simultaneous publish.

### The GitHub Actions Workflow

```yaml
name: Publish ADRs

on:
  push:
    branches:
      - main
    paths:
      - 'docs/decisions/**'
      - '.mdspecmap'
  workflow_dispatch:

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: mdspec/publish@v1
        with:
          map: .mdspecmap
        env:
          CONFLUENCE_BASE_URL: ${{ secrets.CONFLUENCE_BASE_URL }}
          CONFLUENCE_USER_EMAIL: ${{ secrets.CONFLUENCE_USER_EMAIL }}
          CONFLUENCE_API_TOKEN: ${{ secrets.CONFLUENCE_API_TOKEN }}
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
```

The `paths` filter means this only runs when ADR files change — not on every push to main.

---

## The 60-Second Flow

Once the pipeline is set up, the ADR publishing flow works like this:

1. Engineer writes an ADR in `docs/decisions/005-new-feature.md`
2. Opens a PR — the ADR is reviewed alongside the code it describes
3. PR merges to main
4. GitHub Actions triggers the publish workflow (~30 seconds to run)
5. Confluence page created or updated under "Architecture Decisions"
6. Notion page created or updated in the ADR database
7. PM opens Confluence → finds the decision → understands the context

From merge to Confluence page: 60 seconds. No additional action required from the engineer.

---

## Handling ADR Status

A common pattern in ADR workflows is tracking the status of each decision: Proposed, Accepted, Deprecated, Superseded. The status matters for readers — a deprecated ADR describes something that no longer applies, and a reader needs to know that immediately.

There are two ways to handle this with the publishing pipeline:

**Option 1: Status in the frontmatter or body (simple)**

Include the status explicitly in the ADR body, as in the template above:

```markdown
**Status:** Accepted
```

This renders cleanly in both Confluence and Notion. No special pipeline handling needed.

**Option 2: Status in the folder structure (organized)**

Structure your ADR folder by status:

```
docs/decisions/
  proposed/
    005-new-caching-layer.md
  accepted/
    001-database-choice.md
    002-auth-strategy.md
    003-api-versioning.md
  deprecated/
    004-old-api-versioning.md
```

Then map each subfolder to a different Confluence parent page:

```yaml
sources:
  - path: docs/decisions/proposed/
    destinations:
      - type: confluence
        space: ENG
        parentPage: "ADRs — Proposed"

  - path: docs/decisions/accepted/
    destinations:
      - type: confluence
        space: ENG
        parentPage: "ADRs — Accepted"

  - path: docs/decisions/deprecated/
    destinations:
      - type: confluence
        space: ENG
        parentPage: "ADRs — Deprecated"
```

Moving an ADR from `proposed/` to `accepted/` triggers a publish to the "Accepted" parent in Confluence. The folder structure becomes the Confluence hierarchy. This is more setup but produces a cleaner Confluence space for organizations that have many ADRs.

---

## Setting Up the Confluence Space

For the publishing to work cleanly, you need a parent page in Confluence to publish under. Create it manually the first time:

1. Open your Confluence space
2. Create a new page called "Architecture Decisions" (or whatever matches your `parentPage` value in `.mdspecmap`)
3. Optionally add a brief description explaining that this page's children are auto-published from the repo

The first time CI runs, it will create child pages under "Architecture Decisions" for each ADR. Subsequent runs will update those pages in place.

You don't need to create the child pages manually — mdspec handles that. You only need the parent page to exist.

---

## Getting Stakeholders to Actually Read Them

The pipeline solves the visibility problem — ADRs are now in Confluence where stakeholders look. A few practices that increase read rates further:

**Link from the relevant Confluence spaces.** If `002-auth-strategy.md` is relevant to the Security team's Confluence space, add a link from their space to the ADR in "Architecture Decisions." Cross-links within Confluence are how people discover content organically.

**Reference ADRs in sprint planning docs.** When a decision affects an upcoming feature, mention it in the sprint doc: "See ADR-002 for the auth strategy this builds on." This surfaces ADRs in context, when they're most relevant.

**Add a "Related ADRs" section to service specs.** If you maintain a `specs/auth-service.md` that describes the auth system, link to the relevant ADRs at the bottom. Readers of the service spec will naturally follow the links to understand why decisions were made.

**Include the Confluence space link in your onboarding docs.** New team members are the most motivated ADR readers — they want historical context. Put the Architecture Decisions Confluence page link in your onboarding checklist.

---

## Connection to the Broader Spec Publishing Pattern

ADR publishing is a specific application of the [spec-as-code](/blog/spec-as-code) pattern: git as the source, CI as the synchronization mechanism, Confluence and Notion as the human-readable destinations. The same `.mdspecmap` config that handles your ADRs can handle your full service specs, runbooks, data retention policies, and other internal documentation.

The [Engineering Manager's Playbook for Ending Documentation Debt](/blog/engineering-manager-documentation-debt) covers the broader organizational context — why documentation debt accumulates and how the spec-publishing pattern fits into a team-level process.

---

## Getting Started

If you already write ADRs in git, the setup is:

1. Make sure your ADR folder is consistently structured (all files in one folder, or the status-subfolder pattern above)
2. Add a `.mdspecmap` pointing at the folder with your Confluence and/or Notion destination
3. Add your API secrets to GitHub
4. Add the GitHub Actions workflow
5. Push a change to any ADR file (or run `workflow_dispatch`) to trigger the first publish

If you don't yet write ADRs, start with the template above and the [spec-as-code](/blog/spec-as-code) pattern for the overall folder structure.

Either way, the pipeline takes 15–20 minutes to set up and keeps your Architecture Decisions Confluence space current indefinitely, without any ongoing effort.

---

*mdspec handles ADR publishing as part of its broader `.mdspecmap` multi-destination publishing. [Get started at mdspec.io](https://mdspec.io).*
