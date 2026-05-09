---
title: "mdspec in 5 Minutes: From Zero to Publishing Markdown on Every Merge"
description: "A screencast-style walkthrough: create a repo, add one .mdspecmap, add the GitHub Actions step, push a commit, see it appear in Confluence or Notion. Real YAML throughout."
pubDate: 2026-05-09
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

## Step 2: Get Your API Token

**For Confluence:**

1. Go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Name it something like `mdspec-publish`
4. Copy the token — you won't see it again

You'll also need:
- Your Confluence base URL: `https://yourcompany.atlassian.net`
- Your Atlassian account email address
- The key of the Confluence space you want to publish to (visible in the space URL)

**For Notion:**

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name it `mdspec`, set it to "Internal integration"
4. Copy the "Internal Integration Token"
5. Open the Notion database or page you want to publish to, click "..." → "Connect to" → select your integration

---

## Step 3: Add Your Secrets to GitHub

In your repo: Settings → Secrets and variables → Actions → New repository secret

**For Confluence, add three secrets:**

| Secret name | Value |
|---|---|
| `CONFLUENCE_BASE_URL` | `https://yourcompany.atlassian.net` |
| `CONFLUENCE_USER_EMAIL` | your Atlassian email |
| `CONFLUENCE_API_TOKEN` | the token from Step 2 |

**For Notion, add one secret:**

| Secret name | Value |
|---|---|
| `NOTION_TOKEN` | the integration token from Step 2 |

---

## Step 4: Create the `.mdspecmap`

Add `.mdspecmap` to the root of your repo.

**Confluence config:**

```yaml
version: 1

sources:
  - path: specs/auth-service.md
    destinations:
      - type: confluence
        space: ENG
        parentPage: "Engineering Specs"
        pageTitle: "Auth Service"
```

Replace `ENG` with your actual space key and `Engineering Specs` with a real parent page title in your space. If the parent page doesn't exist, mdspec will create it.

**Notion config:**

```yaml
version: 1

sources:
  - path: specs/auth-service.md
    destinations:
      - type: notion
        databaseId: "paste-your-database-id-here"
        pageTitle: "Auth Service"
```

To find your Notion database ID: open the database in Notion, copy the URL. The ID is the 32-character string after the last `/` and before the `?` — looks like `abc1234567890abcdef1234567890abc`.

**Both at once:**

```yaml
version: 1

sources:
  - path: specs/auth-service.md
    destinations:
      - type: confluence
        space: ENG
        parentPage: "Engineering Specs"
        pageTitle: "Auth Service"
      - type: notion
        databaseId: "your-database-id"
        pageTitle: "Auth Service"
```

---

## Step 5: Add the GitHub Actions Workflow

Create `.github/workflows/publish-specs.yml`:

**For Confluence:**

```yaml
name: Publish Specs

on:
  push:
    branches:
      - main
    paths:
      - 'specs/**'
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
```

**For Notion:**

```yaml
name: Publish Specs

on:
  push:
    branches:
      - main
    paths:
      - 'specs/**'
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
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
```

The `workflow_dispatch` trigger lets you run it manually from the Actions UI — useful for the first run.

---

## Step 6: Push and Verify

Commit everything and push to main:

```bash
git add specs/auth-service.md .mdspecmap .github/workflows/publish-specs.yml
git commit -m "add spec publishing pipeline"
git push origin main
```

Go to your repo's Actions tab. You should see "Publish Specs" running. Click into the run to watch the logs.

A successful run looks like:

```
Reading .mdspecmap...
Publishing specs/auth-service.md → Confluence (ENG / Engineering Specs / Auth Service)
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

Expand the `.mdspecmap` to cover more specs. You can map individual files or entire folders:

```yaml
version: 1

sources:
  - path: specs/auth-service.md
    destinations:
      - type: confluence
        space: ENG
        parentPage: "Engineering Specs"

  - path: specs/rate-limiting.md
    destinations:
      - type: confluence
        space: ENG
        parentPage: "Engineering Specs"

  - path: docs/decisions/
    destinations:
      - type: confluence
        space: ENG
        parentPage: "Architecture Decisions"
```

When you point at a folder, mdspec publishes every `.md` file in it, using each file's H1 as the page title.

---

## Common First-Run Issues

**"Space not found"** — Double-check your space key. It's the short code visible in the Confluence space URL (e.g. `yourcompany.atlassian.net/wiki/spaces/ENG` → space key is `ENG`).

**"Parent page not found"** — Confluence page title lookup is case-sensitive. Copy the exact title from the Confluence UI.

**"403 Forbidden"** — Your API token doesn't have write access to the target space. Check the space permissions in Confluence and ensure your account has "Add Pages" permission.

**Notion "database not found"** — Make sure you connected your integration to the database (the "Connect to" step in Step 2). Each database needs to be explicitly connected.

---

## What's Next

Once your first pipeline is working, the natural next steps:

- **Add S3 as a destination** to make specs machine-readable for AI agents. One block in the config — see [Spec-as-Code](/blog/spec-as-code) for the full pattern.
- **Map your ADRs** in `docs/decisions/` to a Confluence space. See the ADR publishing setup in the [Confluence guide](/blog/markdown-to-confluence-github-actions).
- **Add ClickUp** if your ops or product team lives there. The setup is the same pattern — one more destination block in `.mdspecmap`.

---

*mdspec is available at [mdspec.io](https://mdspec.io). The `mdspec/publish` GitHub Action, the `.mdspecmap` config format, and the multi-destination publishing engine are all part of mdspec.*
