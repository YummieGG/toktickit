# Lab 2 Peer Review Record

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
| [#19](https://github.com/YummieGG/toktickit/pull/19) | docs: Lab 2 Engineering Specification and Test Plan | `docs/lab2-specification` | Merged | @Snnn3 |
| [#20](https://github.com/YummieGG/toktickit/pull/20) | feat: implement database schema, migration, and seed data for Lab 2 | `feature/lab2-database` | Merged | @Snnn3 |
| [#21](https://github.com/YummieGG/toktickit/pull/21) | feat: implement requester context selection | `feature/lab2-3-requester-context` | Merged | @Snnn3 |

## Pull Requests Reviewed

| PR # | Title | Author | Status | Key Comments |
|------|-------|--------|--------|--------------|
| [#25](https://github.com/Snnn3/TokTickIT/pull/25) | Lab2-1: Sprint engineering contract | @Snnn3 | Merged | Good job. The specifications are extremely clear and detailed, especially the expansion of the Business Rules covering all edge cases. The API and UI specs perfectly align with the Lab 02 requirements. Approved! |
| [#26](https://github.com/Snnn3/TokTickIT/pull/26) | Lab2-2: Prisma data increment and idempotent seed | @Snnn3 | Merged | LGTM! The code perfectly matches the spec and there are no outstanding issues. Passed. I will merge this PR right away. |
| [#27](https://github.com/Snnn3/TokTickIT/pull/27) | Lab2-3: Requester context, selection screen, and active requesters API (#24) | @Snnn3 | Merged | The implementation for the Development Requester selection screen and its context looks good! I've reviewed the code and everything meets the specifications. Outstanding job! Approved. |
| [#28](https://github.com/Snnn3/TokTickIT/pull/28) | Lab2-4: Create Ticket multipart API, validations, and Zen Green form (#18) | @Snnn3 | Merged | Great job! The implementation of ticket_number_seq within a database transaction is a very solid approach. The file upload validation rules (size, count, MIME types) and the UI states align perfectly with our specifications. Test coverage is also spot on. Looks great to me, Approved! |
| [#29](https://github.com/Snnn3/TokTickIT/pull/29) | Lab2-5: implement My Tickets list, filters, search, and pagination (#19) | @Snnn3 | Merged | Great job on this one! The API query validation is solid, and the 300ms debounce on the search input is a great UX touch. I also love how you separated the Empty state from the No-results state perfectly. Approved! |

## Review Comments Given

### PR #25: Lab2-1: Sprint engineering contract
- **Target PR**: [Snnn3/TokTickIT#25](https://github.com/Snnn3/TokTickIT/pull/25)
- **Author**: @Snnn3
- **Verdict**: Approved
- **My comment (@YummieGG)**:
  > Good job. The specifications are extremely clear and detailed, especially the expansion of the Business Rules covering all edge cases. The API and UI specs perfectly align with the Lab 02 requirements. Approved!
- **Partner's response (@Snnn3)**:
  > Thank you for the review and approval! Glad the expanded business rules and API/UI specs look clear and aligned with the Lab 02 criteria.

### PR #26: Lab2-2: Prisma data increment and idempotent seed
- **Target PR**: [Snnn3/TokTickIT#26](https://github.com/Snnn3/TokTickIT/pull/26)
- **Author**: @Snnn3
- **Verdict**: Approved
- **My comment (@YummieGG)**:
  > LGTM! The code perfectly matches the spec and there are no outstanding issues. Passed. I will merge this PR right away.
- **Partner's response (@Snnn3)**:
  > Thank you! Really appreciate the review.

### PR #27: Lab2-3: Requester context, selection screen, and active requesters API (#24)
- **Target PR**: [Snnn3/TokTickIT#27](https://github.com/Snnn3/TokTickIT/pull/27)
- **Author**: @Snnn3
- **Verdict**: Approved
- **My comment (@YummieGG)**:
  > The implementation for the Development Requester selection screen and its context looks good!  
  > I've reviewed the code and everything meets the specifications. Outstanding job! Approved.
- **Partner's response (@Snnn3)**:
  > Thank you for approved my PR.

### PR #28: Lab2-4: Create Ticket multipart API, validations, and Zen Green form (#18)
- **Target PR**: [Snnn3/TokTickIT#28](https://github.com/Snnn3/TokTickIT/pull/28)
- **Author**: @Snnn3
- **Verdict**: Approved
- **My comment (@YummieGG)**:
  > Great job! The implementation of ticket_number_seq within a database transaction is a very solid approach. The file upload validation rules (size, count, MIME types) and the UI states align perfectly with our specifications. Test coverage is also spot on. Looks great to me, Approved!

### PR #29: Lab2-5: implement My Tickets list, filters, search, and pagination (#19)
- **Target PR**: [Snnn3/TokTickIT#29](https://github.com/Snnn3/TokTickIT/pull/29)
- **Author**: @Snnn3
- **Verdict**: Approved
- **My comment (@YummieGG)**:
  > Great job on this one! The API query validation is solid, and the 300ms debounce on the search input is a great UX touch. I also love how you separated the Empty state from the No-results state perfectly. Approved!
- **Partner's response (@Snnn3)**:
  > Thank you for aproving and merging my PR.

## Review Comments Received & Responses

### PR #19: docs: Lab 2 Engineering Specification and Test Plan
- **Reviewer comment received (@Snnn3):**
  > Great job! The specifications and test plans are complete and fully aligned with the Lab 02 labsheet:
  > 
  > Spec & API: Covers all FRs, BRs, data models, and REST contracts.  
  > UI Spec: Follows Zen Green tokens and the 19 Appendix C checklist items.  
  > Test Plan: 82 planned tests with complete AC traceability.

- **How I responded (@YummieGG):**
  > Thanks.  

### PR #20: feat: implement database schema, migration, and seed data for Lab 2
- **Reviewer comment received (@Snnn3):**
  > The Prisma schema, migrations, and seed script perfectly fulfill:
  > - All models, relationships, indexes, and enums match `specification.md` and Section 5 of the labsheet.
  > - Seed data includes 4 categories, 6 systems, 4 active + 1 inactive requesters.

- **How I responded (@YummieGG):**
  > Thank you very much  

### PR #21: feat: implement requester context selection
- **Reviewer comment received (@Snnn3):**
  > Great job! The Development Requester Selection and App Shell:
  > - `GET /api/requesters` returns active requesters sorted alphabetically.
  > - Session persists in `sessionStorage` and clears properly on "Change Requester".
  > - UI adheres to Zen Green `#006B3C` styling and includes the mandatory test-mode warning banner.
  > - Both server API tests and client component tests pass.  
  > LGTM!.

- **How I responded (@YummieGG):**
  > Thanks Bro.  
