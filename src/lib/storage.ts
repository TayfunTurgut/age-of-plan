import { z } from "zod";

import { computeVillagerCount } from "@/lib/buildOrder";
import { isBrowser } from "@/lib/env";
import { NOTE_TOKEN_RE } from "@/lib/noteToken";
import type { BuildOrder } from "@/types/buildOrder";
import { PATH_MIGRATION } from "@/data/generated/pathMigration";

/**
 * localStorage abstraction for build orders — the ONLY module that touches
 * `localStorage` for build data.
 *
 * Layout: one key per build order, `aoe4bo:bo:<id>`. No separate index;
 * enumeration is a prefix scan (fast at the realistic scale of a few hundred
 * entries) which avoids two-key sync bugs.
 *
 * All access is wrapped to tolerate private-mode / sandboxed failures — storage
 * errors never propagate to the UI (except an explicit quota error on save).
 */

const KEY_PREFIX = "aoe4bo:bo:";

const keyFor = (id: string): string => `${KEY_PREFIX}${id}`;

const ResourcesSchema = z.object({
  food: z.number(),
  wood: z.number(),
  gold: z.number(),
  stone: z.number(),
  builder: z.number(),
  oliveOil: z.number().optional(),
  silver: z.number().optional(),
});

const NoteSchema = z.object({ id: z.string(), text: z.string() });

const TagSchema = z.object({
  id: z.string(),
  unit: z.string(),
  location: z.string(),
});

const BuildStepSchema = z.object({
  id: z.string(),
  age: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  villagerCount: z.number(),
  villagerCountManual: z.boolean().optional(),
  buildersUnknown: z.boolean().optional(),
  resources: ResourcesSchema,
  timeSeconds: z.number().optional(),
  prerequisite: z.string().optional(),
  notes: z.array(NoteSchema),
  tags: z.array(TagSchema).optional(),
});

const BuildOrderSchema = z.object({
  id: z.string(),
  name: z.string(),
  civilization: z.string(),
  matchup: z.string().optional(),
  author: z.string().optional(),
  source: z.string().optional(),
  description: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  steps: z.array(BuildStepSchema),
});

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/**
 * Apply a per-note text transform to a step's `notes` array. Returns the new
 * notes plus a `touched` flag. Returns `null` when `notes` isn't an array, so
 * the caller skips the migration for that step. Non-note-shaped entries pass
 * through untouched (final schema validation rejects truly invalid data).
 */
function transformNoteTexts(
  notes: unknown,
  guard: (text: string) => boolean,
  transform: (text: string) => string,
): { notes: unknown[]; touched: boolean } | null {
  if (!Array.isArray(notes)) return null;
  let touched = false;
  const out = notes.map((n) => {
    if (!isRecord(n) || typeof n.text !== "string" || !guard(n.text)) return n;
    const next = transform(n.text);
    if (next === n.text) return n;
    touched = true;
    return { ...n, text: next };
  });
  return { notes: out, touched };
}

/**
 * Migrate one stored step into the current shape without mutating the input.
 * Operates on `Record<string, unknown>` with explicit runtime narrowing (and
 * zod validation of `resources`) rather than unchecked casts.
 */
function migrateStep(stepRaw: unknown): { step: unknown; mutated: boolean } {
  if (!isRecord(stepRaw)) return { step: stepRaw, mutated: false };

  let step: Record<string, unknown> = stepRaw;
  let mutated = false;

  // 1. Legacy notes (string[]) → { id, text }[].
  if (
    Array.isArray(step.notes) &&
    step.notes.some((n) => typeof n === "string")
  ) {
    mutated = true;
    step = {
      ...step,
      notes: step.notes.map((n) =>
        typeof n === "string" ? { id: crypto.randomUUID(), text: n } : n,
      ),
    };
  }

  // 2. Legacy icon-token syntax: @path.ext@ → {{path.ext}}.
  const syntax = transformNoteTexts(
    step.notes,
    (t) => t.includes("@"),
    (t) => t.replace(/@([^@\s]+\.(?:png|webp))@/g, "{{$1}}"),
  );
  if (syntax?.touched) {
    mutated = true;
    step = { ...step, notes: syntax.notes };
  }

  // 3. Icon-token PATHS: old kebab/rts-overlay layout → new aoe4world paths.
  const paths = transformNoteTexts(
    step.notes,
    (t) => t.includes("{{"),
    (t) =>
      t.replace(NOTE_TOKEN_RE, (whole: string, oldPath: string) => {
        const newPath = PATH_MIGRATION[oldPath];
        return newPath ? `{{${newPath}}}` : whole;
      }),
  );
  if (paths?.touched) {
    mutated = true;
    step = { ...step, notes: paths.notes };
  }

  // 4. Default villagerCountManual when missing. Preserve hand-tuned counts
  //    from the pre-`villagerCountManual` schema by inferring `manual` when the
  //    stored count diverges from the resource sum — otherwise the recompute
  //    below would silently overwrite a user's manual count.
  const resources = ResourcesSchema.safeParse(step.resources);
  if (typeof step.villagerCountManual !== "boolean") {
    const count = step.villagerCount;
    const inferredManual =
      typeof count === "number" &&
      resources.success &&
      count !== computeVillagerCount(resources.data);
    mutated = true;
    step = { ...step, villagerCountManual: inferredManual };
  }

  // 5. In auto mode, recompute villagerCount to match the resource breakdown.
  if (step.villagerCountManual === false && resources.success) {
    const sum = computeVillagerCount(resources.data);
    if (step.villagerCount !== sum) {
      mutated = true;
      step = { ...step, villagerCount: sum };
    }
  }

  return { step, mutated };
}

function migrate(input: unknown): { value: unknown; mutated: boolean } {
  if (!isRecord(input) || !Array.isArray(input.steps)) {
    return { value: input, mutated: false };
  }
  let mutated = false;
  const nextSteps = input.steps.map((s) => {
    const result = migrateStep(s);
    if (result.mutated) mutated = true;
    return result.step;
  });
  if (!mutated) return { value: input, mutated: false };
  return { value: { ...input, steps: nextSteps }, mutated: true };
}

/**
 * Validate + migrate a parsed object into a canonical BuildOrder. Returns
 * `null` when the input doesn't match the schema (post-migration). Pure — does
 * not touch storage. `mutated` tells the caller whether re-persisting is worth it.
 */
export function parseStoredBuildOrder(
  input: unknown,
): { value: BuildOrder; mutated: boolean } | null {
  const { value: migrated, mutated } = migrate(input);
  const result = BuildOrderSchema.safeParse(migrated);
  if (!result.success) return null;
  return { value: result.data, mutated };
}

function readFromStorage(raw: string | null, sourceKey: string): BuildOrder | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.warn(
      `[storage] Could not parse build order at "${sourceKey}":`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }

  const validated = parseStoredBuildOrder(parsed);
  if (!validated) {
    console.warn(`[storage] Build order at "${sourceKey}" failed validation.`);
    return null;
  }

  if (validated.mutated && isBrowser()) {
    try {
      window.localStorage.setItem(sourceKey, JSON.stringify(validated.value));
    } catch {
      // Ignore quota/storage errors — the in-memory result is still valid.
    }
  }

  return validated.value;
}

export function getAllBuildOrders(): BuildOrder[] {
  if (!isBrowser()) return [];
  const out: BuildOrder[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(KEY_PREFIX)) continue;
    const bo = readFromStorage(window.localStorage.getItem(key), key);
    if (bo) out.push(bo);
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getBuildOrdersByCiv(civId: string): BuildOrder[] {
  return getAllBuildOrders().filter((bo) => bo.civilization === civId);
}

export function getBuildOrder(id: string): BuildOrder | null {
  if (!isBrowser()) return null;
  const key = keyFor(id);
  return readFromStorage(window.localStorage.getItem(key), key);
}

export class StorageQuotaError extends Error {
  constructor(message = "Could not save build — browser storage is full.") {
    super(message);
    this.name = "StorageQuotaError";
  }
}

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  // Chromium/Safari: "QuotaExceededError"; Firefox: "NS_ERROR_DOM_QUOTA_REACHED".
  return (
    err.name === "QuotaExceededError" ||
    err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    /quota/i.test(err.message)
  );
}

/** Persist a build order, stamping `updatedAt`. Throws StorageQuotaError when full. */
export function saveBuildOrder(bo: BuildOrder): void {
  if (!isBrowser()) return;
  const next: BuildOrder = { ...bo, updatedAt: Date.now() };
  const serialized = JSON.stringify(next);
  try {
    window.localStorage.setItem(keyFor(next.id), serialized);
  } catch (err) {
    if (isQuotaError(err)) throw new StorageQuotaError();
    throw err;
  }
}

export function deleteBuildOrder(id: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(keyFor(id));
  } catch {
    // Ignore storage errors.
  }
}

/** Pretty-printed native JSON for a stored build (used by the exporter in M6). */
export function exportBuildOrder(id: string): string {
  const bo = getBuildOrder(id);
  if (!bo) return "";
  return JSON.stringify(bo, null, 2);
}
