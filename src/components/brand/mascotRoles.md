# Mascot color roles

The original SVG has two fill roles and one stroke role. Its black-filled
silhouette maps to `body`, its white belly and arm detail map to `accent`, and
its white stroke maps to `outline`. `feature` is reserved for future facial
artwork; it currently shares the high-contrast palette ink used by `outline`.

| Source color       | SVG element                 | Role                 |
| ------------------ | --------------------------- | -------------------- |
| `#000000`          | Filled silhouette paths     | `body`               |
| `#ffffff`          | Filled belly and arm detail | `accent`             |
| `#ffffff`          | Detail stroke               | `outline`            |
| No source geometry | Eyes, mouth, accessories    | `feature` (reserved) |

Genre body/accent colors come from the macro-genre `inkA`/`inkB` pair. Outline
and feature use the palette ink with the strongest contrast against the active
theme background, with a minimum 3:1 ratio.

The SVG has no facial or accessory parts. The requested moods are accepted for
API stability but render the original neutral silhouette unchanged. New art
with separate eyes and mouth is needed for expressive moods; separate arms or
accessory paths are needed for a celebration pose.
