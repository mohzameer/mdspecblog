---
title: "Notion's GitHub Integration Is Read-Only: 5 Workarounds for Actually Publishing Markdown from Your Repo"
description: "Notion's native GitHub integration can't push markdown content into Notion pages. Here are five real workarounds, ranked by how far they'll get you — with no hype about what each one actually can't do."
pubDate: 2026-05-09
author: "mdspec team"
tags: ["Notion", "GitHub", "Markdown", "Integration", "Documentation"]
readingTime: "9 min read"
---

If you've tried to publish markdown from a GitHub repo into a Notion page, you've probably hit the wall. Let's save you the troubleshooting time: Notion's native GitHub integration cannot do this. Not partially, not with workarounds on the Notion side — it literally cannot transfer file contents from a repository into a Notion page.

This post explains exactly what the native integration can and can't do, then walks through five real approaches that actually work, ranked from simplest to most capable.

---

## What Notion's GitHub Integration Actually Does

Notion released a native GitHub integration that syncs GitHub data into Notion databases. Here's what it covers:

- Pull requests → Notion database entries
- Issues → Notion database entries
- Commits → Notion database entries (in some configurations)

That's it. It's a one-way sync of GitHub objects (PRs, issues) into Notion database rows. It is:

- **Read-only** — it pulls from GitHub into Notion, not the reverse
- **Scoped to objects** — PRs and issues, not file contents
- **Database-only** — it creates database entries, not Notion pages with content
- **Limited on free plans** — only GitHub, Jira, and Asana integrations; one synced database on the free tier

What it cannot do: read a markdown file from your repository and create or update a Notion page with its content. This is a hard architectural limitation, not a missing feature that might arrive in the next update.

Zapier and Make have the same wall. Zapier's community team has explicitly confirmed that file contents cannot be transferred between GitHub and Notion — users are redirected to perpetually-open feature requests. Make's GitHub and Notion integrations both operate on objects and metadata, not file contents. The workaround threads are years old and still unresolved.

So if the built-in path doesn't work, what does?

---

## The 5 Real Workarounds

### Workaround 1: Zapier / Make (for metadata, not content)

**What it does:** Triggers a Notion action when a GitHub event fires. Can create a Notion database entry with metadata from the GitHub event (PR title, author, URL, timestamp).

**What it can't do:** Read the content of a file in your repository and write it to a Notion page. File content transfer is explicitly unsupported.

**When to use it:** You want a Notion database that logs when specs are updated (a changelog database, essentially) without needing the actual spec content in Notion. If a PM just needs to know "auth-service.md was updated on Tuesday by @engineer," Zapier can do that.

**When not to use it:** You want the actual spec content readable in Notion. Zapier can't get you there.

**Setup complexity:** Low. Standard Zapier/Make connector setup.

**Verdict:** Useful as a notification layer, not a publishing solution.

---

### Workaround 2: tryfabric/martian + a custom GitHub Action

**What it does:** [tryfabric/martian](https://github.com/tryfabric/martian) is a Node.js library that converts markdown to Notion's block format. You can write a GitHub Actions workflow that reads a markdown file, converts it with martian, and writes it to a Notion page via the API.

**What it looks like:**

```javascript
const { markdownToBlocks } = require('@tryfabric/martian');
const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const markdown = fs.readFileSync('specs/auth-service.md', 'utf8');
const blocks = markdownToBlocks(markdown);

await notion.blocks.children.append({
  block_id: process.env.NOTION_PAGE_ID,
  children: blocks,
});
```

**When to use it:** You need to publish one or two specific files to specific Notion pages and you're comfortable writing and maintaining a small Node script. You have a developer who can own the script when Notion's API changes.

**When not to use it:** You have more than a handful of files, you don't want to maintain custom code in CI, or the target Notion pages change over time (requiring script updates to match).

**Setup complexity:** Medium. Requires writing a custom script, storing page IDs as environment variables, and maintaining the dependency as martian and the Notion API evolve.

**Verdict:** Works well for a single file, becomes unwieldy at scale.

---

### Workaround 3: sourcegraph/notionreposync

**What it does:** [notionreposync](https://github.com/sourcegraph/notionreposync) is an open-source tool from Sourcegraph that syncs an entire GitHub repository's markdown files to a Notion workspace. It creates a Notion page hierarchy that mirrors the repo's folder structure.

**When to use it:** You want to mirror an entire documentation repository into Notion — for example, making a whole `/docs/` folder browsable in a Notion workspace. The audience reads in Notion but the content is maintained in git.

**When not to use it:** You need selective publishing (some files to Notion, others not), you want to publish to a specific existing Notion database structure rather than a mirrored folder hierarchy, or you need to publish the same file to multiple destinations.

**Setup complexity:** Medium-high. Requires configuring Notion database IDs, OAuth credentials, and a separate sync service or scheduled CI job. The repo hasn't had major updates recently and may require some adaptation for current Notion API versions.

**Verdict:** Best option if you want whole-repo mirroring and are willing to accept the folder-mirrors-to-Notion-hierarchy model.

---

### Workaround 4: Notion API directly with a custom script

**What it does:** Notion's API is well-documented. You can write any language's HTTP client to POST blocks to a Notion page. No third-party library required.

```python
import requests
import json

headers = {
    "Authorization": f"Bearer {notion_token}",
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28"
}

# Convert markdown to Notion blocks (requires custom parsing or a library)
blocks = convert_markdown_to_notion_blocks(markdown_content)

requests.patch(
    f"https://api.notion.com/v1/blocks/{page_id}/children",
    headers=headers,
    json={"children": blocks}
)
```

**When to use it:** You have very specific requirements that no existing tool meets, you want full control over the conversion and output, and you have engineering time to build and maintain a custom integration.

**When not to use it:** You want something working in an afternoon. The markdown-to-Notion-blocks conversion is non-trivial — Notion uses a proprietary block format that doesn't map 1:1 with markdown, especially for tables, code blocks, and nested lists.

**Setup complexity:** High. You're building the tool.

**Verdict:** Maximum flexibility, maximum maintenance burden.

---

### Workaround 5: A config-file approach (.mdspecmap)

**What it does:** Declares your markdown sources and Notion destinations in a single config file at the root of your repo. A GitHub Actions step reads the config and handles the conversion and API calls, including the markdown-to-Notion-blocks conversion that makes Workaround 4 hard.

```yaml
version: 1

sources:
  - path: specs/auth-service.md
    destinations:
      - type: notion
        databaseId: "your-database-id"
        pageTitle: "Auth Service Spec"

  - path: specs/rate-limiting.md
    destinations:
      - type: notion
        databaseId: "your-database-id"
        pageTitle: "Rate Limiting Policy"

  - path: docs/decisions/
    destinations:
      - type: notion
        databaseId: "adr-database-id"
        pageTitle: auto
```

The GitHub Actions step:

```yaml
- uses: mdspec/publish@v1
  with:
    map: .mdspecmap
  env:
    NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
```

**When to use it:** You've outgrown Workaround 2 (too many files for a custom script), don't want the whole-repo mirror model of Workaround 3, and want to add Confluence or ClickUp alongside Notion without managing three separate integrations.

**When not to use it:** You genuinely only need one file published to one Notion page and Workaround 2 is already working. Don't over-engineer a solved problem.

**Setup complexity:** Low. One config file, one secrets setup, one Actions step.

**Verdict:** The right choice when you have multiple files, multiple destinations, or want to stop maintaining custom scripts.

---

## Side-by-Side Comparison

| | Zapier/Make | martian script | notionreposync | Custom API | mdspec |
|---|---|---|---|---|---|
| **Publishes file content** | No | Yes | Yes | Yes | Yes |
| **Setup time** | 20 min | 2–4 hrs | 2–3 hrs | 4–8 hrs | 15 min |
| **Per-file config required** | N/A | Yes | No | Yes | No |
| **Selective publishing** | N/A | Yes | No | Yes | Yes |
| **Folder publishing** | No | No | Yes | Manual | Yes |
| **Multi-destination** | No | No | No | Manual | Yes |
| **Maintenance burden** | Low | Medium | Medium | High | Low |
| **Notion API changes affect you** | No | Yes | Yes | Yes | No |

---

## Which One to Pick

**If you need a changelog or notification system** (not actual content in Notion): Zapier or Make.

**If you have one or two files and a developer who'll maintain it**: the martian script (Workaround 2). It's fast to set up and sufficient for small scope.

**If you want to mirror an entire docs folder** into Notion and the hierarchy model works for you: notionreposync (Workaround 3).

**If you have specific requirements nothing else meets**: build against the Notion API directly (Workaround 4). Budget real engineering time.

**If you outgrew the script, have multiple files, or need Confluence or ClickUp alongside Notion**: the `.mdspecmap` config approach (Workaround 5). It's the option that doesn't require you to make a new decision when your requirements grow.

---

## Why the Native Integration Gap Exists

It's worth understanding why this gap exists, because it affects whether it's likely to close.

Notion's native GitHub integration was designed for project management workflows, not documentation publishing. The use case it solves is: a PM wants to see GitHub PRs and issues alongside Notion tasks, in a database view. That's read-only metadata sync — it fits perfectly.

Publishing markdown content from git into Notion pages is a different problem. It requires:
- Authenticating to the GitHub content API (not the events API)
- Reading file contents at specific paths
- Converting markdown to Notion's block format
- Creating or updating specific Notion pages (not database rows)

None of that is what Notion's current integration was built to do, and it's not adjacent enough to the current implementation that it's likely to be added as a minor feature. It would be a new product surface.

That's why the native integration gap has persisted despite years of user requests. It's not an oversight — it's a scope decision. The gap is real and structural, which is why the workarounds above exist and are necessary.

---

## What This Means for Spec Drift

The native integration gap has a direct consequence for [spec drift](/blog/spec-drift): any team using Notion as the place where product managers, on-call engineers, or other non-engineers read technical specs has to either maintain those Notion pages manually or build one of the workarounds above.

Manual maintenance drifts. It's not a question of if — it's when. Every spec update in git that doesn't automatically trigger a Notion update is a drift event waiting to happen.

If you're setting up a new documentation workflow that includes Notion, build the automatic publishing layer from the start. The workarounds above are not complicated (especially Workaround 2 or 5). The cost of setting them up once is far lower than the ongoing cost of [spec drift](/blog/spec-drift) in a documentation system that relies on manual synchronization.

---

*mdspec implements the config-file approach (Workaround 5) described in this post — handles Notion alongside Confluence, ClickUp, and S3 from a single `.mdspecmap`. [Learn more at mdspec.io](https://mdspec.io).*
