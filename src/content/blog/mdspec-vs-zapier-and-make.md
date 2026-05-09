---
title: "mdspec vs Zapier and Make: Why a Purpose-Built Tool Beats a General One"
description: "Zapier and Make can connect almost anything to anything. So why use a dedicated tool like mdspec for syncing markdown specs? Because 'fits anything' is a tax you keep paying — and 'fits one thing perfectly' is the whole point."
pubDate: 2026-05-01
author: "mdspec team"
tags: ["Zapier", "Make", "Automation", "Developer Workflow", "Documentation"]
readingTime: "7 min read"
---

Every engineering team eventually has the same conversation. Someone says: "We already pay for Zapier. Can't we just use that?"

It's a fair question. Zapier and Make (formerly Integromat) are remarkable products. They connect thousands of apps, run on triggers, fan out to actions, and handle a staggering range of automations across sales, marketing, ops, and IT. If your goal is to move a row from a Google Sheet into a Slack message when a Stripe event fires, these tools are nearly unbeatable.

But "nearly unbeatable for general automation" is not the same as "the right tool for syncing markdown specs from your repo to Notion, Confluence, ClickUp, and S3." That's a narrower problem with a different shape — and a general iPaaS turns out to be a surprisingly poor fit for it.

Here's the honest comparison.

## What Zapier and Make Are Genuinely Great At

Before knocking them, give them their due. Zapier and Make excel when:

- **The trigger is event-shaped.** A new row, a new email, a new form submission, a webhook firing. Discrete events with a clear payload.
- **The transformation is simple.** Map field A to field B. Insert a value. Concatenate two strings. Send to the next step.
- **The destination has a well-supported integration.** Slack, Gmail, Airtable, HubSpot, Stripe — first-class connectors with maintained UIs.
- **The automation is owned by a non-engineer.** A marketer, an ops lead, a founder gluing together their stack. The visual editor is the entire point.

This is a real and large category of work. Zapier and Make are correctly the answer for most of it.

The problem is what happens when you push them into territory they weren't designed for.

## Why Markdown Sync Doesn't Fit the iPaaS Model

Syncing engineering specs from a Git repo into a docs platform looks superficially like an automation problem — "when a file changes, update the page" — so it's natural to reach for Zapier or Make. In practice, the abstractions don't line up.

### 1. The trigger isn't an event. It's a diff.

Zapier and Make think in events: *something happened, react to it.* A push to `main` is an event, sure, but the meaningful thing isn't "a push happened" — it's *which files changed in that push*.

Out of the box, neither tool gives you `git diff`. You can wire up a GitHub trigger and get the commit list, but to determine which markdown files moved, were added, deleted, or renamed since the last sync, you have to reach into the GitHub API, walk the commit tree, and reconstruct the diff yourself — usually inside a "Code" step in JavaScript or Python.

You've now written a script. The visual workflow tool is no longer doing the work; it's hosting your script.

### 2. The transformation isn't a field map. It's a format conversion.

Markdown isn't a row of fields. Notion expects blocks. Confluence expects storage format (a strict XHTML dialect). ClickUp Docs has its own structure. S3 wants raw markdown or rendered HTML.

Converting markdown to each destination's native format isn't a one-line mapping. It's a parser, an AST walk, and a serializer per destination — including the edge cases: tables, code blocks with language hints, nested lists, callouts, frontmatter, embedded images.

Zapier's "Formatter" and Make's text modules don't do this. You either drop in a Code step and bring your own markdown library, or you accept that your synced pages will look broken.

### 3. The destination logic isn't "create." It's "create-or-update with idempotency."

A spec file synced today must update *the same page* tomorrow. That requires a stable mapping between repo path and destination page ID — and that mapping has to survive renames, re-runs, and the occasional manual edit on the destination side.

In Zapier or Make, you build this yourself: a separate data store (often Airtable or a Make Data Store) that records `{repo_path → page_id}` mappings, plus logic to read it before every action and write to it after. You're now maintaining a database to support an automation.

mdspec handles this internally. The mapping is part of how the tool works, not something you configure on top of it.

### 4. Pricing scales the wrong way.

Zapier and Make price per task or operation. Every file checked, every API call made, every conditional branch evaluated counts.

A repo with 200 markdown specs, syncing to two destinations, on every push to main? Each push could burn 400+ operations on a quiet day, more when refactors touch many files at once. At Zapier's pricing tiers, this gets expensive fast — and every time a developer fixes a typo, the meter runs.

A purpose-built sync tool runs in your CI environment. It's bounded by your CI compute, not by per-task pricing.

### 5. The workflow lives outside your repo.

This is the deepest problem. A Zap or a Make scenario is configured in a web UI on someone else's server. It's not in your repo. It's not in code review. New engineers don't see it. It can't be branch-tested. When the person who built it leaves, the institutional knowledge of *how the docs sync works* leaves with them.

For most marketing automations, this is fine. For an engineering workflow that touches every spec the team relies on, it's a quiet liability.

## What mdspec Is Built To Do

[mdspec](https://mdspec.dev) is a purpose-built tool for one job: sync markdown files from a repo to the places teams read docs. It assumes the world looks like this:

- The trigger is a push to `main`.
- The unit of change is the git diff.
- The source is markdown with optional frontmatter.
- The destinations are Notion, Confluence, ClickUp, and S3 — with format conversion handled correctly per destination.
- The mapping config lives in your repo, alongside the docs.

Setup is two files:

**`.mdspecmap`** in your repo:

```yaml
mappings:
  - folder: docs/specs
    integration: notion
    parent: engineering-docs

  - folder: docs/decisions
    integration: confluence
    parent: adr-space

  - folder: docs/runbooks
    integration: s3
    parent: ops-runbooks-bucket
```

**`.github/workflows/mdspec.yml`**:

```yaml
- name: Publish specs
  run: npx mdspeci publish --project ${{ vars.MDSPEC_PROJECT_ID }}
  env:
    MDSPEC_TOKEN: ${{ secrets.MDSPEC_TOKEN }}
```

That's the whole setup. Every push to `main`, mdspec resolves the diff, converts each changed markdown file into the destination's native format, and updates the right page — creating new ones when needed and updating existing ones in place.

No code steps. No Airtable mapping table. No per-task billing. No browser-based workflow that the next engineer has to discover.

## Side-by-Side: The Same Job, Both Ways

### "Sync a changed spec from `docs/specs/auth.md` to a Notion page"

**Zapier or Make:**

1. Trigger: New commit on `main` branch.
2. Code step: Hit GitHub API, list files changed in the commit.
3. Filter: Keep only `.md` files under `docs/specs/`.
4. Code step: Read the file content from the GitHub raw URL.
5. Code step: Parse markdown to Notion blocks (bring your own library; handle edge cases).
6. Lookup step: Check Airtable for an existing `auth.md → page_id` mapping.
7. Branch: If mapping exists, update the Notion page. Otherwise, create a new one and write the new mapping back to Airtable.
8. Error handling: Hope nothing rate limits.

**mdspec:**

1. Push to `main`.

That's the comparison. Both will work. One of them is what you actually want to maintain.

## When Zapier or Make Are Still The Right Call

To be fair: Zapier and Make are still the right answer for plenty of automation work, including some that touches docs:

- Posting a Slack message when a new doc is published.
- Notifying a PM via email when a spec is updated.
- Adding a row to an analytics sheet for every doc sync event.
- Cross-tool automations spanning sales, support, and engineering.

These are event-shaped, simple-transformation, multi-tool workflows. Use the right tool. The point isn't that iPaaS is bad — it's that iPaaS is the wrong shape for *this specific problem*.

## The General-Purpose Tax

There's a broader principle here that's easy to miss.

A tool that "fits anything" rarely fits any *specific* thing well. Generality has a cost: more configuration, more glue code, more abstractions to learn, more edge cases to handle, more pricing per operation, more brittleness when the use case drifts even slightly outside the happy path.

For high-frequency, well-understood workflows — like syncing markdown specs to docs platforms — a purpose-built tool wins because it can encode the specific assumptions of the problem into its design. No mapping table. No format-conversion code step. No diff parsing. No per-task meter. The tool *is* the workflow.

Zapier and Make exist to handle the long tail of automation. mdspec exists to handle one job correctly: keeping engineering specs in sync between the repo and the rest of the team.

Use the right tool for each.
