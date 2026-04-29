# Backend QA bug intake — `tests/be-qa` branch

Source: pytest run on merged `tests/be-qa` (origin/main + QA test suite). Bugs verified to still reproduce after merging team's 9 commits (admin + payment + free-plan upload cap + base-URL fix + "solved pytests" + likes/track-data endpoints).

| ID | Severity | Title | File |
|---|---|---|---|
| BE-001 | ~~High~~ | ~~`FollowerListData`/`FollowingListData` strip `private` field~~ | **CLOSED** PR #76 |
| BE-002 | ~~High~~ | ~~Privacy not enforced in `search_users`~~ | **CLOSED** PR #76 |
| BE-003 | Medium | No follow-request semantics for private users | [BE-003.md](BE-003.md) |
| BE-004 | Medium | OAuth routes (`/auth/google`, `/auth/facebook`) have zero HTTP test coverage | [BE-004.md](BE-004.md) |
| BE-005 | ~~Medium~~ | ~~`PATCH /conversations/{id}/messages/read-all` zero HTTP coverage~~ | **CLOSED** commit `d37a77b` |
| BE-006 | ~~Low~~ | ~~Audio Range 416/404 edge cases untested~~ | **CLOSED** commit `d37a77b` |
| BE-007 | ~~Low~~ | ~~Upload-size violations return 400; HTTP recommends 413/422~~ | **CLOSED** PR #76 |
| BE-DX-001 | Info | Strict env config breaks pytest at import without `DATABASE_URL`/`SECRET_KEY` | [BE-DX-001.md](BE-DX-001.md) |

## Test environment

- Branch: `tests/be-qa` @ `f0a54d9` (post-fix merge, origin/main @ `fd2eed1`)
- Python: 3.13.13
- pytest: 9.0.3
- Run command: `DATABASE_URL=sqlite:///./test.db SECRET_KEY=test pytest tests/api tests/unit -q`
- Result: **522 passed, 0 failed** ✓

## Closed in PR #76 (`fix/testing/bugs`)

- **BE-001** — `private: bool = False` added to `FollowerListData` and `FollowingListData`
- **BE-002** — `search_by_name` now filters `User.is_private.is_(False)`
- **BE-007** — All upload paths return 413; QA tests updated from `assert 400` → `assert 413`

## Still open

BE-003, BE-004, BE-005, BE-006 — all coverage/feature gaps, no runtime bugs.
BE-DX-001 — env config DX, low priority.
