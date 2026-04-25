/**
 * Re-exports the generated icon catalog. Keep this file thin — generation
 * happens in scripts/sync-aoe4-data.ts and the source of truth lives at
 * src/data/generated/icons.ts.
 */
export {
  ICON_CATALOG,
  ICON_CATEGORIES,
  getIconsForCiv,
  type IconCategory,
  type IconEntry,
} from "./generated/icons";
