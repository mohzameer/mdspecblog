---
title: "Managing Markdown Bloat in AI-Era Repos"
description: "AI workflows generate markdown fast. ADRs, specs, meeting notes, agent outputs — it piles up. Here's how to sync it out, keep it searchable, and stop the sprawl."
pubDate: 2026-04-10
author: "mdspec team"
tags: ["Markdown", "CI/CD", "Documentation", "Developer Workflow"]
readingTime: "6 min read"
---

There's a dirty secret in AI-accelerated engineering teams: the repos are getting messy.

Not with code. With markdown.

You've got ADRs in `docs/decisions/`. Specs in `docs/specs/`. Agent-generated summaries in `tmp/`. Meeting notes someone committed to `notes/`. AI chat exports in `context/`. And a README that now references half of these and none of the links work.

This is **markdown sprawl**, and it's one of the defining documentation problems of the current moment.

## Why It's Happening Faster Than Ever

A few years ago, documentation was underproduced. Developers hated writing it, so there wasn't much to manage.

AI changed the incentives. Writing a spec or an ADR is now fast — you describe what you built to a model and it drafts the document. Running an AI analysis on a PR and exporting the discussion to a markdown file takes 30 seconds. Generating a task summary from a conversation is trivial.

The friction of *writing* markdown collapsed. The friction of *managing* it didn't.

You now have:

- Specs that duplicate or contradict each other across versions
- AI-generated docs that were useful once and are now stale noise
- Docs that belong in a project management tool, not a git repo
- Large reference files that slow down repo operations
- Markdown nobody can search because it's buried in nested directories

## The Two-Problem Framework

Markdown bloat is actually two separate problems that require different solutions:

### Problem 1: Content that belongs in the repo but also needs to be elsewhere

This is your living specs — the authoritative documentation co-located with the code it describes. It *should* be in the repo. But your PM needs to read it in Confluence. Your designer checks Notion. Your support team uses ClickUp docs.

**Solution:** Sync, don't duplicate. Keep the repo as the source of truth and push changes to external tools automatically on every merge.

### Problem 2: Content that doesn't belong in the repo at all

This is ephemeral output — AI analysis exports, meeting notes, one-time agent summaries. It ended up in the repo because that was the path of least resistance, but it creates noise and doesn't version cleanly.

**Solution:** Route it to a proper destination at creation time. S3 for archival, Notion for team reference, ClickUp for task context.

## A Practical Cleanup Approach

Here's a process that works for teams that have accumulated significant markdown sprawl:

### Audit and Categorize

Run through your doc directories and bucket every file into one of four categories:

| Category | Description | Action |
|---|---|---|
| **Living spec** | Describes current system behavior | Keep in repo, set up sync |
| **Historical reference** | Past decision or analysis, still occasionally useful | Archive to S3, remove from repo |
| **Active team resource** | Needed by non-engineers regularly | Sync to Notion/Confluence, keep thin version in repo |
| **Dead weight** | Stale, superseded, or never used | Delete |

Most teams find that 30–40% of their markdown falls into the last category. Delete it without guilt.

### Set Up Sync for Living Docs

For everything in the "living spec" category, set up automated sync to wherever your team actually reads docs. This is the critical step — it removes the incentive to copy files manually, which is what creates drift in the first place.

A `.mdspecmap` file scopes which folders get synced where:

```yaml
mappings:
  - folder: docs/specs
    integration: confluence
    parent: engineering-specs
    exclude:
      - "*.draft.md"
      - "tmp/**"

  - folder: docs/decisions
    integration: notion
    parent: architecture-decisions
```

Now every push to `main` syncs changed specs automatically. The repo stays canonical. Confluence and Notion stay current.

### Archive Historical Files

For files that are historically valuable but don't need to live in the repo, sync them to S3 with a well-organized key structure and remove them from the repo.

```yaml
  - folder: docs/archive
    integration: s3
    bucket: acme-engineering-docs
    prefix: archive/2025
```

Once synced and verified, commit the deletion. The repo gets lighter. The content is still findable — searchable in S3, indexed in your doc tools.

### Establish a "new doc" protocol

The only sustainable solution to sprawl is preventing its accumulation. Set a team norm: every new markdown file created in the repo gets categorized immediately and either:

- Placed in a synced folder (living spec)
- Routed directly to its permanent home (not the repo)
- Explicitly marked as temporary with a deletion date in frontmatter

```yaml
---
title: "Post-incident analysis: API gateway timeout"
mdspec_skip: true  # won't be synced
expires: 2026-03-01
---
```

## The S3 Archival Pattern

For teams that generate a lot of AI analysis, the S3 pattern is particularly useful. You get:

- Durable, versioned storage for every document
- Searchable via S3 Select or Athena
- Accessible without cloning the repo
- No git history bloat from large generated files

The workflow: AI generates analysis → file saved to a staging folder → CI step syncs to S3 → file deleted from repo in the same commit.

## Enter mdspec

[mdspec](https://mdspec.dev) is built specifically for the "sync, don't duplicate" workflow. You define which folders map to which integrations in a `.mdspecmap` file, add one step to your GitHub Actions workflow, and your specs stay current across Notion, Confluence, ClickUp, and S3 without any manual copying.

The key properties that make it work for managing bloat:

- **Change detection via git diff** — only modified files are synced, so large doc folders don't cause slow CI runs
- **`mdspec_skip` frontmatter flag** — lets you explicitly exclude files from sync (perfect for in-progress drafts or ephemeral docs you don't want published)
- **Glob-based exclusions** in `.mdspecmap` — exclude entire patterns like `tmp/**` or `*.draft.md`
- **S3 integration** — archives docs outside the repo with a clean key structure

The goal isn't to manage less documentation. The goal is to be intentional about where each document lives and to make the canonical version always the one in the repo.

Less sprawl. More signal.
