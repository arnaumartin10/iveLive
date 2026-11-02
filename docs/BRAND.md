# IveLive brand assets

The brand uses the existing Paper & Ink palette: mauve, slate, wheat, orange,
and violet. The supplied `assets/icon.png`, `assets/icon.svg`, and
`assets/Wordmark.png` remain untouched. The generator derives the mascot from
the SVG and the tintable wordmark from the wordmark PNG; `icon.png` is retained
as the supplied reference artwork.

## Source audit

| Asset                             | Dimensions and format                          | Use                                                                  |
| --------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------- |
| `assets/icon.png`                 | 2000×2000 RGB PNG, opaque                      | Supplied reference artwork; not read by the asset generator          |
| `assets/icon.svg`                 | 2000×2000 SVG canvas; 1500×1499.999933 viewBox | Source geometry for generated mascot artwork and generated app icons |
| `assets/Wordmark.png`             | 2000×2000 RGB PNG, opaque                      | Source for the generated tintable wordmark mask                      |
| `assets/artist-placeholder-1.jpg` | 640×640 RGB JPEG                               | Existing fallback used by `ArtistPhoto` and concert sharing          |
| `assets/artist-placeholder-2.jpg` | 640×640 RGB JPEG                               | No current runtime references; retained unchanged                    |
| `assets/artist-placeholder-3.jpg` | 640×640 RGB JPEG                               | No current runtime references; retained unchanged                    |
| `assets/artist-placeholder-4.jpg` | 640×640 RGB JPEG                               | No current runtime references; retained unchanged                    |

`icon.svg` contains 61 paths, 60 clip paths, 12 rectangles, and 72 groups.
It uses black and white fills plus a white stroke, with no gradients, filters,
masks, embedded images, or text. The SVG has no distinct eye, mouth, or
accessory paths, so the component recolors it without changing its expression.
The image wordmark has antialiased edges but one orange ink color; its violet
background is removed during generation so Expo Image can tint it.

No Gyanko font file or embedding license is present in `assets`. UI typography
continues to use the project's Young Serif, Schibsted Grotesk, and DM Mono
fonts.

## Generated files

Run `npm run assets:generate` (equivalent to `npx tsx
scripts/generate-brand-assets.ts`) to regenerate assets from the original
sources. The script writes only to `assets/generated/` and
`src/assets/brand/`; it never overwrites the original assets.

| Generated asset                                                   | Purpose                                                                |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `assets/generated/icon-ios-1024.png`                              | Opaque iOS and store icon, violet background and wheat mascot          |
| `assets/generated/icon-ios-dark-1024.png`                         | Dark-appearance iOS icon                                               |
| `assets/generated/adaptive-foreground-1024.png`                   | Transparent Android adaptive foreground, centered within the safe zone |
| `assets/generated/adaptive-monochrome-1024.png`                   | Android themed-icon silhouette                                         |
| `assets/generated/notification-icon-96.png`                       | White transparent Android notification icon                            |
| `assets/generated/mascot-stamp.png`                               | Monochrome watermark used on exported Wrapped images                   |
| `assets/generated/favicon-48.png`                                 | Web favicon                                                            |
| `assets/generated/splash-mascot.png` and `splash-mascot-dark.png` | Light and dark native splash illustrations                             |
| `assets/generated/share-og-1200x630.png`                          | Social preview with mascot and wordmark                                |
| `assets/generated/icon-candidate-violet-wheat.png`                | Candidate A, selected                                                  |
| `assets/generated/icon-candidate-wheat-slate.png`                 | Candidate B                                                            |
| `src/assets/brand/wordmark.png`                                   | Cropped transparent wordmark mask used by `Wordmark`                   |

Violet with a wheat mascot was selected over wheat with a slate mascot because
its high-contrast field and warm mascot remain more recognizable at small icon
sizes. SDK 57 supports iOS light, dark, and tinted icon variants.

## Legacy generated assets

The previous generated platform assets are archived in `assets/_legacy/` and
are not referenced by the Expo configuration or application code:

- `android-icon-background.png`
- `android-icon-foreground.png`
- `android-icon-monochrome.png`
- `favicon.png`
- `splash-icon.png`

They are retained for reference and have not been deleted. The original source
art and artist placeholders remain in `assets/`.

## Mascot color roles

See [mascotRoles.md](../src/components/brand/mascotRoles.md) for the source
color-to-role mapping. `body` and `accent` come from each macro-genre's
`inkA`/`inkB` pair. `outline` and `feature` use the highest-contrast available
palette ink against the active theme background and must meet 3:1 contrast.
The unclassified body uses mauve.

The current drawing does not support expressive moods or body poses. The
component keeps the requested mood API but leaves the silhouette unchanged.
Separate facial paths are needed for listening, hyped, sleepy, or sad
expressions; separate arm/accessory paths are needed for a celebration pose.

## Runtime integration

The wordmark image is single-ink, so `Wordmark` uses Expo Image tinting for the
theme ink, wheat, and orange variants. The welcome screen, settings screen,
and generated share preview use the original wordmark art rather than
reconstructing it with a font.

Wrapped, profile, and music-identity exports use the generated mascot stamp as
a small footer mark. Cloud Atlas poster exports retain their printed-from-atlas
footer label; the poster preview intentionally omits export branding.

App icon, adaptive icon, notification icon, favicon, and splash paths are
configured by `app.config.ts`. Icon and splash changes are native build-time
configuration; regenerate native projects only when needed with
`npx expo prebuild --clean`. Use a rebuilt development or store build to see
the new icon on a device.
