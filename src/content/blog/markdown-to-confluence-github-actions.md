---
title: "Publish Markdown to Confluence with GitHub Actions in One Line: A 2026 Setup Guide"
description: "A plain comparison of every real option for syncing markdown from GitHub to Confluence — mark, markdown-confluence, duo-labs, and mdspec — with a complete working setup you can copy today."
pubDate: 2026-05-06
author: "mdspec team"
tags: ["Confluence", "GitHub Actions", "Markdown", "CI/CD", "Documentation"]
readingTime: "11 min read"
---

If you've landed here, you already know what you want: markdown files in your GitHub repo, Confluence pages that stay current, and a CI step that bridges the two automatically. You don't need to be convinced this is a good idea. You need to know which tool to use and how to wire it up.

This post covers every real option that exists in 2026, shows you exactly where each one breaks down, and walks through a complete working setup. If you want to skip straight to the setup, jump to [The Recommended Setup](#the-recommended-setup).

---

## The Four Real Options

There are four approaches that actually work for publishing markdown from a GitHub repo to Confluence. Everything else — Zapier, Make, native GitHub integrations, generic webhook setups — either can't transfer file contents or requires so much custom scripting that you're essentially building the tool yourself.

### 1. kovetskiy/mark

[mark](https://github.com/kovetskiy/mark) is the oldest and most battle-tested option. It's a Go CLI that reads markdown files and publishes them to Confluence via the REST API, converting markdown to Confluence's ADF (Atlassian Document Format).

**How it works:** You add a frontmatter header to each markdown file specifying the target Confluence space and page title. mark reads the file, authenticates to Confluence using a personal access token, and creates or updates the page.

**What the frontmatter looks like:**
```markdown
<!-- Space: ENG -->
<!-- Title: Auth Service Spec -->
<!-- Parent: Backend Services -->

# Auth Service

Your content here.
```

**What it's good for:** Single-file publishing, teams comfortable with Go tooling, setups where you control every file's frontmatter.

**Where it breaks down:**
- Every file needs its own frontmatter block. In a repo with 40 specs, that's 40 files each containing Confluence-specific markup — which means your markdown is no longer clean markdown.
- Multi-space publishing requires running mark multiple times with different auth contexts.
- Image handling requires hosting images separately or using Confluence's attachment API, which mark handles imperfectly.
- No support for publishing the same file to a second destination (Notion, S3) — it's Confluence-only.

### 2. markdown-confluence (Atlassian's community action)

[markdown-confluence](https://github.com/markdown-confluence/markdown-confluence) is an actively maintained GitHub Action originally developed by Kevin Elphick at Atlassian. It's more configuration-driven than mark and has better support for folder-level publishing.

**How it works:** You configure a `package.json` or a separate config file pointing at a folder of markdown files, with a root Confluence page to publish under. The action recursively publishes the folder structure as a Confluence page hierarchy.

**What a basic setup looks like:**
```yaml
- uses: markdown-confluence/publish@v1
  with:
    confluenceBaseUrl: ${{ secrets.CONFLUENCE_BASE_URL }}
    confluenceParentId: "123456"
    atlassianUserName: ${{ secrets.ATLASSIAN_USERNAME }}
    atlassianApiToken: ${{ secrets.ATLASSIAN_API_TOKEN }}
    folderToPublish: "docs"
```

**What it's good for:** Teams that want to publish an entire docs folder as a Confluence page tree. Lower per-file configuration overhead than mark.

**Where it breaks down:**
- Requires a `confluenceParentId` — a numeric page ID you have to look up in Confluence's URL. You're hard-coding a Confluence internal ID into your CI config, which breaks if the page ever moves.
- The folder structure becomes the Confluence page structure, which isn't always what you want. If your repo's `/docs/` folder has a structure that doesn't match your Confluence space, you're in trouble.
- Still Confluence-only. Same markdown going to Notion is a separate problem.
- No support for selective publishing — it's all or nothing for the configured folder.

### 3. duo-labs/markdown-to-confluence

[duo-labs/markdown-to-confluence](https://github.com/duo-labs/markdown-to-confluence) is a Python-based tool from the Duo Security team. It's older (last major update was 2021) but still functional and has a cleaner config model than mark for certain setups.

**How it works:** Similar to mark, but Python-based. Reads markdown files, uses frontmatter to determine the target page, and publishes via Confluence's REST API. Has slightly better image handling than mark.

**What it's good for:** Teams that prefer Python tooling, existing Confluence setups where per-file frontmatter is already established.

**Where it breaks down:**
- Maintenance has slowed significantly. It works against current Confluence Cloud but has open issues against newer API behaviors.
- Same per-file frontmatter requirement as mark.
- No folder-level configuration.
- Python dependency chain can be awkward in CI environments configured for Node or Go.

### 4. mdspec (.mdspecmap approach)

mdspec is the newest approach. Instead of per-file frontmatter or a single folder-level config, it uses a `.mdspecmap` file placed inside the folder you want to sync. Destination credentials are managed once in the mdspec dashboard — your CI workflow only needs one token.

**How it works:** You place a `.mdspecmap` in your specs folder declaring which integrations to publish to and which parent page alias to use. On merge, `npx mdspeci publish` detects changed files and syncs them. To route different subfolders to different destinations, place a separate `.mdspecmap` in each subfolder.

**What the config looks like** (`specs/.mdspecmap`):
```yaml
version: 1
mappings:
  - integration: confluence
    parent: alias:backend-services
```

The `alias:backend-services` is a parent page alias you configure once in the mdspec dashboard — it resolves to the Confluence space and parent page where specs should appear.

**What it's good for:** Teams that want a clean config-file approach, multi-destination publishing, and no Confluence-specific markup in their markdown files.

**Where it's different:** It's the only option that publishes to multiple destinations in a single step — Confluence and Notion in the same CI run, from the same source file.

---

## Side-by-Side Comparison

| | mark | markdown-confluence | duo-labs | mdspec |
|---|---|---|---|---|
| **Config style** | Per-file frontmatter | Folder config + page ID | Per-file frontmatter | Central `.mdspecmap` |
| **Setup time** | 30–60 min | 20–40 min | 30–60 min | 10–15 min |
| **Markdown stays clean** | No | Mostly | No | Yes |
| **Folder-level publishing** | No | Yes | No | Yes |
| **Selective file publishing** | Yes | No | Yes | Yes |
| **Image handling** | Manual | Good | Good | Good |
| **ADF conversion** | Yes | Yes | Yes | Yes |
| **Multi-space support** | Manual | Manual | Manual | Config |
| **GitHub token required** | No | No | No | No |
| **Publish to Notion simultaneously** | No | No | No | Yes |
| **Publish to S3 simultaneously** | No | No | No | Yes |
| **Last meaningful update** | Active | Active | 2021 | Active |

The core tradeoff is between per-file control (mark, duo-labs) and config-level control (markdown-confluence, mdspec). If you have a small number of files and want precise per-file Confluence placement, mark is mature and well-understood. If you want a single config that covers your whole spec folder and can fan out to multiple destinations, mdspec is the cleaner choice.

---

## The Recommended Setup {#the-recommended-setup}

Here's a complete working setup using mdspec. Prerequisites:

- A Confluence Cloud instance
- An Atlassian API token (create one at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens))
- A GitHub repo with markdown files you want to publish
- GitHub Actions enabled
- A free mdspec account at [mdspec.dev](https://mdspec.dev)

### Step 1: Connect Confluence in the Dashboard

mdspec stores your Confluence credentials centrally — you configure them once in the dashboard and reference them by alias in your `.mdspecmap`.

In the mdspec Dashboard: go to **Integrations → Confluence → Connect** and enter:
- Your Confluence base URL (e.g. `https://yourcompany.atlassian.net`)
- Your Atlassian account email
- Your API token
- Your space key (the short code in the space URL, e.g. `ENG`)

Then create a **parent page alias**: name it something like `backend-services` and point it to the parent page where your specs should appear. This alias is what your `.mdspecmap` will reference.

### Step 2: Create your `.mdspecmap`

Place a `.mdspecmap` file in the folder you want to sync. The file's location determines its scope.

`specs/.mdspecmap`:

```yaml
version: 1
mappings:
  - integration: confluence
    parent: alias:backend-services
```

A few things worth noting:
- `alias:backend-services` resolves to the parent page you configured in the dashboard — no inline space keys or page titles in the config
- Everything in `specs/` and all its subfolders will be published
- To route a subfolder to a different Confluence space, place a separate `.mdspecmap` inside that subfolder

### Step 3: Add your token to GitHub

In the mdspec Dashboard: **Project → Settings → Tokens** → generate a project token.

In your repo: **Settings → Secrets and variables → Actions**

| Name | Type | Value |
|---|---|---|
| `MDSPEC_TOKEN` | Secret | your project token |
| `MDSPEC_PROJECT_ID` | Variable | your project ID (from Dashboard → Project → Settings → Overview) |

### Step 4: Add the GitHub Actions workflow

Create `.github/workflows/publish-specs.yml`:

```yaml
name: Publish Specs

on:
  push:
    branches:
      - main
    paths:
      - 'specs/**'
      - 'docs/**'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - run: npx mdspeci publish --project ${{ vars.MDSPEC_PROJECT_ID }}
        env:
          MDSPEC_TOKEN: ${{ secrets.MDSPEC_TOKEN }}
          GITHUB_EVENT_BEFORE: ${{ github.event.before }}
```

The `paths` filter means the action only runs when spec files or the map itself changes — not on every push to main regardless of what changed.

### Step 5: Run it once manually

Before relying on the push trigger, run the workflow manually to verify everything is connected:

1. Go to Actions → Publish Specs → Run workflow
2. Watch the run logs. A successful first run will either create the Confluence page (if it doesn't exist) or update it (if it does)
3. Check Confluence to confirm the page content matches your markdown file

If the run fails, the most common issues are:
- Alias not found — the alias in `.mdspecmap` doesn't exist in your dashboard yet
- API token doesn't have write permissions to the target space
- Wrong space key entered when connecting Confluence in the dashboard

### Step 6: Expand the map

Once the first file is publishing correctly, add more folders by placing additional `.mdspecmap` files.

`specs/.mdspecmap` — all files in `specs/` → Backend Services:

```yaml
version: 1
mappings:
  - integration: confluence
    parent: alias:backend-services
```

`docs/decisions/.mdspecmap` — ADRs → Architecture Decisions:

```yaml
version: 1
mappings:
  - integration: confluence
    parent: alias:architecture-decisions
```

When you specify a folder via a `.mdspecmap` inside it, mdspec publishes all markdown files in that folder, using each file's H1 as the page title.

---

## Adding a Second Destination

The `.mdspecmap` approach makes adding Notion or S3 straightforward: add another mapping to the same config file.

Connect each integration in the mdspec Dashboard first, then update `specs/.mdspecmap`:

```yaml
version: 1
mappings:
  - integration: confluence
    parent: alias:backend-services
  - integration: notion
    parent: alias:product-specs
  - integration: s3
    parent: alias:docs-bucket
```

One CI run now keeps all three destinations synchronized. The markdown file in your repo is the single source of truth. [Spec drift](/blog/spec-drift) between destinations becomes structurally impossible — every destination is updated in the same CI run.

For Notion-specific details and workarounds for its limitations, see [Notion's GitHub Integration Is Read-Only](/blog/notion-github-integration-limitations).

---

## Handling Existing Confluence Pages

If you already have Confluence pages that were manually maintained, you need to decide how to handle the transition before you wire up CI.

**Option A: Let mdspec overwrite.** If the git version of your spec is more current than the Confluence page, just run the CI step and let it overwrite. The Confluence page history is preserved, so you can always roll back to the previous version.

**Option B: Reconcile first.** If the Confluence page has updates that were never back-propagated to git, pull those into the markdown file first, then run CI. The git version needs to be the canonical one before you start treating CI as the synchronization mechanism.

**Option C: Publish to a new page.** If you want to leave the existing Confluence page untouched while you validate the pipeline, configure a different alias pointing at a staging parent page for the initial runs. Once you're confident the output looks right, update the alias to the real location.

Whichever option you choose, the important step afterward is making clear to your team that the git file is now the source of truth — not the Confluence page. If someone edits the Confluence page directly, the next CI run will overwrite their changes. That's the intended behavior (it enforces the single source of truth), but it needs to be communicated explicitly.

---

## Tips for Cleaner Confluence Output

A few things that produce better Confluence pages from markdown:

**Use a single H1 as the page title.** mdspec uses the file's H1 as the page title by default. If your markdown file doesn't have an H1, the filename is used, which is usually uglier.

**Keep images in the repo.** Reference images with relative paths in your markdown. mdspec uploads them as Confluence attachments automatically. Externally-hosted images (S3 URLs, CDN links) also work but don't get versioned with the page.

**Use standard markdown only.** Confluence's ADF format supports most standard markdown features well: headings, bold, italic, code blocks, tables, ordered and unordered lists, blockquotes. Avoid GitHub-flavored-markdown-specific features like task lists (`- [ ]`) if you want consistent Confluence rendering.

**Add a "source" notice.** Some teams add a comment at the top of their markdown files noting that the Confluence page is auto-generated:

```markdown
> This page is automatically published from [specs/auth-service.md](../specs/auth-service.md). Edit the source file, not this page.
```

This prevents teammates from editing the Confluence page directly and having their changes silently overwritten on the next CI run.

---

## Why This Beats the Manual Approach

The math is straightforward. If you have 20 specs and they each get updated an average of twice per month, that's 40 manual Confluence updates per month across your team. Each one takes 5–10 minutes when you factor in navigation, copying, formatting cleanup, and the mental overhead of context-switching to Confluence. That's 3–7 hours per month of work that produces no new information — it's pure synchronization overhead.

The CI approach is 10–15 minutes of setup, once, amortized over every publish from that point forward. After the first week, it pays for itself.

The non-quantifiable cost is more important: every manual update that doesn't happen creates [spec drift](/blog/spec-drift). On-call engineers read stale runbooks. Security audits reference outdated policies. Product managers plan against behavior that changed last sprint. The cost of a single misdirected on-call investigation or a failed security audit finding dwarfs the cost of setting up CI publishing.

---

*mdspec handles the `.mdspecmap` config and the multi-destination publishing described in this guide. [Get started at mdspec.dev](https://mdspec.dev).*
