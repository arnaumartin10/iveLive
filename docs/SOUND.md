# Cloud sound assets

Cloud sound is off by default. Add only royalty-free or CC0 recordings that are
cleared for redistribution in a mobile application. Keep the four files below
under **200 KB combined** and trim them to the indicated duration:

| Registry key | Add file                   | Direction                      | Target              |
| ------------ | -------------------------- | ------------------------------ | ------------------- |
| `stamp`      | `assets/sounds/stamp.mp3`  | A short, dry rubber-stamp thud | 60 KB, under 250 ms |
| `tick`       | `assets/sounds/tick.mp3`   | A soft paper tick              | 30 KB, under 100 ms |
| `whoosh`     | `assets/sounds/whoosh.mp3` | A brief page movement          | 60 KB, under 350 ms |
| `paper`      | `assets/sounds/paper.mp3`  | A light paper shuffle          | 40 KB, under 300 ms |

Keep the source and license information with the asset in the project's asset
inventory. Once files are added, register them in
`src/features/cloud/sounds.ts` and load their players lazily on the first
enabled sound request. Missing assets must remain a no-op. Do not play any
sound when the sound switch is off, Reduce Motion is enabled, or the device is
muted. The player does not enable playback in the iOS silent switch mode; keep
the platform's default audio mode so system mute behavior is preserved.
