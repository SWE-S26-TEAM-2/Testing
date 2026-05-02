# Frontend QA bug intake — `tests/fe-qa` branch

Source: jest + playwright runs on merged `tests/fe-qa` (origin/main + QA test suite). Bugs verified to still reproduce after merging team's 78 commits (header/banner/profile rewrite, email-verification flow rework, studio dashboard, follow-button wiring, test alignment commits).

| ID | Severity | Title | File |
|---|---|---|---|
| FE-001 | High | Playwright mock — 39 tests fail with single root cause: LoginModal never advances to password step | [FE-001.md](FE-001.md) |
| FE-002 | Medium | Jest `Toggle.test.tsx` — 4 tests query `getByRole("button")` but component is `role="switch"` | [FE-002.md](FE-002.md) |
| FE-003 | Medium | Jest `Footer.test.tsx` — 5 audio/queue tests fail because jsdom does not implement `HTMLMediaElement` | [FE-003.md](FE-003.md) |
| ~~FE-004~~ | ~~Low~~ | **CLOSED — fixed by team** ([ProfileActions.tsx:33-42](../../../Frontend/media/src/components/Profile/ProfileActions.tsx)) | – |
| FE-005 | Low | LoginModal has no forgot-password entry point (BE endpoint exists, UI does not expose) | [FE-005.md](FE-005.md) |
| FE-006 | Low | OAuth callback handler not implemented — Google/Facebook buttons exist, redirect flow does not | [FE-006.md](FE-006.md) |
| ~~FE-007~~ | ~~High~~ | ~~E2E `apiRegister` missing `display_name` → 422 on every fresh registration~~ | **FIXED** `e2e/real/fixtures/api-client.ts` |
| ~~FE-008~~ | ~~High~~ | ~~E2E real-backend tests use wrong API response shapes (envelope + field names)~~ | **FIXED** 7 files in `e2e/real/` |
| FE-009 | Medium | Next.js Middleware Auth Guard blocks Playwright E2E Tests on Protected Routes | [FE-009.md](FE-009.md) |
| FE-010 | Medium | Deploy E2E feed-interaction tests fail when authenticated account has empty feed | [FE-010.md](FE-010.md) |

## Test environment

- Branch: `tests/fe-qa` @ `9a592ed` (merge of `origin/main` into QA branch)
- Node: v20.20.2
- npm: 10.8.2
- Playwright: chromium-mock project, port 3100, `NEXT_PUBLIC_USE_MOCK_API=true`
- Run commands:
  - `npm test -- --ci`
  - `npm run test:e2e:mock`

## Result summary

| Suite | Pre-merge | Post-merge | Δ |
|---|---|---|---|
| jest | 123 / 7 | **135 / 9** | +12 pass, +2 fails (team's new Footer queue-drawer tests share FE-003 root cause) |
| playwright mock | 59 / 37 | **57 / 39** | retry/flake noise; **identical failure-test set** |

Net: 78 team commits did not touch any of the 5 still-open issues.

## Out-of-scope (QA-side, not team bugs)

None this round. All 9 jest fails + 39 playwright fails map to one of FE-001/FE-002/FE-003.

## Latest deploy verification (2026-05-02)

- Command: `npm run test:e2e:real`
- Result: **38 passed, 3 skipped, 4 failed**
- Skips: profile tests skipped intentionally when deploy slugs are not configured:
  - `E2E_PROFILE_ARTIST_SLUG`
  - `E2E_PROFILE_OWNER_SLUG`
- Fails (all tied to empty `/stream` feed for current test account):
  - `user can like a track from the feed`
  - `feed track overflow menu exposes add-to-queue`
  - `clicking play on a feed track activates pause in the footer player`
  - `footer transport toggles playback state`
