---
title: "The Easiest Way to Sync Markdown Files to S3 from GitHub"
description: "S3 is an ideal archive and distribution layer for engineering docs — durable, cheap, and searchable. Here's how to sync from your repo with minimal setup, using mdspec or a native Actions approach."
pubDate: 2026-03-19
author: "mdspec team"
tags: ["S3", "GitHub", "CI/CD", "Documentation", "Infrastructure"]
readingTime: "6 min read"
---

S3 might not be the most glamorous destination for engineering documentation, but it's quietly one of the most powerful.

Think about what you get: durability (11 nines), versioning, access logs, a dead-simple HTTP API, integration with every AWS service imaginable, and per-GB pricing that makes storage cost essentially zero for docs.

For teams building their documentation infrastructure, S3 as an archival and distribution layer solves a lot of problems:

- Archive AI-generated analysis and meeting notes out of the git repo
- Give non-engineers read access to specs without GitHub access
- Feed documentation into RAG pipelines via S3 data sources
- Store the canonical versions of large reference documents that would bloat git history
- Serve documentation as a static site via CloudFront

Here's how to get your markdown files from your GitHub repo into S3 cleanly.

## Option 1: The Native GitHub Actions Approach

If you want direct control and don't mind a few lines of YAML, the AWS CLI in GitHub Actions is the most transparent solution.

### Setup

**1. Create an IAM policy** with minimal permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::your-docs-bucket",
        "arn:aws:s3:::your-docs-bucket/*"
      ]
    }
  ]
}
```

**2. Store credentials in GitHub Secrets:**

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

Or, better: configure OIDC-based authentication so no long-lived credentials exist:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789:role/GithubActionsDocsSync
    aws-region: us-east-1
```

**3. The workflow:**

```yaml
name: Sync docs to S3

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Sync docs to S3
        run: |
          aws s3 sync docs/ s3://your-docs-bucket/docs/ \
            --include "*.md" \
            --delete \
            --metadata-directive REPLACE \
            --content-type "text/markdown; charset=utf-8"
```

The `--delete` flag removes files from S3 that no longer exist in the repo. The `paths:` filter ensures the workflow only runs when docs actually change.

### Limitations of the native approach

This works well for bulk syncs. It has some gaps if you want more granular control:

- It syncs all files in the directory, not just changed ones (slow for large doc trees)
- No frontmatter parsing — metadata from your markdown won't be stored as S3 object metadata
- No multi-destination support — you'd need separate steps for S3 + Notion + Confluence
- No alias system for human-readable destination mapping

---

## Option 2: S3 Sync via mdspec

[mdspec](https://mdspecr2-web.vercel.app) includes S3 as a first-class integration alongside Notion, Confluence, and ClickUp.

The key differences from the raw AWS CLI approach:

**Change detection.** mdspec uses `git diff` to identify only the files that changed in a given push. If your `docs/` directory has 200 files and 3 changed, only 3 files are uploaded. This is significantly faster for large doc trees and reduces unnecessary S3 API calls.

**Frontmatter as metadata.** mdspec parses your markdown frontmatter and stores it as S3 object metadata. This means your `title`, `tags`, `author`, and `date` fields are stored alongside the file and queryable without downloading the content.

**Unified config.** The same `.mdspecmap` file that controls your Notion sync also controls your S3 sync. You don't maintain separate workflows for separate destinations.

```yaml
# .mdspecmap
mappings:
  - folder: docs/specs
    integration: notion
    parent: engineering-docs

  - folder: docs/archive
    integration: s3
    bucket: acme-engineering-docs
    prefix: archive/specs

  - folder: docs/decisions
    integration: s3
    bucket: acme-engineering-docs
    prefix: architecture/decisions
```

**One workflow step:**

```yaml
- name: Publish specs
  run: npx mdspeci publish --project ${{ vars.MDSPEC_PROJECT_ID }}
  env:
    MDSPEC_TOKEN: ${{ secrets.MDSPEC_TOKEN }}
```

This replaces separate sync steps for each destination — one command handles all configured integrations simultaneously.

---

## A Note on S3 Key Structure

Whether you use the AWS CLI or mdspec, think carefully about your S3 key structure before you start syncing. It's hard to reorganize later.

A good convention for engineering docs:

```
s3://your-bucket/
  docs/
    specs/           ← synced from docs/specs/
      auth.md
      payment.md
    decisions/       ← synced from docs/decisions/
      001-redis-sessions.md
    archive/         ← AI analysis, one-off reports
      2026-q1/
        rate-limit-analysis.md
```

Consider also enabling **S3 Versioning** on your docs bucket. It costs almost nothing and gives you the full history of every document — useful if you ever need to recover a previous version of a spec.

---

## Making S3 Docs Searchable

Raw S3 files aren't natively searchable in the way Confluence or Notion are. If you want semantic search over your S3 docs, a few options:

**S3 + OpenSearch:** Set up an S3 event notification that triggers a Lambda on object creation/update, which indexes the file into OpenSearch. Full-text and semantic search with high control, significant setup.

**S3 + Kendra:** AWS Kendra has native S3 data source connectors and provides semantic search with minimal setup. More expensive than the Lambda approach.

**RAG pipeline:** Sync S3 files into a vector store (Pinecone, Weaviate, pgvector) for use in AI-assisted search. This is increasingly the preferred approach for teams building internal AI tooling.

For most teams, the path of least resistance is to use S3 for archival + raw access, and sync the active living specs to a tool like Notion or Confluence that provides built-in search.

---

## When to Use Each Approach

| Use case | Recommended approach |
|---|---|
| Quick sync of a small doc tree | AWS CLI in GitHub Actions |
| Multiple destinations (S3 + Notion + Confluence) | mdspec |
| Large doc tree (100+ files) | mdspec (change detection) |
| Frontmatter as S3 metadata | mdspec |
| Full control over IAM/permissions | AWS CLI |
| Archiving AI-generated files with no other sync needs | AWS CLI |

Both approaches are valid. The AWS CLI approach is transparent and dependency-free. mdspec is more capable when you have multiple sync destinations or want change-aware publishing.

Start with what fits your current needs. The infrastructure will grow with you.
