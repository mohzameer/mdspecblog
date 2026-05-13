---
title: "The Engineering Manager's Playbook for Ending Documentation Debt"
description: "Documentation debt isn't a culture problem — it's an architecture problem. Here's a practical framework for eliminating it: who owns the spec, what enforces freshness, and how to make publishing automatic."
pubDate: 2026-04-29
author: "mdspec team"
tags: ["Engineering Management", "Documentation", "Documentation Debt", "Developer Workflow", "Technical Debt"]
readingTime: "9 min read"
---

Every engineering manager eventually has the documentation conversation. A new engineer took two weeks longer to onboard than expected because the architecture docs were three versions behind. An on-call engineer spent 45 minutes diagnosing an incident that the runbook — if it had been current — would have resolved in five. A security audit flagged a Confluence page that described session handling behavior the team had changed eight months ago.

The instinct is to treat this as a culture problem. "We need to be better about documentation." A new rule gets added to the definition of done. Someone creates a "documentation champion" rotation. For a sprint or two, things improve.

Then the next crunch arrives. The docs slip again.

The reason this cycle repeats is that the solution being applied — culture and process — is aimed at the wrong root cause. Documentation debt is not primarily a discipline problem. It's an architecture problem. And architecture problems require architectural fixes.

This playbook is the architectural fix.

---

## The Three Root Causes of Documentation Debt

Before getting to solutions, it's worth naming exactly why documentation debt accumulates. There are three structural causes, and they compound each other.

### 1. No single owner — documentation is everyone's responsibility and therefore no one's

When documentation is treated as a shared responsibility, it gets updated inconsistently. The engineers who care about docs update them. The engineers who don't, don't. The engineers who are under deadline pressure don't, regardless of how much they care.

This is not a character failure. It's a predictable outcome of assigning responsibility to a group without a clear enforcement mechanism.

### 2. No enforcement hook — nothing in the workflow guarantees documentation gets updated

Even teams that add "update the Confluence page" to their definition of done find that compliance is imperfect. The PR can be merged without the Confluence update. The CI pipeline doesn't fail. The sprint closes. The page drifts.

If documentation updates are not enforced by a mechanism that can block a deploy or a merge, they are optional in practice even when they're mandatory in policy.

### 3. No easy publish path — updating documentation requires context-switching out of the development workflow

Confluence requires logging in, navigating to the right page, editing in a rich-text editor, publishing. Notion requires the same. ClickUp requires the same. For an engineer in flow, any of these is enough friction to justify "I'll do it later" — which becomes never.

The harder it is to update documentation, the less it gets updated. This is not about motivation or professionalism. It's about friction.

These three causes interact: when documentation is everyone's responsibility (no owner) and the workflow doesn't enforce it (no hook), the path of least resistance is to skip it — especially when skipping it is easier than the alternative (no easy publish path).

The solution addresses all three.

---

## The Framework

### Git as the Owner

The fix to "everyone's responsibility" is not assigning one person — that person becomes a bottleneck and a single point of failure. The fix is assigning ownership to the repository itself.

A spec that lives in `/specs/auth-service.md` in the git repository belongs to the repository. It is subject to the same review process as the code it describes. It is versioned alongside the code. It is part of the PR that changes the behavior it documents.

This changes the ownership dynamic fundamentally: instead of "someone should update the Confluence page," the question becomes "does this PR include an update to the relevant spec?" — the same question reviewers already ask about tests.

**Practical implementation:**

- Create a `/specs/` folder at the root of each service repository (or a shared monorepo folder for shared specifications)
- Establish a convention: any PR that changes behavior described in a spec file must update the spec file in the same PR
- Add spec files to CODEOWNERS so the right reviewers are automatically included when specs change

```
# .github/CODEOWNERS
/specs/          @engineering-leads
/docs/decisions/ @engineering-leads @tech-lead
```

This makes spec review explicit. The spec update isn't a separate task — it's part of the PR, reviewed by the same people who review the code.

### CI as the Enforcement Hook

Git ownership solves the first root cause. The enforcement hook solves the second.

The principle: if documentation is required, documentation must be enforced by a mechanism that can block the workflow. In a CI/CD pipeline, that mechanism is the CI step.

There are two distinct enforcement patterns, and they serve different purposes.

**Pattern A: Require spec updates in PRs that touch documented code**

Use a CI check that fails if a PR modifies code in a service directory but doesn't modify the corresponding spec file:

```yaml
- name: Check spec freshness
  run: |
    changed_services=$(git diff --name-only origin/main | grep '^services/' | cut -d/ -f2 | sort -u)
    for service in $changed_services; do
      if ! git diff --name-only origin/main | grep -q "specs/$service"; then
        echo "PR modifies $service but doesn't update specs/$service"
        exit 1
      fi
    done
```

This is a relatively blunt check — it fails if *no* spec files were updated for a changed service, but it doesn't verify that the *right parts* of the spec were updated. It's a forcing function, not a comprehensive review. It works well for teams that have low spec-update compliance and need to break the habit of skipping it entirely.

**Pattern B: Automatic publishing on merge**

The second enforcement pattern is more powerful: instead of requiring someone to update external documentation tools, the CI pipeline does it automatically on every merge.

When a spec file changes and the PR merges, CI publishes the updated spec to every declared destination — Confluence, Notion, ClickUp, S3 — without any action from the engineer. The enforcement question shifts from "did someone update Confluence?" to "does the spec file in the repo reflect current behavior?" — and that's a question the code review process already addresses.

This is the spec-as-code pattern, and it's described in detail below.

### A Simple Publish Path

Pattern B above — automatic publishing on merge — also solves the third root cause: publishing friction. If the engineer never has to open Confluence, the friction of updating Confluence is zero. The spec update is a markdown file change in the same PR as the code change. That's work the engineer is doing anyway.

---

## What to Put in Your Spec Template

A spec template that's too heavy doesn't get filled in. A spec template that's too light doesn't capture the information that matters. Here's a pragmatic baseline:

```markdown
# [Service/Feature Name]

**Status:** Active | Deprecated | Experimental
**Last reviewed:** YYYY-MM-DD
**Owner team:** [team name]

## Overview

One paragraph. What this service/feature does and why it exists.

## Behavior

The main body. What the system does. Written in present tense as a description of current behavior, not past decisions.

## Limits and constraints

Rate limits, quotas, timeouts, size limits. Anything that affects how callers interact with this service.

## Dependencies

What this service depends on. What depends on this service.

## On-call notes

Known failure modes. Where to look first when something goes wrong. Which alerts indicate which problems.

## Open questions / known gaps

Explicitly document what is not yet decided or not yet implemented. This prevents callers from making assumptions about undefined behavior.
```

The "On-call notes" section is the one most commonly missing from specs and most valuable during incidents. Making it part of the template creates a habit of capturing operational knowledge alongside functional behavior.

The "Open questions" section prevents a specific failure mode: callers assuming that undocumented behavior is intentional. Making the gaps explicit is a form of documentation even when you can't document the final answer yet.

---

## How to Structure /specs/ in a Monorepo

Monorepos need a clear convention for where specs live. The options:

**Option A: Centralized**
```
/specs/
  auth-service.md
  payments.md
  notification-system.md
  data-retention-policy.md
/docs/decisions/
  001-database-choice.md
  002-auth-strategy.md
```

Clean and discoverable. All specs in one place. Works well when the spec authors and the code authors are the same people.

**Option B: Co-located**
```
/services/
  auth/
    specs/
      service.md
      rate-limits.md
  payments/
    specs/
      service.md
      webhook-behavior.md
```

Specs live next to the code they describe. Works well for large monorepos where ownership boundaries are clear and engineers should only update specs in their own service directory.

**Option C: Hybrid**
```
/specs/
  # Shared / cross-service specs here
  data-retention-policy.md
  security-requirements.md
/services/auth/specs/
  # Auth-specific specs here
/services/payments/specs/
  # Payments-specific specs here
```

Separates shared organizational specs (retention policies, security requirements) from service-specific specs. Slightly more complex but appropriate when specs serve different audiences.

The right choice depends on your team's size and ownership model. For teams under 30 engineers, Option A is usually the cleanest starting point.

---

## The Spec-as-Code Architecture

Once specs are in git and owned by the repository, the last step is automatic publishing. This is where [spec drift](/blog/spec-drift) — the progressive divergence between the spec in git and the copies people actually read in Confluence, Notion, and ClickUp — gets eliminated structurally.

Place `.mdspecmap` files in the folders you want to sync. Each file's location defines its scope, and each can route to different destinations.

`specs/.mdspecmap`:
```yaml
version: 1
mappings:
  - integration: confluence
    parent: alias:engineering-specs
```

`docs/decisions/.mdspecmap`:
```yaml
version: 1
mappings:
  - integration: confluence
    parent: alias:architecture-decisions
  - integration: notion
    parent: alias:adr-database
```

`specs/security/.mdspecmap` (or use `skip:` patterns to route specific files differently):
```yaml
version: 1
mappings:
  - integration: confluence
    parent: alias:compliance-documents
```

Each `alias:` is configured once in the mdspec dashboard. A GitHub Actions step on push to main publishes everything:

```yaml
- uses: actions/checkout@v4
- run: npx mdspeci publish --project ${{ vars.MDSPEC_PROJECT_ID }}
  env:
    MDSPEC_TOKEN: ${{ secrets.MDSPEC_TOKEN }}
    GITHUB_EVENT_BEFORE: ${{ github.event.before }}
```

From the manager's perspective, this eliminates the supervision cost: you no longer need to check whether Confluence got updated, whether the Notion page is current, whether the ClickUp runbook reflects the latest incident procedure. The CI log tells you what was published, when. The Confluence page history tells you when it was last updated. Both are always correct.

---

## Measuring Progress

How do you know if the framework is working? Three metrics worth tracking:

**Spec coverage:** What percentage of services/features have a spec file? Start from zero, track monthly. Even imperfect specs are better than no specs.

**Spec freshness:** For services that changed in the last 30 days (by code commit), what percentage had their spec file updated in the same window? This is the metric that the CI enforcement hook (Pattern A above) directly improves.

**On-call time-to-resolution:** Track whether incidents in services with current specs resolve faster than incidents in services with stale or missing specs. This is harder to measure but makes the business case concrete.

The first two metrics are straightforward to track from git log. The third requires correlating your on-call incident tracker with your repository, which is worth doing once you have reasonable spec coverage.

---

## What This Doesn't Solve

The framework above solves the structural causes of documentation debt. It doesn't solve:

- **Specs that are technically current but poorly written.** A CI step can verify that a spec file was updated; it can't verify that the update is accurate or useful. Quality still requires review.
- **Documentation for legacy services that have no specs yet.** The framework makes it easy to add specs going forward. Getting coverage on legacy services requires a dedicated initiative — backfill sprint, documentation week, or gradual coverage as each service is touched.
- **Organizational alignment on which tool is the source of truth.** If some teams insist on Confluence as the source and others insist on Notion, automatic publishing from git requires a conversation about what "authoritative" means. The framework depends on everyone agreeing that git is the source.

These are people and process problems, and they require people and process solutions. The architectural framework handles everything that architecture can handle — which is more than most teams think, but not everything.

---

## Getting Started This Week

A realistic starting point that doesn't require a big initiative:

1. **Pick one service** that's well-understood and actively maintained. Create `specs/[service-name].md` using the template above.
2. **Wire up the publishing pipeline** for that one file. Add the `.mdspecmap` config, add the GitHub Actions step, verify that the Confluence page gets created.
3. **Add it to CODEOWNERS** and to your next sprint review as a proof of concept.
4. **Expand to your highest-pain services** — the ones where on-call confusion or onboarding friction is highest. Those are where spec coverage pays off fastest.

The full framework — git ownership, CI enforcement, automatic publishing — doesn't need to be deployed all at once. Get one service working end-to-end, demonstrate the value, and expand from there.

---

*mdspec is the publishing layer in the framework above — the `.mdspecmap` config and the `mdspec/publish` GitHub Action. [See how it works at mdspec.io](https://mdspec.io).*
