# Alpha performance checks

No representative device or production web build was available for measuring
startup time, memory, frame rate, or bundle download time. Do not treat
unmeasured budgets as passing.

Before release, record cold-start time, primary-tab interaction responsiveness,
feed scroll frame drops, media upload time, and web compressed bundle size on a
low-tier supported device and a throttled browser. Keep the report free of
account identifiers and private user content.

The web export must retain the CanvasKit asset used by React Native Skia.
`npm run build:web` performs the copy before Expo export; verify the generated
`dist/_expo/static/js/web/canvaskit.wasm` is served successfully in the
deployment preview.
