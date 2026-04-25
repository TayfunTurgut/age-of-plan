# Local sync scripts

## `sync-aoe4-data.ts`

Pulls AoE4 game data and icons from
[aoe4world](https://data.aoe4world.com/) and the
[aoe4world/explorer](https://github.com/aoe4world/explorer) asset repo,
and regenerates everything the app's icon picker, civ list, and path
migrations depend on.

```bash
bun run sync-data
# or
npx tsx scripts/sync-aoe4-data.ts
```

### What it does

1. Fetches `units`, `buildings`, and `technologies` from
   `https://data.aoe4world.com/{kind}/all.json` (per-civ-per-age
   variations expanded — about 3,300 entries combined).
2. Downloads every distinct icon URL referenced by those entries to
   `public/aoe4/images/{units,buildings,technologies}/<id>.png`.
3. Downloads civ flags from `aoe4world/explorer/assets/flags/` to
   `public/aoe4/flags/<civ-id>.png` (filenames are our internal civ ids
   like `english`, `golden-horde`, `zhu-xi`).
4. Downloads resource icons (`food`, `wood`, `gold`, `stone`, `oliveoil`,
   `silver`, `popcap`, `time`) from `aoe4world/explorer/assets/resources/`
   to `public/aoe4/resources/<name>.png`.
5. Copies the four age icons from the previous mirror to
   `public/aoe4/ages/age_{1..4}.webp` (aoe4world doesn't ship age UI
   icons — these are the only assets we don't pull from there).
6. Generates three TypeScript files under `src/data/generated/`:
   - `icons.ts` — `IconEntry[]` + `getIconsForCiv(civId)` for the picker.
   - `civData.ts` — `CivData[]` with auto-generated taglines from each
     civ's unique units and first landmark.
   - `pathMigration.ts` — `Record<oldPath, newPath>` used by
     `storage.ts` to migrate `{{...}}` icon tokens in saved builds.
7. Writes `public/aoe4/manifest.json` with timestamps and source URLs
   for auditability.

### When to run it

- After cloning the repo (so the generated files and `public/aoe4/` are
  populated locally).
- When a new AoE4 patch ships and aoe4world publishes updated data.
- When civs/units/buildings shift (e.g. a new DLC civ).

Both `public/aoe4/` and `src/data/generated/` are committed to the repo
so the app builds straight from a fresh checkout without needing
network access.

### Idempotency

Re-running the script is safe: existing non-empty files are skipped.
Delete a file to force re-download.

### Civ codes

aoe4world uses 2-letter codes that don't always match our internal
civ ids. The mapping lives at the top of `sync-aoe4-data.ts` —
`CODE_TO_CIV`. If you see a `WARNING: unrecognized civ code`, add it
there.
