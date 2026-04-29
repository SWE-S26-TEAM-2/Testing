# Cross-Platform QA bug intake — `tests/fl-qa` branch

Source: `flutter analyze`, `flutter test test/widgets/`, and static review of integration test suite on merged `tests/fl-qa` (origin/main + QA test suite, 219 new team commits).

| ID | Severity | Title | File |
|---|---|---|---|
| FL-001 | High | `feature/cross-tracks` changed Track model but left 9 compile errors in downstream files — all integration tests fail to compile | [FL-001.md](FL-001.md) |
| FL-002 | Medium | `mini_player_integration_test.dart` uses `track.id` which no longer exists (renamed to `trackId`) | [FL-002.md](FL-002.md) |
| FL-003 | Medium | `kUseMockAuth` path removed from auth screens — integration tests that depended on mock auth now require a live backend or will fail at Riverpod provider level | [FL-003.md](FL-003.md) |
| FL-004 | Low | `social_buttons_test.dart` Google/Facebook callbacks only assert placeholder snackbars — no real auth outcome verified | [FL-004.md](FL-004.md) |

## Test environment

- Branch: `tests/fl-qa` @ `04916a4` (merge of origin/main + QA fixes)
- Flutter: 3.x (via local SDK)
- Dart analyzer: `flutter analyze`
- Run commands:
  - `flutter test test/widgets/` → widget tests only
  - `flutter analyze` → static analysis

## Result summary

| Suite | Result | Notes |
|---|---|---|
| `test/widgets/mini_player_test.dart` | **8 / 0** | All pass (updated for new Track model) |
| `test/widgets/social_buttons_test.dart` | **7 / 0** | All pass |
| `test/widget_test.dart` | **fail to compile** | FL-001 root cause |
| `test/liked_tracks_test.dart` | **fail to compile** | FL-001 root cause |
| `integration_test/**` | **fail to compile** | FL-001 root cause |
| `flutter analyze` | **9 errors, 27 warnings** | 9 errors all from FL-001 |

## Closed / not applicable

None — all issues are post-merge findings.
