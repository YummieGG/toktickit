# Lab 3 Peer Review Record

## Author
- **Name**: Worawut Sereethai
- **Student ID**: 67070501040
- **GitHub**: @YummieGG

## Peer Reviewer
- **Name**: CHANON LHUMSA-ARD
- **Student ID**: 67070501059
- **GitHub**: @Snnn3

## Pull Requests Authored

| PR # | Title | Branch | Status | Reviewer |
|------|-------|--------|--------|----------|
| [#45](https://github.com/YummieGG/toktickit/pull/45) | Lab3 1 engineering contract and remove unrelated PR-24 files | `lab3-1-engineering-contract` | Merged | @Snnn3 |
| — | Lab 3-2: User schema, migration, seed and authentication | `lab3-2-auth-foundation` | Not created | Pending |

## Pull Requests Reviewed

| PR # | Title | Author | Status | Key Comments |
|------|-------|--------|--------|--------------|
| — | No pull request has been created | — | Not applicable | Review is limited to the current local working tree. |

## Review Comments Given


## Review Comments Received & Responses

### PR #45: Lab3 1 engineering contract and remove unrelated PR-24 files

- **Target PR**: [YummieGG/toktickit#45](https://github.com/YummieGG/toktickit/pull/45)
- **Author**: @YummieGG
- **Reviewer**: @Snnn3
- **Status**: Approved and merged into `lab3-staging`

#### Reviewer comment received (@Snnn3)

> **Verdict: Approved**
>
> Comprehensive review against the CPE 334 Lab 3 handout. All four engineering contract documents (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`) are complete and consistent. Security controls, business rules (BR-01 to BR-21), status transition matrix, and test traceability table (AC-01 to AC-14) meet all Lab 3 Spec DD and Test DD criteria. Noted minor considerations regarding password length (8 vs 12 chars) and Administrator IT Priority permissions.

**Response (@YummieGG):**

> Thanks you kub.

#### Author's review comment on PR #45 (@YummieGG)

> Reviewed PR #45 against the Lab 3 engineering contract.
>
> - The four contract documents are included and consistent: `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md`.
> - Authentication/session/security requirements, authorization matrix, ticket transition matrix, queue behavior, “Problem Appears Resolved”, and test traceability are documented.
> - Unrelated PR-24 JSON files were removed.
> - `git diff --check` passed, and no application implementation was changed in this PR.
>
> **Verdict: Approved.** This PR provides the engineering-contract baseline for the subsequent Issue #39 implementation.

**Review outcome:**

- @Snnn3 approved the PR after reviewing the Lab 3 engineering contract.
- The PR was merged into `lab3-staging` with merge commit `d6e262a`.
- The review established PR #45 as the documentation baseline for the subsequent Issue #39 implementation.
