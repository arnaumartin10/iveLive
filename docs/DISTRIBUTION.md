# Distribution

## Internal preview

The `preview` EAS profile creates an internal build with the preview app
identity, preview channel, and preview environment. Configure its EAS
environment with the dedicated preview Supabase URL and anon key before
building. Do not copy production provider or service-role credentials into the
client.

```sh
npx eas-cli@latest build --profile preview --platform all
```

## Production

Production distribution remains blocked by the open items in
[RELEASE.md](./RELEASE.md). After they are resolved, use the production EAS
environment and verify the submitted binary's bundle/package identifiers,
OAuth redirect, privacy links, and deletion flow before release.

```sh
npx eas-cli@latest build --profile production --platform all
```

No build, submission, update, or deployment was started for this task.
