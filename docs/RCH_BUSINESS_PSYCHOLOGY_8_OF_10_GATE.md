# RCH business psychology: evidence-based 8/10 release policy

Date: 2026-10-31  
Scope: public site, PWA, Runs, RCH TV, professional league, Fantasy, Website Creator, commercial network, and statewide discovery.

## What is enforced in this first engineering release

1. Public homepage and statewide community discovery exclude generated weekend circuit suggestions from host-posted Runs/events. They fail closed when suggestion classification is unavailable. Suggested courts have a separate, explicitly unhosted presentation.
2. Anonymous Pulse previews exclude automated/system posts; community trends use human-authored content rather than system activity.
3. The admin-only `/admin/quality` page contains the sixteen category acceptance checks. Production data indicators show only actual aggregate records and explicitly say when values are unavailable.
4. `src/lib/rch-business-quality.ts` does not assign a score to unreviewed categories. Each category has five checks at two points each. All five require named, dated evidence, at least four must pass, and both first/critical checks must pass. Market categories additionally require externally verified real-world outcomes. An 8/10 dashboard badge can never follow merely from deployment.
5. Tests in `tests/rch-business-psychology-gate.test.ts` assert those invariants and public discovery truth rules.

## Release acceptance sequence

- **Code reviews**: check that each source is truthful; verify anonymous visibility with RLS and that private members, attendance, and unverified claims are not exposed.
- **Automated quality**: `npm run type-check`, `npm run lint`, `npm test`, `npm run build`. Fix or document failures before merge.
- **Public QA**: test homepage, Pulse, /discover/community, /runs and 320–430px mobile view on at least iOS and Android; verify handling when the event ledger query fails.
- **Data QA**: ensure the 17 weekend circuit suggestions (as observed October 30) are not counted as hosted events, while genuine host-posted events remain visible.
- **Behavior QA**: first-time visitors locate a useful action and new registered members complete it without staff intervention.
- **Pilot QA**: keep the existing Richmond Runs first-event NO-GO until six distinct real players complete a documented event with physical check-in, verified results, safety review, and independent reviewer sign-off.
- **Market QA**: do not award social, Runs, retention, Website Creator, sponsor, or statewide success scores from code alone.

## Evidence format

A check can only be scored when a reviewer records a real passed/failed result, an ISO review date, and a source (QA report, verified product test, or independently checkable measured outcome). It cannot be self-certified from fixture or staging data. Failed checks still require a report.

This release adds the evaluator, not a writable certification database. A reviewer-controlled evidence workflow remains a future implementation. The visible admin page intentionally displays **UNVERIFIED** until real independent reviews are supplied through the release process.

## Future implementation work that is NOT claimed completed

- Reliable account-creation, first successful action, 7-day and 30-day retention funnel reconciliation. The existing anonymous event tracker measures clicks, not complete customer outcomes.
- Field-verified pickup games, multiple independent hosts, real users, and competitive integrity sign-off.
- Video processing and thumbnail verification on real full-game uploads.
- Three independent Website Creator publishers and actual sponsor delivery and renewal evidence.
- Independent accessibility and user studies, statewide city-cohort growth, and time-series market reporting.

These items must remain open and cannot be represented as 8/10 success without measured evidence. Codes and UI releases do not create members, participation, or market leadership.
