---
title: "mdspec in 5 Minutes: From Zero to Publishing Markdown on Every Merge"
description: "A screencast-style walkthrough: create a repo, add one .mdspecmap, add the GitHub Actions step, push a commit, see it appear in Confluence or Notion. Real YAML throughout."
pubDate: 2026-05-04
author: "mdspec team"
tags: ["mdspec", "GitHub Actions", "Quickstart", "Markdown", "Confluence", "Notion"]
readingTime: "6 min read"
---

This is a hands-on walkthrough. By the end you'll have a working pipeline: a markdown file in your repo, a `.mdspecmap` config, a GitHub Actions step, and an automatically published page in Confluence (or Notion — your choice). Total time: under 5 minutes if you have your API tokens ready.

No background reading required. If you want the theory first, start with [Spec-as-Code](/blog/spec-as-code). Otherwise, let's go.

---

## What You Need Before Starting

- A GitHub repo (any visibility)
- A Confluence Cloud instance **or** a Notion workspace
- An API token for whichever you're using (links in Step 2)
- A free mdspec account at [mdspec.dev](https://mdspec.dev)
- GitHub Actions enabled on the repo

---

## Step 1: Add a Spec File

If you don't already have a markdown spec in your repo, create one. The simplest possible example:

```bash
mkdir -p specs
```

Create `specs/auth-service.md`:

```markdown
# Auth Service

## Overview

Handles authentication and session management for all user-facing services.

## Session Expiry

Sessions expire after 7 days of inactivity. The token is renewed on each authenticated request.

## Rate Limits

Login endpoint: 10 requests per minute per IP.
Token refresh endpoint: 60 requests per minute per user.
```

That's it. Plain markdown. No special syntax, no proprietary format.

---

## Step 2: Connect Your Integration in the Dashboard

mdspec stores your destination credentials (Confluence tokens, Notion tokens, etc.) centrally in the dashboard. Your GitHub Actions workflow only ever needs one secret: your mdspec project token.

**For Confluence:**

1. Go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens) and create an API token
2. In the mdspec Dashboard: go to **Integrations → Confluence → Connect**
3. Enter your Confluence base URL (e.g. `https://yourcompany.atlassian.net`), your Atlassian email, your API token, and the key of your target space
4. Create a **parent page alias** — name it something like `engineering-specs` and point it to the Confluence parent page where your specs should appear

**For Notion:**

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations), click "New integration", name it `mdspec`, set it to "Internal integration", copy the token
2. Open the Notion database or page you want to publish to, click "..." → "Connect to" → select your integration
3. In the mdspec Dashboard: go to **Integrations → Notion → Connect** and enter your integration token
4. Create a **parent page alias** — name it something like `product-specs` and point it to your Notion database or page

---

## Step 3: Add Your Token to GitHub

In the mdspec Dashboard, go to **Project → Settings → Tokens** and generate a project token.

In your repo: **Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
|---|---|
| `MDSPEC_TOKEN` | your project token from the dashboard |

Also add your project ID as a repository variable (not a secret). Find it at **Dashboard → Project → Settings → Overview**:

**Settings → Secrets and variables → Actions → Variables → New repository variable**

| Variable name | Value |
|---|---|
| `MDSPEC_PROJECT_ID` | your project ID |

---

## Step 4: Create the `.mdspecmap`

Place a `.mdspecmap` file in the folder you want to sync. The file's location determines its scope — everything in that folder (and its subfolders) will be published according to its mappings.

Create `specs/.mdspecmap`:

**Confluence config:**

```yaml
version: 1
mappings:
  - integration: confluence
    parent: alias:engineering-specs
```

`alias:engineering-specs` refers to the parent page alias you created in Step 2. mdspec resolves the alias at publish time and routes each spec to the correct Confluence page.

**Notion config:**

```yaml
version: 1
mappings:
  - integration: notion
    parent: alias:product-specs
```

**Both at once:**

```yaml
version: 1
mappings:
  - integration: confluence
    parent: alias:engineering-specs
  - integration: notion
    parent: alias:product-specs
```

---

## Step 5: Add the GitHub Actions Workflow

Create `.github/workflows/publish-specs.yml`:

```yaml
name: Publish Specs

on:
  push:
    branches:
      - main
    paths:
      - 'specs/**'
  workflow_dispatch:

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

> **Note:** The CLI is invoked as `npx mdspeci` — with a trailing `i`. The npm package name is `mdspeci`.

The `workflow_dispatch` trigger lets you run it manually from the Actions UI — useful for the first run.

---

## Step 6: Push and Verify

Commit everything and push to main:

```bash
git add specs/auth-service.md specs/.mdspecmap .github/workflows/publish-specs.yml
git commit -m "add spec publishing pipeline"
git push origin main
```

Go to your repo's Actions tab. You should see "Publish Specs" running. Click into the run to watch the logs.

A successful run looks like:

```
Reading specs/.mdspecmap...
Publishing specs/auth-service.md → confluence (alias:engineering-specs)
  ✓ Page created: https://yourcompany.atlassian.net/wiki/spaces/ENG/pages/123456
Done. 1 file published to 1 destination.
```

Open Confluence (or Notion). The page is there.

---

## Step 7: Make a Change and Watch It Update

Edit `specs/auth-service.md` — change a rate limit, update a description, add a section. Commit and push.

Within a minute, the Confluence (or Notion) page reflects the change. Automatically. Without you touching Confluence.

That's spec-as-code working. The markdown in your repo is the source of truth. CI is the synchronization mechanism. The destination pages are always current.

---

## Adding More Files

To publish multiple folders to different destinations, place a `.mdspecmap` in each folder. Each file applies to the folder it lives in and all subfolders.

`specs/.mdspecmap` — routes everything in `specs/` to Backend Services:

```yaml
version: 1
mappings:
  - integration: confluence
    parent: alias:backend-services
```

`docs/decisions/.mdspecmap` — routes ADRs to a separate Confluence space:

```yaml
version: 1
mappings:
  - integration: confluence
    parent: alias:architecture-decisions
```

When you push a change to any `.md` file, mdspec publishes it to the destination declared in the nearest `.mdspecmap` ancestor. New files in a mapped folder are picked up automatically — no config change needed.

---

## Common First-Run Issues

**"Alias not found"** — The alias you referenced in `.mdspecmap` doesn't exist yet in your dashboard. Go to Dashboard → Integrations → [your integration] and create the alias pointing to your target page.

**"403 Forbidden"** — Your API token doesn't have write access to the target space. Check space permissions in Confluence and ensure your account has "Add Pages" permission.

**Notion "database not found"** — Make sure you connected your integration to the database (the "Connect to" step in Step 2). Each database needs to be explicitly connected.

---

## What's Next

Once your first pipeline is working, the natural next steps:

- **Add S3 as a destination** to make specs machine-readable for AI agents. Connect your S3 bucket in the dashboard, create a key-prefix alias, and add `- integration: s3` / `parent: alias:docs-bucket` to your `.mdspecmap`. See [Spec-as-Code](/blog/spec-as-code) for the full pattern.
- **Map your ADRs** in `docs/decisions/` to a Confluence space. See the ADR publishing setup in the [Confluence guide](/blog/markdown-to-confluence-github-actions).
- **Add ClickUp** if your ops or product team lives there. Connect ClickUp in the dashboard and add `- integration: clickup` / `parent: alias:ops-runbooks` to your `.mdspecmap`.

---

*mdspec is available at [mdspec.dev](https://mdspec.dev). The `.mdspecmap` config format and the multi-destination publishing engine are all part of mdspec.*
