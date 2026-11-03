# Keepsake media

## Preparation and storage

Photos are decoded, oriented, resized to a 1600 px long edge, composited over
the paper color, and re-encoded as JPEG. Thumbnails use a 480 px long edge and
are reduced to the configured thumbnail limit. Web decoding prefers
`createImageBitmap` with decode-time resizing for images above 25 megapixels.
HEIC/HEIF conversion on web is dynamically loaded only when the browser cannot
decode the source directly.

The output JPEG is checked for EXIF/XMP markers. If metadata remains, it is
encoded a second time; upload is blocked only if GPS metadata still appears.
If browser-side verification is unavailable, the re-encoded image is not
blocked solely for that reason.

Videos are kept in their original format on web. iOS requests the compatible
H.264 720p picker representation; if a platform returns an original supported
file, it is uploaded without browser transcoding. Poster generation is
best-effort and falls back to a paper-colored play placeholder. Videos longer
than 60 seconds or over the storage bucket limit are rejected before upload.

## Supported input formats

These are accepted by signature or picker MIME when the active platform can
decode them. Acceptance is not a claim that every OS/browser build has been
device-tested.

| Media | Inputs                                                         | Stored representation        |
| ----- | -------------------------------------------------------------- | ---------------------------- |
| Photo | JPEG, PNG, HEIC/HEIF, WebP, AVIF, GIF (first frame), BMP, TIFF | JPEG                         |
| Video | MP4, MOV/QuickTime, M4V, WebM, 3GP                             | Original video MIME and file |

Web HEIC/HEIF uses the lazy `heic-to` fallback when native browser decoding
fails. If that conversion also fails, the user is asked to export as JPEG or
use Safari/the app. A browser that cannot decode a video may still upload it
when the picker supplies a duration; playback offers the poster and original
download/open action.

RAW camera formats, encrypted/DRM media, corrupt files, and formats the active
decoder cannot open remain unsupported. Videos over either limit are not
trimmed or transcoded by the browser.

## Limits

The `log-media` storage bucket is configured by
[`20261103120000_keepsake_media_formats.sql`](../supabase/migrations/20261103120000_keepsake_media_formats.sql)
for MP4, QuickTime, M4V, WebM, and 3GPP video and a limit of 52,428,800 bytes
(50 MiB). The app reports this as a 50 MB limit. The limit in the linked
Supabase project may differ until the migration is applied; the project plan's
separate storage allowance cannot be determined from this repository.

## Diagnostics and feedback

Failures carry a `KEEPSAKE_*` code and safe technical context (MIME, extension,
byte size, dimensions, platform, and failing step). The code is shown in the
UI and retained with failed local queue items. Development builds emit a
structured console diagnostic. This repository does not currently configure a
Sentry SDK/DSN or contain a feedback submission/table flow, so no remote
breadcrumb or feedback-table write is performed.

## Verification status

Automated unit/component tests cover MIME signatures, EXIF GPS and orientation
inspection, large-image dimension scaling, video-limit messaging, and coded
preparation errors. They do not execute native image decoders, browser canvas
encoding, or a full upload.

No real iPhone, Android device, or browser format matrix was exercised for
this change. In particular, HEIC transcoding, transparent-image flattening,
orientation, MOV/H.264 export, and unsupported-codec playback still need
verification in real builds.

## Migration and type commands

The migration has not been applied and no remote database was accessed. After
confirming the linked project is the intended environment, an operator can
run:

```sh
npx supabase db push --linked
npx supabase gen types typescript --linked --schema public > src/lib/database.types.ts
```

The checked-in database types currently include the nullable `codec` column
from the migration.
