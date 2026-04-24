
## Iteration 2 — Civ Picker, Civ Detail, Storage Layer (revised)

### 1. `src/data/civs.ts` — add taglines + flag colors
Extend the `Civ` type:
```ts
export type Civ = {
  id: string;
  name: string;
  variantOf?: string;
  tagline: string;        // 2–3 signature units/landmarks
  flagColor: string;      // CSS gradient stops for placeholder
};
```
- One tagline per civ (all 22), e.g. English `"Longbowman • Council Hall • Farm bonus"`, French `"Royal Knight • Chamber of Commerce • Trade bonus"`, Mongols `"Mangudai • Steppe Redoubt • Mobile bases"`.
- `flagColor`: two HSL stops per civ. Variants get a tinted version of their parent's stops.

### 2. `src/components/CivFlag.tsx` — placeholder flag
- Rounded square with 1px brass border + CSS gradient from civ's `flagColor`.
- Centered 1–2 letter initials in Cinzel.
- Sizes: `sm` (40px) and `md` (64px). No image assets.

### 3. `src/lib/storage.ts` — localStorage abstraction (no index key)
Key pattern: `aoe4bo:bo:<id>` — one key per build order. **No separate index.**
```ts
getAllBuildOrders(): BuildOrder[]
getBuildOrdersByCiv(civId: string): BuildOrder[]
getBuildOrder(id: string): BuildOrder | null
saveBuildOrder(bo: BuildOrder): void           // upserts, bumps updatedAt
deleteBuildOrder(id: string): void
exportBuildOrder(id: string): string           // pretty JSON
```
- Enumeration via `Object.keys(localStorage).filter(k => k.startsWith("aoe4bo:bo:"))`.
- All reads guarded with `try/catch` (corrupt JSON skipped, not thrown).
- `typeof window` guard for safety.
- No auth, Supabase, or network.

### 4. `src/pages/Index.tsx` — civ picker grid
- Header: "AoE4 Build Order Planner" (Cinzel gold) + subtitle "Choose a civilization".
- Responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
- Card per civ (shadcn `Card` wrapped in `<Link to={"/civ/" + id}>`):
  - `CivFlag` (md), civ name (Cinzel), variant parent label if any (muted), tagline (Cormorant, muted-foreground).
  - Hover: brass border + subtle lift.

### 5. `src/pages/CivDetail.tsx` — `/civ/:id`
- `useParams` → look up civ; unknown id renders "Civilization not found" + back link.
- Header: back link "← All civilizations", `CivFlag` md, civ name (Cinzel), variant parent label, tagline.
- Primary "New Build Order" button → `/build/new?civ=<id>`.
- "Saved build orders" section:
  - `getBuildOrdersByCiv(id)` on mount via `useState` + `useEffect`.
  - Empty state: muted card "No build orders yet. Create your first one."
  - Otherwise: list of cards (name, matchup, formatted updatedAt) wrapped in `<Link to={"/build/" + boId}>` + delete icon button (stops propagation, calls `deleteBuildOrder`, refreshes state).

### 6. `src/pages/NewBuildOrder.tsx` — `/build/new`
- `useSearchParams` reads `civ`; resolves civ name from `CIVS`.
- Shows: header "New Build Order — <Civ Name>", "Editor coming soon.", back link to `/civ/<id>`.

### 7. `src/pages/BuildOrderPlaceholder.tsx` — `/build/:id` (NEW)
- `useParams` reads `id`; loads via `getBuildOrder(id)`.
- Header: build name (or "Build order" fallback), civ name + matchup line.
- Body: "Viewer coming soon."
- Back link to the owning civ's detail page (or `/` if build not found).
- Prevents NotFound when clicking saved-build cards.

### 8. `src/App.tsx` — register routes
Above the catch-all:
```
<Route path="/civ/:id" element={<CivDetail />} />
<Route path="/build/new" element={<NewBuildOrder />} />
<Route path="/build/:id" element={<BuildOrderPlaceholder />} />
```

### Out of scope (next iterations)
- Build order editor (form, step list, drag-and-drop)
- `/build/:id` runner with timer (placeholder for now)
- Real flag/civ icons
- Importers (RTS_Overlay, aoe4guides)
- Search / filter on the civ grid
