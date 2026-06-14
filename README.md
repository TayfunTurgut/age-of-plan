# Age of Plan

> Create, edit, import, export, and follow **Age of Empires IV** build orders step by step — in the browser, with a chrome-less overlay for a second monitor or your phone.

![Age of Plan](public/og-image.png)

**Live app: [ageofplan.com](https://ageofplan.com)**

Age of Plan is a fast, local-first build-order editor and overlay runner for AoE4. Your builds are stored in your browser — there is no server, no account, and no sign-up. Import builds from [aoe4guides.com](https://aoe4guides.com) or RTS_Overlay JSON, refine them in a drag-and-drop editor, then follow them step by step with a timed overlay while you play.

## Features

- **Build editor** — Compose build orders step by step with drag-and-drop reordering. Each step supports an age (Dark/Feudal/Castle/Imperial), resource allocation (including civ-specific resources like olive oil and silver), villager counts, timestamped notes with inline game-icon tokens, and unit placement tags. Changes autosave as you go.
- **Overlay runner** — A chrome-less, standalone view built for a second monitor or your phone. It auto-advances through steps on a timer, supports manual navigation and collapse/expand, and live-syncs theme and font size with the main window. (On desktop it opens as a chrome-less popup; phones and browsers that block popups get the same view in a regular tab.)
- **Library** — Browse, search, filter by civilization, and sort all your saved builds.
- **Import & export** — Import from the aoe4guides.com API, from RTS_Overlay JSON, and from native JSON. Export to native JSON (lossless) or to [RTS_Overlay](https://rts-overlay.github.io)-compatible JSON.
- **All 24 civilizations** — Every base civilization and variant, with game data and icons synced from aoe4guides.
- **Local-first** — Builds live in your browser's `localStorage`. No backend, no telemetry, no account required. Works offline.
- **Comfortable to read** — Light/dark theme and adjustable font size, persisted and synced across windows.

## Tech stack

- **UI:** React 18, React Router 7, Tailwind CSS, Radix UI, lucide-react
- **Build tooling:** Vite 7 (SWC), TypeScript
- **Interaction & forms:** dnd-kit (drag-and-drop), react-hook-form + Zod, TanStack Query, sonner
- **Testing:** Vitest (unit), Playwright + axe-core (e2e / accessibility)
- **Deployment:** Cloudflare Workers via Wrangler (static SPA)
- **Package manager:** [Bun](https://bun.sh)

## Getting started

### Prerequisites

- [Bun](https://bun.sh) (the project uses `bun.lock`)

### Install and run

```bash
bun install      # install dependencies
bun run dev      # start the Vite dev server
bun run build    # type-check and build for production
```

The dev server prints a local URL to open in your browser.

## Project scripts

| Script | Command | Description |
| --- | --- | --- |
| `dev` | `vite` | Start the local dev server |
| `build` | `tsc --noEmit && vite build` | Type-check, then build for production |
| `build:dev` | `vite build --mode development` | Build in development mode |
| `typecheck` | `tsc --noEmit` | Type-check without emitting |
| `lint` | `eslint .` | Lint the project |
| `test` | `vitest run` | Run unit tests once |
| `test:watch` | `vitest` | Run unit tests in watch mode |
| `test:e2e` | `playwright test --grep-invert @aoe4guides-smoke` | Run e2e tests (excludes import smoke) |
| `test:e2e:aoe4guides-smoke` | `playwright test --grep @aoe4guides-smoke` | Run the aoe4guides import smoke tests |
| `sync-data` | `bun run scripts/sync-aoe4-data.ts` | Sync AoE4 game data and icons |
| `preview` | `bun run build && wrangler dev` | Build and serve via a local Cloudflare Worker |
| `deploy` | `bun run build && wrangler deploy` | Build and deploy to Cloudflare Workers |

## Testing

```bash
bun run test                      # unit tests (Vitest)
bun run test:e2e                  # end-to-end tests (Playwright)
bun run test:e2e:aoe4guides-smoke # live aoe4guides import smoke tests
```

The `@aoe4guides-smoke` suite is separated because it hits the live aoe4guides.com API; the default `test:e2e` run excludes it.

## Syncing AoE4 game data

Civilization data and icons are generated from the [aoe4guides](https://github.com/aoe4guides) data set rather than hand-maintained.

```bash
AOE4GUIDES_REPO=../aoe4-guides bun run sync-data
```

- `AOE4GUIDES_REPO` points at a local checkout of the aoe4guides repository (defaults to `../aoe4-guides`).
- The sync regenerates `src/data/generated/*` and copies asset images into `public/aoe4/`.
- It is idempotent — existing assets are skipped, and the generated TypeScript files are always rewritten.

## Deployment

The app is deployed as a static single-page app on Cloudflare Workers (see `wrangler.jsonc`).

```bash
bun run preview   # build and run locally with `wrangler dev`
bun run deploy    # build and deploy with `wrangler deploy`
```

## Contributing

Contributions are welcome — open an issue to discuss a change, or send a pull request. Before submitting, please run:

```bash
bun run lint
bun run test
```

## Acknowledgements

- Build data and icons are sourced from **[aoe4guides.com](https://aoe4guides.com)**.
- Export/import interoperates with the **[RTS_Overlay](https://rts-overlay.github.io)** JSON format.

## Disclaimer

Age of Empires IV is a trademark of Microsoft Corporation and Relic Entertainment. Age of Plan is an unofficial, unaffiliated fan project and is not endorsed by or associated with Microsoft or Relic Entertainment.

## License

Released under the [MIT License](LICENSE).
