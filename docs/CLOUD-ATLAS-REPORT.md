# Cloud Atlas implementation report

## Changes

- Added the poster layout/export sheet, 3000 × 4200 print and 1080 × 1920
  story formats, whole-world/biggest-territory variants, a preview, PNG
  sharing, and a write-only Photos permission flow. Photo stickers are decoded
  in batches of twelve; unavailable images retain their genre marks and are
  reported in the export sheet. Saving to the system Photos library is
  iOS/Android-only; the web implementation reports this without importing the
  native Media Library module.
- Added device-based Cloud quality defaults, manual quality preferences,
  sustained p95 frame-time downgrade logic, dev telemetry, and a 100/300/1000
  artist bench selector.
- Added a screen-reader-triggered accessible artist list and an explicit List
  view toggle. The empty world exposes all fourteen unexplored territories and
  a start action.
- Added the feature-flagged Compare Atlas search, access-checked friend-data
  loading, overlap/territory summary, dashed friend sticker overlays, and
  dashed strings for shared artists. The flag defaults off; Supabase enforces
  access through RLS. Enable with `EXPO_PUBLIC_COMPARE_ATLAS=true`.
- Updated MiniCloud to restore Cloud layout caching, show a fetch skeleton,
  and draw a single memoized static Skia Picture without gestures.
- Documented the Atlas shapes in [BRAND.md](./BRAND.md).

### Main files changed

- `src/features/cloud/CloudGraph.tsx`, `performance.ts`, `poster.ts`,
  `posterRenderer.ts`, `CloudPosterSheet.tsx`, `CloudComparePanel.tsx`,
  `CloudAccessibleList.tsx`, `CloudEmptyWorld.tsx`, `atlas.ts`, and
  `compare.ts`.
- `src/app/(tabs)/settings.tsx`, `src/app/(dev)/cloud-bench.tsx`,
  `src/components/ui/SegmentedControl.tsx`, and `app.config.ts`.
- Cloud tests under `tests/cloud-*.test.*`, plus this report and `BRAND.md`.

## Performance and memory

| Tier | Scene cap | Relief levels | Frame budget / automatic behavior | Measured p95 |
| --- | ---: | ---: | --- | --- |
| Spectacular | 1,200 on-screen artists | 5 | 22 ms; automatic mode steps down after three consecutive 1-second windows above budget | Not measured here; requires a physical device |
| Balanced | 700 on-screen artists | 4 | 22 ms; automatic mode steps down after three consecutive 1-second windows above budget | Not measured here; requires a physical device |
| Lite | 250 on-screen artists | 3 | 22 ms; terminal automatic tier | Not measured here; requires a physical device |

The bench screen reports FPS and p95 for 100, 300, and 1,000 synthetic artist
nodes, but its canvas baseline does not represent a full Cloud session. No
simulator or physical-device session was available in this implementation
environment, so device p95, draw-call, cache-hit, and rebuild measurements are
not claimed.

The raw 32-bit poster surface requires approximately **50,400,000 bytes
(48.1 MiB)** at 3000 × 4200, **22,400,000 bytes (21.4 MiB)** at the 2000 × 2800
fallback, and **8,294,400 bytes (7.9 MiB)** at 1080 × 1920. These are surface
size calculations, not measured process peak memory; Skia snapshots, decoded
stickers, and PNG encoding add implementation-dependent overhead. At most
twelve decoded sticker images are held while drawing. Devices reporting less
than 4 GiB total memory use the 2000 px-wide fallback before allocation, and a
failed full-resolution allocation retries at that size. The native peak for a
1,000-artist export still needs measurement on-device.

## Commands

```sh
npm test -- --runTestsByPath tests/cloud-performance.test.ts tests/cloud-poster.test.ts tests/cloud-accessibility.test.tsx tests/cloud-compare.test.ts tests/cloud-atlas.test.ts tests/cloud-experience-components.test.tsx
npm run lint
npm run typecheck
npx expo-doctor
npm run format:check
```

For device measurements, open the dev Cloud bench and capture each tier at
100, 300, and 1,000 artists for at least 30 seconds. Repeat poster export with
1,000 artists while recording process peak memory.

## QA matrix

| Scenario | Status |
| --- | --- |
| Small phone, iOS | Not run |
| Large phone, iOS | Not run |
| Small phone, Android | Not run |
| Large phone, Android | Not run |
| Low-end device / Lite tier | Not run |
| Reduce Motion | Unit/component path covered; device verification not run |
| VoiceOver | Accessible list/component path covered; device verification not run |
| TalkBack | Accessible list/component path covered; device verification not run |
| Offline cached map | Not run on device |
| 1,000-artist poster peak memory | Not measured on device |

The full Jest run passes **41 suites / 886 tests**. Typecheck and lint pass;
lint retains two warnings in unrelated `CustomArtistForm.tsx` and
`HomeHub.tsx`. Expo Doctor reports an unsupported `newArchEnabled` app.json
key and five Expo patch-version mismatches. The repository-wide format check
reports format differences across 140 files; Atlas files were not
batch-formatted to avoid unrelated churn.
