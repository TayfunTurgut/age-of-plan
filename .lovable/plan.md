## Iteration 8 — Library, Navigation, Theme Toggle (final)

### 1. New: `src/lib/relativeTime.ts`
- `formatRelativeTime(timestamp: number): string` with thresholds:
  - `< 60s` → `"just now"`
  - `< 60min` → `"X min ago"` (singular `"1 min ago"`)
  - `< 24h` → `"X hours ago"` (singular `"1 hour ago"`)
  - `< 48h` → `"yesterday"`
  - `< 30d` → `"X days ago"`
  - else → `new Date(ts).toLocaleDateString()`
- Pure function. No deps.

### 2. New: `src/lib/theme.ts`
- Storage key constant `THEME_KEY = "aoe4bo:theme"`, class constant `DARK_CLASS = "dark"`.
- `getTheme(): "dark" | "light"`:
  - If `localStorage[THEME_KEY]` is `"light"` or `"dark"` → return it.
  - Else, fallback to `document.documentElement.classList.contains(DARK_CLASS) ? "dark" : "light"` so the inline bootstrap script in `index.html` is the authoritative source on first load.
  - SSR-guarded with `typeof window !== "undefined"` (returns `"dark"` if not).
- `setTheme(t: "dark" | "light"): void` → writes to localStorage in try/catch; toggles `DARK_CLASS` on `document.documentElement`.
- `toggleTheme(): "dark" | "light"` → flips current theme, calls `setTheme`, returns new value.

### 3. New: `src/hooks/useTheme.ts`
- `useTheme()` returns `{ theme, toggleTheme }`.
- `useState` initialized via `getTheme()`; `useEffect` on mount calls `setTheme(theme)` once as a safety net (idempotent if class already correct).
- `toggleTheme` wraps `theme.toggleTheme()` and updates state.

### 3.5. Edited: `index.html` — blocking inline theme script (flash fix)
Insert immediately **before** the existing `<script type="module" src="/src/main.tsx">` line in `<body>`:
```html
<script>
  try {
    var t = localStorage.getItem("aoe4bo:theme");
    if (t === "light") document.documentElement.classList.remove("dark");
    else document.documentElement.classList.add("dark");
  } catch (e) {}
</script>
```
- Synchronous, runs before bundle paints → zero flash.
- `var` + `try/catch` for max compatibility (private mode quirks, sandboxed iframes).
- Default branch adds `dark` so first-time visitors get the medieval dark theme on first paint.
- Storage key string is duplicated here intentionally (must run before any module loads); `src/lib/theme.ts` remains the single source of truth in app code.

### 4. New: `src/components/NavBar.tsx`
- Sticky `<header class="sticky top-0 z-40 h-12 border-b bg-background/95 backdrop-blur">`.
- Left: `<Link to="/">AoE4 Build Order Planner</Link>` in Cinzel, brass color, `truncate` on mobile.
- Right (flex gap-2): `<NavLink to="/library">Library</NavLink>`, theme toggle button (`<Button variant="ghost" size="icon">` with lucide `Sun` when `theme === "dark"`, `Moon` when `"light"`, `aria-label="Toggle theme"`) calling `toggleTheme()`.
- Reuses existing `NavLink` component if its API matches; else inline `<Link>` with active styling.

### 5. New: `src/components/AppLayout.tsx`
- Imports `NavBar`, `Outlet` from `react-router-dom`.
- `useEffect` on mount: `setTheme(getTheme())` (safety net beyond the inline script).
- Renders:
  ```tsx
  <div className="min-h-screen flex flex-col">
    <NavBar />
    <main className="flex-1"><Outlet /></main>
  </div>
  ```
- `SiteFooter` stays inside individual pages (Library, Index) so the runner's existing layout isn't disturbed; this matches the current pattern.

### 6. Edited: `src/App.tsx`
Restructure routes to nest under the layout, leaving the runner standalone:
```tsx
<Route element={<AppLayout />}>
  <Route path="/" element={<Index />} />
  <Route path="/library" element={<Library />} />
  <Route path="/civ/:id" element={<CivDetail />} />
  <Route path="/build/new" element={<NewBuildOrder />} />
  <Route path="/build/:id" element={<BuildOrderPlaceholder />} />
  <Route path="/build/:id/edit" element={<BuildOrderEditor />} />
</Route>
<Route path="/build/:id/run" element={<BuildOrderRunner />} />
<Route path="*" element={<NotFound />} />
```
No change to `QueryClientProvider`, `TooltipProvider`, or toaster wrappers.

### 7. New: `src/pages/Library.tsx`
- Calls `getAllBuildOrders()` from `@/lib/storage` (corrected name — matches existing API, no duplicate function).
- Header: Cinzel gold "Build Order Library" + count `<Badge>{builds.length} builds</Badge>`.
- Toolbar row (flex flex-wrap gap-2):
  - `Input` search (controlled, local state) — debounced 300ms via `useEffect` + `setTimeout`/`clearTimeout` into a separate `debouncedQuery` state. Filter substring (case-insensitive) over `name`, `author`, `matchup`, `description`.
  - `Select` civ filter — option `"all"` (default) plus all 22 civs from `CIVS` in `@/data/civs`. Each option label shows `<CivFlag size="sm" />` + civ name.
  - `Select` sort — `"updated"` (default), `"name-asc"`, `"name-desc"`, `"created-desc"`, `"created-asc"`. Sorted via `useMemo`.
  - `Button variant="outline" size="sm"` "Import" → opens `ImportModal` (no preset civ).
- Results: responsive grid `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`. Card extracted as a small inline `BuildCard` component (also reused by §9):
  - Top row: `<CivFlag size="sm" />` + civ name (muted, small).
  - Build name in Cinzel, `line-clamp-2`.
  - Optional matchup pill (`<Badge variant="secondary" className="text-xs">`).
  - Optional author (muted small).
  - `formatRelativeTime(bo.updatedAt)` prefixed with "Edited ".
  - Action icons row revealed via `opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition`: Edit (`Pencil` → `navigate(\`/build/${id}/edit\`)`), Open Overlay (`Play` → `window.open(\`/build/${id}/run\`, "_blank")`), Delete (`Trash2` → `window.confirm("Delete this build?")` → `deleteBuildOrder(id)` → refresh local list state). All icons are `<Button variant="ghost" size="icon">` with `aria-label`s. `e.stopPropagation()` on each so card click still navigates to view.
  - Card itself is a `<button>` or `<div role="button" onClick>` → `navigate(\`/build/${id}\`)`.
- Empty states:
  - No builds at all: "No build orders saved yet." with text links "Create one" (`/`) and "Import" (opens modal).
  - Filters return zero: "No builds match your filters." with a "Clear filters" button.
- Reads list from local state seeded by `getAllBuildOrders()`; refresh after delete/import. Listens to `storage` events (`window.addEventListener("storage", refresh)`) to stay in sync across tabs (cheap, defensive).
- Renders `SiteFooter` at the bottom.
- Renders `ImportModal` at root of page; opening triggered from toolbar button.

### 8. Edited: `src/pages/CivDetail.tsx`
- Replace existing build list rendering with the same `BuildCard` shape as Library (extract to `src/components/library/BuildCard.tsx` so both pages share it — keeps Library and CivDetail in lockstep).
- Add the same sort `Select` (defaulting to `"updated"`).
- Keep existing "New Build Order" and "Import Build Order" buttons; do not change the page header layout.
- Continue calling `getBuildOrdersByCiv(civ.id)` (existing API). Sort via `useMemo` over the result.

### 9. Edited: `src/pages/Index.tsx`
- Remove the absolute-positioned "Import" button added in Iteration 7 (now lives in NavBar's Library link + Library page toolbar).
- Below the civ grid subtitle, add a small flex row of text links: `<Link to="/library">Browse Library</Link>` + `<button onClick={openImport}>or import a build</button>`.
- Keep `ImportModal` instance on this page wired to the new text-link trigger.

### 10. Edited: `src/index.css` — light mode palette
- Move existing dark medieval palette tokens into `.dark { ... }` block.
- Add `:root { ... }` light palette inverting key tokens while keeping the medieval feel:
  - `--background`: parchment cream (e.g. `40 35% 92%`)
  - `--foreground`: dark slate (e.g. `30 15% 18%`)
  - `--card`: slightly warmer cream
  - `--border`: muted brass-tinted neutral
  - `--muted` / `--muted-foreground`: warm beige / dim slate
  - `--primary`: brass/gold (kept consistent across modes — the brand accent)
  - `--primary-foreground`: dark slate for contrast on brass
  - `--accent`, `--secondary`, `--destructive`, `--ring`: adjust analogously
- Do not change Tailwind config or font tokens — Cinzel headings remain in both modes.
- Verify existing components reading these tokens (cards, badges, inputs) render legibly in both modes; no per-component dark/light overrides needed.

### Reuse / contracts (verified against current code)
- `getAllBuildOrders`, `getBuildOrdersByCiv`, `getBuildOrder`, `deleteBuildOrder` from `src/lib/storage.ts` — names match exactly. **No `loadAllBuildOrders` reference anywhere.**
- `BuildOrder` from `src/types/buildOrder.ts`.
- `CIVS` and per-civ records from `src/data/civs.ts`.
- `CivFlag` from `src/components/CivFlag.tsx`.
- `ImportModal` from `src/components/ImportModal.tsx` (Iteration 7).
- `SiteFooter` from `src/components/SiteFooter.tsx`.
- shadcn `Button`, `Input`, `Select`, `Badge`, `Card` — all already installed.
- lucide `Sun`, `Moon`, `Pencil`, `Play`, `Trash2`, `Search` — already used elsewhere or available.

### Out of scope
- DnD, runner/timer logic, import/export internals, `storage.ts` internals, `civs.ts`, `buildOrder.ts`, note rendering.
- No Supabase, no server, no bundled assets, no router upgrade.

### File summary
- **New**: `src/pages/Library.tsx`, `src/components/NavBar.tsx`, `src/components/AppLayout.tsx`, `src/components/library/BuildCard.tsx`, `src/lib/relativeTime.ts`, `src/lib/theme.ts`, `src/hooks/useTheme.ts`.
- **Edited**: `index.html` (inline theme script), `src/App.tsx` (layout route + `/library`), `src/pages/Index.tsx` (remove absolute Import, add library/import text links), `src/pages/CivDetail.tsx` (shared `BuildCard` + sort), `src/index.css` (light palette + move dark to `.dark`).
