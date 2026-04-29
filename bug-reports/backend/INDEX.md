# Backend QA bug intake — `tests/be-qa` branch

Source: pytest run on merged `tests/be-qa` (origin/main + QA test suite). Bugs verified to still reproduce after merging team's 9 commits (admin + payment + free-plan upload cap + base-URL fix + "solved pytests" + likes/track-data endpoints).

| ID | Severity | Title | File |
|---|---|---|---|
| BE-001 | High | `FollowerListData`/`FollowingListData` strip `private` field | [BE-001.md](BE-001.md) |
| BE-002 | High | Privacy not enforced in `search_users` — private users surfaced to strangers | [BE-002.md](BE-002.md) |
| BE-003 | Medium | No follow-request semantics for private users | [BE-003.md](BE-003.md) |
| BE-004 | Medium | OAuth routes (`/auth/google`, `/auth/facebook`) have zero HTTP test coverage | [BE-004.md](BE-004.md) |
| BE-005 | Medium | `PATCH /conversations/{id}/messages/read-all` has zero HTTP test coverage | [BE-005.md](BE-005.md) |
| BE-006 | Low | Audio `Range` edge cases (416 over-EOF, 404 file-missing-on-disk) untested | [BE-006.md](BE-006.md) |
| BE-007 | Low | Upload-size violations return 400; HTTP recommends 413/422 | [BE-007.md](BE-007.md) |
| BE-DX-001 | Info | Strict env config breaks pytest at import without `DATABASE_URL`/`SECRET_KEY` | [BE-DX-001.md](BE-DX-001.md) |

## Test environment

- Branch: `tests/be-qa` @ `06647e9` (merge of `origin/main` into QA branch)
- Python: 3.13.13
- pytest: 9.0.3
- Run command: `DATABASE_URL=sqlite:///./test.db SECRET_KEY=test pytest tests/api tests/unit -q`
- Result: **494 passed, 3 failed** (1 real bug + 2 QA-side test obsolescence to update on QA branch)

## Out-of-scope (QA-side, not team bugs)

- `test_get_comments_returns_list` — mock lambda signature outdated after team added `current_user` arg to `EngagementService.get_track_comments`. QA will update.
- `test_openapi_schema_matches_snapshot` — snapshot drifted because team added admin/subscription/feed/search_performance routes. Will refresh via `UPDATE_OPENAPI_SNAPSHOT=1`.
