# Flutter Team — Bug Report
**Reported by:** Testing Team  
**Date:** 2026-05-01  
**Repo:** `SWE-S26-TEAM-2/Cross-Platform`  
**Trigger:** `flutter test --no-pub` on current `main`

---

> [!CAUTION]
> The 2 unit test failures are **compilation errors in production source files** — not test logic errors. The test suite cannot run at all while these compile errors exist. The Flutter team must fix the source files before the testing team can verify anything.

---

## Failing Tests

| # | Test File | Status |
|---|-----------|--------|
| 1 | `test/liked_tracks_test.dart` | ❌ Compilation failure |
| 2 | `test/widget_test.dart` | ❌ Compilation failure (cascades from same errors) |
| — | All other unit tests (13) | ✅ Passing |
| — | Integration tests | ⏸ Not yet run (require device/emulator) |

---

## Root Cause

The `Track` model in `lib/models/track.dart` was refactored: the `artist` field changed from `String` to `TrackArtist?` (a custom object), and the `duration` getter was renamed to `durationSeconds`. **Three source files were not updated to match this refactor.**

---

## Affected Files & Specific Errors

### 1. `lib/screens/library/widgets/track_tile.dart`

| Line | Error |
|------|-------|
| 22 | `track.artist` — returns `TrackArtist?`, not `String` (type mismatch in `subtitle` getter) |
| 25 | `track.duration` — getter does not exist; the field is now `track.durationSeconds` |

**Fix guidance:** The `Track` model already exposes `track.formattedArtist` (`String`) and `track.durationSeconds` (`int?`). Use those instead:
```dart
// Before
String get subtitle => track.artist;
Widget get meta => TileMeta([_formatDuration(track.duration)]);

// After
String get subtitle => track.formattedArtist;
Widget get meta => TileMeta([_formatDuration(track.durationSeconds ?? 0)]);
```

---

### 2. `lib/screens/library/uploads_screen.dart`

| Lines | Error |
|-------|-------|
| 34, 55 | `t.artist.toLowerCase()` — `artist` is `TrackArtist?`, has no `.toLowerCase()` method |

**Fix guidance:** Use `t.formattedArtist.toLowerCase()` (already a `String` with null fallback):
```dart
// Before
t.artist.toLowerCase() == ...
t.artist.toLowerCase().contains(query)

// After
t.formattedArtist.toLowerCase() == ...
t.formattedArtist.toLowerCase().contains(query)
```

---

### 3. `lib/screens/library/context_menu_sheet.dart`

| Line | Error |
|------|-------|
| 217 | `track.artworkUrl.isNotEmpty` — `artworkUrl` is `String?` (nullable), cannot call `.isNotEmpty` directly |
| 219 | `track.artworkUrl` passed as `String` — incompatible with `String?` |
| 242 | `track.artist` passed as `String` — type is `TrackArtist?` |

**Fix guidance:**
```dart
// Line 217 — null-safe access
child: (track.artworkUrl?.isNotEmpty ?? false)

// Line 219 — null assertion (safe after the null check above)
track.artworkUrl!,

// Line 242 — use display name helper
Text(track.formattedArtist, style: AppTextStyles.artistName),
```

---

## Summary Table for Flutter Team

| File | Field | Was | Should Be |
|------|-------|-----|-----------|
| `track_tile.dart:22` | `subtitle` | `track.artist` | `track.formattedArtist` |
| `track_tile.dart:25` | `meta` | `track.duration` | `track.durationSeconds ?? 0` |
| `uploads_screen.dart:34,55` | filter | `t.artist.toLowerCase()` | `t.formattedArtist.toLowerCase()` |
| `context_menu_sheet.dart:217` | null check | `.isNotEmpty` | `?.isNotEmpty ?? false` |
| `context_menu_sheet.dart:219` | artwork | `track.artworkUrl` | `track.artworkUrl!` |
| `context_menu_sheet.dart:242` | artist text | `track.artist` | `track.formattedArtist` |

---

## Next Steps

1. **Flutter Team** — Fix the 3 source files above and push to `main`
2. **Testing Team** — Once the build compiles cleanly, re-run `flutter test --no-pub` to confirm 15/15 pass
3. **Testing Team** — Then run the integration test suite against a connected device/emulator: `flutter test integration_test/`
