
## Iteration 5 — Real AoE4 Game Icons + Visual Polish (final)

### 1. New asset helper — `src/lib/assets.ts`
```ts
export const ASSET_BASE_URL = "https://rts-overlay.github.io/assets/aoe4/";
export const getAssetUrl = (path: string): string => `${ASSET_BASE_URL}${path}`;
```
Single switch-point so we can later swap to self-hosted assets.

### 2. `src/data/civs.ts` — add `flagIcon`
- Extend `Civ` type with `flagIcon: string` (path relative to `ASSET_BASE_URL`).
- Map all 22 civs to `civilization_flag/CivIcon-<Name>AoE4_spacing.png`:
  - english, french, hre (HRE), mongols, rus, chinese, delhi, abbasid, ottomans, malians, byzantines, japanese
  - ayyubids, zhu-xi (ZhuXiLegacy), jeanne-darc (JeanneDArc), order-of-the-dragon (OrderOfTheDragon), knights-templar (KnightsTemplar), house-of-lancaster (HouseOfLancaster), golden-horde (GoldenHorde)
- **Mark uncertain filenames with explicit TODO comments** so we don't lose track:
  - `macedonian` → `CivIcon-MacedoniansAoE4_spacing.png` // TODO: verify — may be MacedonianDynastyAoE4
  - `sengoku-daimyo` → `CivIcon-JapaneseAoE4_spacing.png` // TODO: placeholder, verify actual filename when available
  - `tughluqid` → `CivIcon-DelhiAoE4_spacing.png` // TODO: placeholder, verify actual filename when available
- All three fall back gracefully via `onError`. Existing `flagColor` retained for the gradient fallback.

### 3. `src/components/CivFlag.tsx` — real flag + prop-driven sizes
- **Add all three sizes in the same `SIZE_CLASSES` map** (prop-driven, not per-page overrides):
  ```ts
  const SIZE_CLASSES: Record<Size, string> = {
    sm: "h-10 w-10 text-sm",
    md: "h-16 w-16 text-lg",
    lg: "h-24 w-24 text-2xl",
  };
  ```
  And widen `Size = "sm" | "md" | "lg"`.
- Local `useState` `failed` flag. While `!failed && civ.flagIcon`, render `<img src={getAssetUrl(civ.flagIcon)} loading="lazy" alt={civ.name} className="h-full w-full object-contain p-1">` inside the existing brass-bordered container.
- `onError` → `setFailed(true)` → fall back to current gradient + initials block.
- Brass border + rounded square wrapper unchanged so layout stays identical.

### 4. `src/components/editor/ResourcePill.tsx` — real resource icons
- Per-resource icon path map: food/wood/gold/stone via `resource/resource_<name>.png`, oliveOil via `resource/olive_oil.png`.
- Replace the `<span>` colored dot with `<img className="h-4 w-4" loading="lazy">` for resources that have a path.
- Per-pill `failed` state; `onError` swaps back to existing colored dot. `builder` and `silver` keep colored dots (no map entry).

### 5. `src/components/editor/StepCard.tsx` — age icons + age-colored border
- `AGE_ICON: Record<1|2|3|4, string>` → `age/age_1.png` … `age/age_4.png`.
- Replace `SelectValue` text with a small wrapper rendering `<img src={getAssetUrl(AGE_ICON[step.age])} alt={AGE_LABELS[step.age].roman} className="h-5 w-5">` with onError fallback to roman numeral text.
- `SelectItem` rows render icon + roman numeral side by side (same fallback wrapper).
- **Age-colored left border**: `AGE_BORDER: Record<1|2|3|4, string>` (1 gray, 2 green, 3 blue, 4 brass/red); apply `border-l-4 border-l-<color>` to the root `Card` className alongside existing classes.

### 6. `src/pages/Index.tsx` — picker polish
- Subtle CSS-only diagonal texture on `<main>` via inline style:
  `backgroundImage: "repeating-linear-gradient(135deg, hsl(var(--foreground)/0.02) 0 1px, transparent 1px 8px)"`.
- Card hover gains brass glow: `hover:shadow-[0_0_24px_-6px_hsl(var(--primary)/0.4)]`.
- Append shared `<SiteFooter />`.

### 7. `src/pages/CivDetail.tsx` — polish
- Use `<CivFlag civ={civ} size="lg" />` in the header (relies on the prop-driven `lg` from §3 — no per-page override).
- Append shared `<SiteFooter />`.

### 8. New shared component — `src/components/SiteFooter.tsx`
Centered muted small-text block:
> "Age of Empires IV © Microsoft Corporation. Created under Microsoft's 'Game Content Usage Rules' using assets from Age of Empires IV. Not endorsed by or affiliated with Microsoft."

with link to `https://www.xbox.com/en-us/developers/rules`. Used by Index + CivDetail.

### 9. Global page transition — `src/index.css`
Add inside a `@media (prefers-reduced-motion: no-preference)` block:
```css
@keyframes page-fade {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: none; }
}
.page-enter { animation: page-fade 220ms ease-out; }
```
Apply `.page-enter` to the root `<main>` of Index, CivDetail, BuildOrderEditor, NewBuildOrder, BuildOrderPlaceholder.

### Out of scope
- DnD logic, `storage.ts`, `buildOrder.ts`, note handling — untouched.
- No image bundling/downloading; all assets hotlinked from `rts-overlay.github.io`.
- No Supabase/server.

### File summary
- **New**: `src/lib/assets.ts`, `src/components/SiteFooter.tsx`.
- **Edited**: `src/data/civs.ts`, `src/components/CivFlag.tsx`, `src/components/editor/ResourcePill.tsx`, `src/components/editor/StepCard.tsx`, `src/pages/Index.tsx`, `src/pages/CivDetail.tsx`, `src/index.css`, plus `.page-enter` added to the `<main>` of `BuildOrderEditor`, `NewBuildOrder`, `BuildOrderPlaceholder`.
