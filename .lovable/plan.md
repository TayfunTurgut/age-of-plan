## Iteration 7 — Import / Export (final, with civ name round-trip fix)

### 1. New: `src/lib/importRtsOverlay.ts`
- `CIV_DISPLAY_NAMES: Record<string, string>` — full 22-civ map from internal id → canonical RTS_Overlay display name:
  - `english → "English"`, `french → "French"`, `hre → "Holy Roman Empire"`, `mongols → "Mongols"`, `rus → "Rus"`, `chinese → "Chinese"`, `delhi → "Delhi Sultanate"`, `abbasid → "Abbasid Dynasty"`, `ottomans → "Ottomans"`, `malians → "Malians"`, `byzantines → "Byzantines"`, `japanese → "Japanese"`, `ayyubids → "Ayyubids"`, `zhu-xi → "Zhu Xi's Legacy"`, `jeanne-darc → "Jeanne d'Arc"`, `order-of-the-dragon → "Order of the Dragon"`, `knights-templar → "Knights Templar"`, `house-of-lancaster → "House of Lancaster"`, `golden-horde → "Golden Horde"`, `macedonian → "Macedonian Dynasty"`, `sengoku-daimyo → "Sengoku Daimyo"`, `tughluqid → "Tughluqid Dynasty"`. ASCII apostrophes used so import↔export round-trips through `normalizeCivId`'s apostrophe-stripping.
- `civIdToDisplayName(id: string): string` — lookup with fallback to raw id (so `"unknown"` and custom ids never throw).
- `normalizeCivId(rawCiv: string): string` — case-insensitive, diacritic + apostrophe-stripped match across the 22 civs and common aliases ("HRE"/"Holy Roman Empire", "Delhi"/"Delhi Sultanate", "Abbasid"/"Abbasid Dynasty", "Zhu Xi"/"Zhu Xi's Legacy", "Jeanne"/"Jeanne d'Arc", "Tughluqid"/"Tughluqid Dynasty"/"Tughlaq", "Macedonian"/"Macedonian Dynasty", etc.). Returns `"unknown"` on miss.
- `parseRtsOverlayJson(json: string): BuildOrder`:
  - `JSON.parse` in try/catch → throw `"Invalid JSON: <msg>"`.
  - Require top-level `build_order` array → else throw `"Missing build_order array."`
  - Map `name`, `civilization` (via `normalizeCivId`), `author`, `source`, `description`.
  - Per step: clamp `age` to 1..4 (default 1); `villager_count → villagerCount` (default 0); `population_count` (-1 → undefined); `resources` defaults each of `food/wood/gold/stone/builder` to 0, `oliveOil`/`silver` only when present and > 0; `time` string → `parseTime` (null → undefined); `notes: string[]` → `{id: crypto.randomUUID(), text}[]`.
  - Fresh UUIDs for the build and every step. `createdAt = updatedAt = Date.now()`.

### 2. New: `src/lib/importAoe4Guides.ts`
- `extractAoe4GuidesId(input: string): string | null` — trim; if input contains `aoe4guides.com`, match `/build/([A-Za-z0-9]{20})` and return capture; else if input matches `^[A-Za-z0-9]{20}$`, return it; else `null`.
- `fetchAoe4GuidesBuild(id: string): Promise<BuildOrder>`:
  - `fetch(\`https://aoe4guides.com/api/builds/${id}\`)` wrapped in try/catch.
  - On `TypeError` (network/CORS) → throw `"Could not fetch from aoe4guides.com — CORS may be blocked. Try pasting the build JSON directly instead."`
  - On `!res.ok`: 404 → `"Build not found on aoe4guides.com."`; other → `"aoe4guides.com returned an error (status ${status})."`
  - Defensive mapping with `?.`/`??`:
    - `name` ← `data.title ?? data.name ?? "Imported build"`.
    - `civilization` ← `normalizeCivId(data.civilization ?? data.civ ?? "")` (imported from `./importRtsOverlay`).
    - `author` ← `data.author ?? data.user?.name ?? ""`.
    - `description` ← `data.description ?? ""`.
    - `source` ← `https://aoe4guides.com/build/{id}`.
    - `steps` ← from `data.build_order ?? data.steps ?? []`. Per step: same shape as RTS_Overlay parser, but accept either `time` (string) or `time_seconds` (number); accept notes as either strings or `{text}` objects.
  - Fresh UUIDs throughout. `createdAt = updatedAt = Date.now()`.

### 3. New: `src/lib/exportBuildOrder.ts`
- Internal `triggerDownload(filename, contents, mime)` — `URL.createObjectURL(new Blob([contents], {type: mime}))`, temporary `<a download>` clicked and removed, `URL.revokeObjectURL` after.
- `safeFilename(name: string): string` → `name.replace(/[^a-zA-Z0-9_-]/g, "_") || "build_order"`.
- `exportAsJson(bo: BuildOrder): void` → `JSON.stringify(bo, null, 2)`, filename `${safe}.json`, mime `application/json`. Native schema preserved (lossless internal round-trip uses our internal civ ids).
- `exportAsRtsOverlay(bo: BuildOrder): void` → builds:
  - `name`
  - **`civilization: civIdToDisplayName(bo.civilization)`** ← the round-trip fix so rts-overlay.github.io recognizes the civ.
  - `author`, `source`, `description`.
  - `build_order: bo.steps.map(s => ({ age: s.age, villager_count: s.villagerCount, population_count: s.populationCount ?? -1, resources: { ...s.resources }, time: s.timeSeconds !== undefined ? formatTime(s.timeSeconds) : "", notes: s.notes.map(n => n.text) }))`.
  - Filename `${safe}_rts_overlay.json`.

### 4. New: `src/components/ImportModal.tsx`
- Props: `{ open: boolean; onOpenChange: (o: boolean) => void; presetCivId?: string }`.
- shadcn `Dialog` containing shadcn `Tabs` with values `"aoe4guides"` and `"json"`.
- **Tab 1 — aoe4guides**:
  - `Input` (controlled) for URL or build ID; placeholder "Paste aoe4guides.com URL or build ID".
  - `Button` "Import" — disabled while loading or empty. Click flow: `extractAoe4GuidesId` → if null, inline error "Couldn't parse a build ID from that input."; else `setLoading(true)`, `fetchAoe4GuidesBuild(id)`, then `applyImport(bo)`.
  - `Loader2` spinner + inline error region below the input.
- **Tab 2 — JSON**:
  - `Textarea` (controlled), placeholder "Paste RTS_Overlay or exported JSON here".
  - Dashed-border drop zone supporting both drag-and-drop (`onDragOver`/`onDrop`) and click-to-browse (hidden `<input type="file" accept=".json,application/json">`). Selected/dropped file is read via `FileReader.readAsText` and populates the textarea.
  - `Button` "Import": try `parseRtsOverlayJson(text)`. On failure, try `JSON.parse(text)` and accept it if it matches our native schema (object with `id` and an array `steps[]` whose entries each have an `id`); if matched, regenerate UUIDs for the build, every step, and every note, and stamp fresh `createdAt`/`updatedAt = Date.now()` to avoid localStorage collisions on re-import. Otherwise show the original parse error.
- `applyImport(bo)` shared:
  - If `presetCivId` provided → override `bo.civilization = presetCivId`.
  - Else if `bo.civilization === "unknown"` → sonner warning toast `"Could not detect civilization. Please set it manually after import."` and continue.
  - `saveBuildOrder(bo)` → `onOpenChange(false)` → `navigate(\`/build/${bo.id}/edit\`)`.
- Reset textarea / url / error / loading state when `open` flips to true.

### 5. Edited: `src/pages/CivDetail.tsx`
- Add `useState` `importOpen` and `ImportModal` import.
- Add a secondary `Button variant="outline" size="lg"` "Import Build Order" alongside the existing "New Build Order" CTA.
- Render `<ImportModal open={importOpen} onOpenChange={setImportOpen} presetCivId={civ.id} />` at the bottom of the page.

### 6. Edited: `src/pages/Index.tsx`
- Add `useState` `importOpen` and `ImportModal` import.
- Add a small `Button variant="outline" size="sm"` "Import" positioned `absolute right-6 top-6` so the centered hero stays centered. Wrap the page container in `relative` if not already.
- Render `<ImportModal open={importOpen} onOpenChange={setImportOpen} />` (no preset).

### 7. Edited: `src/pages/BuildOrderEditor.tsx`
- In the existing top action bar (next to "Preview Overlay"), append a `DropdownMenu`:
  - Trigger: `<Button variant="outline" size="sm"><Download className="h-4 w-4" /></Button>` (lucide `Download`).
  - Items: "Export JSON" → `exportAsJson(bo)`; "Export for RTS Overlay" → `exportAsRtsOverlay(bo)`.
- No other layout changes.

### 8. Edited: `src/pages/BuildOrderPlaceholder.tsx`
- Append the same `DropdownMenu` to the existing button row (after "Edit"). Disabled when `!bo`.

### Reuse / contracts
- `parseTime` / `formatTime` from `src/lib/time.ts`.
- `saveBuildOrder` from `src/lib/storage.ts` (no internal changes).
- `BuildOrder` / `BuildStep` / `Resources` from `src/types/buildOrder.ts`.
- shadcn `Dialog`, `Tabs`, `DropdownMenu`, `Textarea`, `Input`, `Button`, sonner — all already present.

### Out of scope
- DnD logic, runner/timer, `civs.ts`, `storage.ts` internals, visual theme.
- No CORS proxy, no server, no Supabase, no bundled assets.

### File summary
- **New**: `src/lib/importRtsOverlay.ts`, `src/lib/importAoe4Guides.ts`, `src/lib/exportBuildOrder.ts`, `src/components/ImportModal.tsx`.
- **Edited**: `src/pages/Index.tsx`, `src/pages/CivDetail.tsx`, `src/pages/BuildOrderEditor.tsx`, `src/pages/BuildOrderPlaceholder.tsx`.
