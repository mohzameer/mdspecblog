---
title: "Why AI Agents Need Your Specs in Git, Not Locked in a SaaS (And How to Serve Them from S3)"
description: "AI coding agents can't authenticate into your Confluence or Notion. They need specs at a URL they can reach. Here's the pattern for keeping a machine-readable copy current alongside your human-readable docs."
pubDate: 2026-05-11
author: "mdspec team"
tags: ["AI Agents", "LLM", "Documentation", "S3", "GitHub Actions", "Cursor", "Claude"]
readingTime: "8 min read"
---

There's a quiet mismatch emerging in engineering teams that are adopting AI coding tools: the specs your AI agents need are locked in places they can't read.

Cursor, Claude Code, Copilot Workspace, and similar tools read context from files and URLs. They cannot authenticate into your Confluence space. They cannot parse Notion pages into useful context. They need plain text — specifically, markdown files at a path or URL they can access directly.

If your authoritative specs live in Confluence and your AI agents are reading stale GitHub file copies or nothing at all, you're giving your agents a map that doesn't match the territory. The suggestions look plausible. The implementations miss details that changed last quarter.

This post covers the concrete problem, the architecture that fixes it, and the setup that keeps machine-readable specs automatically current alongside your human-readable docs.

---

## What AI Agents Actually Read

Let's be precise about what current AI coding tools can and can't access as context.

**Cursor:** Reads files from your local workspace. You can use `@` mentions to reference specific files (`@specs/auth-service.md`), paste in content as context, or configure workspace rules that reference file paths. It cannot reach authenticated URLs.

**Claude Code:** Reads files from your working directory and can fetch content from URLs you provide (with caveats on authenticated endpoints). Passes context via system prompts, CLAUDE.md files, or explicit file references in the conversation.

**Copilot Workspace:** Reads from your repository. Accesses file contents from the repo you're working in, plus anything you paste into the context window.

**Common denominator:** All of these tools can read markdown files. None of them can authenticate into Confluence, Notion, or ClickUp to retrieve spec content. If your spec is in Confluence, your AI agent doesn't have it — unless someone manually copies it into the conversation, which is a manual synchronization step that will get missed.

---

## The Context Debt Problem

When AI agents make suggestions based on incomplete or outdated context, the resulting code tends to be wrong in specific ways:

- **Stale API contracts.** The agent suggests calling an endpoint that was deprecated and removed in a refactor. The code compiles. The behavior is wrong at runtime.
- **Wrong rate limits.** The agent designs a retry strategy around the old rate limit, which was tripled last quarter. The implementation is more conservative than it needs to be.
- **Outdated auth patterns.** The agent generates code using the old session token format that was changed in the auth service refactor. Integration tests catch it, eventually.
- **Missing edge cases.** The spec has a section on edge cases for a specific payment flow. The agent doesn't have the spec, doesn't know about the edge cases, and generates code that handles the happy path correctly but fails in the edge cases explicitly documented in the spec.

None of these are bugs in the AI tools. They're the expected output when the tools don't have the context they need. The tools are only as good as the specs you give them.

---

## The Architecture: One Source, Two Audiences

The solution is to maintain two views of every spec:

1. **A human-readable copy** in Confluence, Notion, or ClickUp — wherever your team reads
2. **A machine-readable copy** in S3 (or a public-facing path) — wherever your AI agents can reach

Both come from the same source: the markdown file in your git repository. The CI pipeline publishes both on every merge.

```
/specs/auth-service.md  (source of truth in git)
         │
         ├── Confluence: ENG / Backend Services / Auth Service  (humans read)
         ├── Notion: Product specs database  (PM reads)
         └── S3: docs.yourcompany.com/specs/auth-service.md  (AI agents read)
```

The `.mdspecmap` config declares all three destinations. Place it in your `specs/` folder:

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

Each `alias:` is a parent page or key-prefix alias configured in the mdspec dashboard. Connect each integration (Confluence, Notion, S3) in the dashboard once — credentials are stored there, not in your repo.

One push to main. Three destinations updated. No manual copies.

---

## Setting Up the S3 Destination

The S3 setup requires:
- An AWS S3 bucket
- An IAM user or role with write access to that bucket
- AWS credentials stored as GitHub Secrets

**Bucket setup:**

Create a bucket for your documentation. The naming convention `docs.yourcompany.com` works well if you ever want to serve it as a custom domain, but any bucket name is fine.

If your AI tools will access the specs via a direct URL (rather than the AWS SDK), configure the bucket for website hosting or use pre-signed URLs. For internal tools that access the bucket via the AWS SDK directly, no website hosting is needed.

**IAM permissions:**

Create an IAM user with a policy scoped to the docs bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::docs.yourcompany.com/specs/*"
    }
  ]
}
```

**GitHub Secrets:**

Add to your repo's GitHub Secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (e.g. `us-east-1`)

**Updated GitHub Actions workflow:**

```yaml
- uses: actions/checkout@v4
- run: npx mdspeci publish --project ${{ vars.MDSPEC_PROJECT_ID }}
  env:
    MDSPEC_TOKEN: ${{ secrets.MDSPEC_TOKEN }}
    GITHUB_EVENT_BEFORE: ${{ github.event.before }}
```

All destination credentials (Confluence, Notion, S3) are configured in the mdspec dashboard — only `MDSPEC_TOKEN` and the project ID are needed in GitHub.

---

## Wiring Specs into Your AI Tools

Once specs are on S3, here's how to feed them to common AI tools.

### Claude Code (CLAUDE.md)

Create a `CLAUDE.md` file at the root of your repo that references your S3 spec URLs. Claude Code automatically reads `CLAUDE.md` at session start.

```markdown
# Context for Claude Code

## Service specs

Current specs are published to S3 on every merge. When working on auth-related code, fetch the current spec:

- Auth service: https://docs.yourcompany.com/specs/auth-service.md
- Rate limiting: https://docs.yourcompany.com/specs/rate-limiting.md
- Data retention: https://docs.yourcompany.com/specs/data-retention-policy.md

These are always current as of the last merge to main.
```

### Cursor (.cursorrules or workspace context)

In Cursor's workspace settings or `.cursorrules`, reference specs from the local filesystem (which should be current if you pull before starting):

```
When working on auth code, always check @specs/auth-service.md for current behavior.
When implementing rate limiting, refer to @specs/rate-limiting.md for the current limits.
```

For specs that need to be read from S3 rather than the local copy, you can include them in your system prompt as fetched content using Cursor's MCP integrations.

### System prompt injection (for custom AI workflows)

If you're building internal tools that use the Claude API or OpenAI API directly, pass spec content as a system prompt:

```python
import boto3
import anthropic

s3 = boto3.client('s3')
spec = s3.get_object(
    Bucket='docs.yourcompany.com',
    Key='specs/auth-service.md'
)['Body'].read().decode('utf-8')

client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=4096,
    system=f"""You are a coding assistant for our engineering team.

Current auth service spec:
{spec}

Use this spec to inform all suggestions related to authentication and sessions.""",
    messages=[{"role": "user", "content": user_query}]
)
```

The S3 fetch always returns the current version — the same version as your repo's main branch. You're not hardcoding a spec into a system prompt and forgetting to update it. The spec in the system prompt is always as current as the last merged PR.

---

## Why Not Just Use the GitHub Raw URL?

You can read markdown files directly from GitHub's raw content URL:

```
https://raw.githubusercontent.com/yourorg/yourrepo/main/specs/auth-service.md
```

This works for public repos. For private repos, raw GitHub URLs require authentication. Private repos with GitHub Apps can use installation tokens, but these expire and managing them in system prompts is fragile.

S3 gives you more control: the file is separate from your code repository, you control access independently, you can serve it via a custom domain, and you can add caching or CDN behavior if you ever need it. For internal tools in a single organization, authenticated S3 access with IAM is cleaner than GitHub token management.

---

## The Freshness Guarantee

The key property of this architecture is that the S3 copy is updated on every push to main via CI. This means:

- The S3 spec is always as current as the latest merged commit
- Your AI agent's context is always as current as the S3 spec
- There is no manual step that can be skipped

Compare this to the alternative: an engineer manually copies spec content into a system prompt or a CLAUDE.md file when they remember to. That copy drifts. The agent's context drifts. Suggestions degrade in ways that are hard to notice until something breaks.

The CI guarantee is the same one that makes automated testing valuable: not because engineers would otherwise never run tests, but because "always runs" is architecturally better than "usually runs."

---

## Connection to Spec Drift

The broader problem this solves is [spec drift](/blog/spec-drift) — the divergence between an authoritative spec and the copies that people (and agents) actually read. The multi-destination publishing pattern described in [Spec-as-Code](/blog/spec-as-code) treats the S3 copy as one destination among several, which means the same CI step that keeps your Confluence page current also keeps your AI agent context current.

This is the architectural answer to AI context debt: not a new process or a new convention, but the same automatic publishing pipeline extended to include the audience that AI tools read from.

---

## Getting Started

If you already have mdspec publishing to Confluence or Notion, adding S3 is one line in your `.mdspecmap`:

`specs/.mdspecmap`:
```yaml
version: 1
mappings:
  - integration: confluence    # existing
    parent: alias:backend-services
  - integration: s3            # new
    parent: alias:docs-bucket
```

Connect your S3 bucket in the mdspec dashboard (Dashboard → Integrations → S3 → Connect), create a key-prefix alias, and push. Your specs will be on S3 within the next CI run.

If you're starting from scratch, the [5-minute quickstart](/blog/mdspec-quickstart) covers the full setup — you can add S3 as a destination from the beginning.

---

*mdspec publishes to S3 as a first-class destination alongside Confluence, Notion, and ClickUp. [Get started at mdspec.io](https://mdspec.io).*
