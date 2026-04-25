---
title: "How to Auto-Update ClickUp Tasks and Docs Straight from Your GitHub Repo"
description: "Manual ClickUp updates are a tax on developer focus. Here's how to wire your GitHub repo to ClickUp so tasks and docs stay in sync automatically — with and without mdspec."
pubDate: 2026-03-24
author: "mdspec team"
tags: ["ClickUp", "GitHub", "CI/CD", "Automation", "Developer Workflow"]
readingTime: "7 min read"
---

If your team uses ClickUp for project management and GitHub for code, you're probably familiar with the update tax: finish a piece of work, switch to ClickUp, find the task, change the status, maybe paste in a link or a note. Repeat twenty times a week.

This is wasted time that compounds at the team level. Worse, it's the kind of friction that causes updates to just... not happen. Statuses stay stale. Docs fall behind. The project management tool becomes an unreliable record that nobody fully trusts.

The good news: this is fully automatable. Here's how.

## The Two Things You Actually Want to Automate

### 1. Task status updates

When a PR is opened, a task should move to "In Review." When it merges to main, it should move to "Done." No manual touch.

### 2. Doc updates

When a spec or documentation file changes in the repo, the corresponding ClickUp Doc should update automatically. No manual copy-paste. No drift.

Let's address both.

---

## Automating Task Status Updates

### Option A: ClickUp GitHub Integration (built-in)

ClickUp has a native GitHub integration that can:

- Automatically change task status when a PR is opened or merged
- Link commits to tasks
- Display PR status on the ClickUp task

**Setup:** Go to ClickUp → Integrations → GitHub. Connect your repo. Configure which status to set on PR open, merge, and close.

**In your commits/PRs:** Reference task IDs using ClickUp's syntax:

```
fix: resolve rate limiting race condition

Closes CU-abc123
```

Or in PR descriptions:

```markdown
## Related
- Closes CU-abc123
- Relates to CU-def456
```

ClickUp will detect these references and update the linked task's status on the trigger you configured.

**Limitation:** This only works for the statuses ClickUp has mapped. Custom workflows with complex conditions require going deeper.

### Option B: GitHub Actions + ClickUp API

For more control, hit the ClickUp API directly from a GitHub Actions workflow:

```yaml
name: Update ClickUp on PR merge

on:
  pull_request:
    types: [closed]
    branches: [main]

jobs:
  update-clickup:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - name: Extract ClickUp task IDs from PR
        id: extract
        run: |
          TASK_IDS=$(echo "${{ github.event.pull_request.body }}" | grep -oP 'CU-\w+' | tr '\n' ' ')
          echo "task_ids=$TASK_IDS" >> $GITHUB_OUTPUT

      - name: Update ClickUp task status
        run: |
          for task_id in ${{ steps.extract.outputs.task_ids }}; do
            curl -X PUT "https://api.clickup.com/api/v2/task/$task_id" \
              -H "Authorization: ${{ secrets.CLICKUP_TOKEN }}" \
              -H "Content-Type: application/json" \
              -d '{"status": "complete"}'
          done
```

This is more flexible and lets you add custom logic — different statuses for different branches, posting comments to tasks on merge, attaching PR links, etc.

---

## Automating ClickUp Doc Updates from the Repo

This is the harder problem. The ClickUp API supports creating and updating Docs, but the workflow of "detect which markdown files changed, find the corresponding ClickUp Doc, and update it" is non-trivial to build and maintain.

The pieces you'd need in a custom solution:

1. Parse git diff to identify changed markdown files
2. Look up the ClickUp Doc ID corresponding to each file (some kind of mapping required)
3. Convert markdown to ClickUp's doc format
4. Handle create vs. update logic
5. Deal with API rate limits and error states
6. Maintain this script as the ClickUp API evolves

This is doable. It's also a few hundred lines of glue code that becomes someone's responsibility to maintain.

### The mdspec approach

[mdspec](https://mdspec.dev) solves this directly. It handles the change detection, the mapping, the API calls, the markdown conversion, and the create vs. update logic — out of the box, for ClickUp (and Notion, Confluence, and S3).

Your setup looks like this:

**`.mdspecmap`** in your repo:

```yaml
mappings:
  - folder: docs/specs
    integration: clickup
    parent: engineering-docs-space

  - folder: docs/tasks
    integration: clickup
    parent: sprint-docs
```

**`.github/workflows/mdspec.yml`**:

```yaml
name: Sync docs to ClickUp

on:
  push:
    branches: [main]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Publish specs
        run: npx mdspeci publish --project ${{ vars.MDSPEC_PROJECT_ID }}
        env:
          MDSPEC_TOKEN: ${{ secrets.MDSPEC_TOKEN }}
```

Every push to `main`, mdspec detects which docs changed and updates the corresponding ClickUp Docs. The alias system in your mdspecmap connects doc folders to their destination spaces — safe to commit because it contains no credentials or ClickUp IDs.

---

## Combining Both: The Full Automation Stack

For teams that want full ClickUp sync from GitHub, the complete setup is:

**Task status updates:** ClickUp's native GitHub integration (or a lightweight GitHub Actions workflow for custom logic)

**Doc updates:** mdspec, running on push to main

This gives you:
- ✓ Task statuses that update automatically on PR open/merge
- ✓ Spec and documentation pages in ClickUp that stay current with the repo
- ✓ No manual update steps for engineers
- ✓ ClickUp as a reliable, up-to-date mirror of what's actually in the codebase

---

## The Trust Problem

Here's the real benefit that's hard to quantify: when updates happen automatically, the project management tool becomes trustworthy.

When PMs check a task status, they get an accurate answer. When support checks a ClickUp Doc, it reflects the current behavior. When a new engineer looks up a feature in ClickUp, they find current specs.

That trust has compounding value. Meetings get shorter because everyone is working from accurate information. Miscommunications about "what was actually built" become rare instead of routine. The PM stops asking engineers to update ClickUp because they know it's already done.

Automate the update. Trust the data.
