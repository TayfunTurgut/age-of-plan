import type { BuildOrder } from "@/types/buildOrder";

/**
 * localStorage abstraction for build orders.
 *
 * Layout: one key per build order — `aoe4bo:bo:<id>`. No separate index;
 * enumeration uses a prefix scan, which is fast enough for the realistic
 * scale (a few hundred entries at most) and avoids two-key sync bugs.
 */

const KEY_PREFIX = "aoe4bo:bo:";

const isBrowser = (): boolean => typeof window !== "undefined" && !!window.localStorage;

const keyFor = (id: string): string => `${KEY_PREFIX}${id}`;

const safeParse = (raw: string | null): BuildOrder | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BuildOrder;
    if (!parsed || typeof parsed !== "object" || typeof parsed.id !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
};

export const getAllBuildOrders = (): BuildOrder[] => {
  if (!isBrowser()) return [];
  const out: BuildOrder[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(KEY_PREFIX)) continue;
    const bo = safeParse(window.localStorage.getItem(key));
    if (bo) out.push(bo);
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
};

export const getBuildOrdersByCiv = (civId: string): BuildOrder[] =>
  getAllBuildOrders().filter((bo) => bo.civilization === civId);

export const getBuildOrder = (id: string): BuildOrder | null => {
  if (!isBrowser()) return null;
  return safeParse(window.localStorage.getItem(keyFor(id)));
};

export const saveBuildOrder = (bo: BuildOrder): void => {
  if (!isBrowser()) return;
  const next: BuildOrder = { ...bo, updatedAt: Date.now() };
  try {
    window.localStorage.setItem(keyFor(next.id), JSON.stringify(next));
  } catch {
    // Quota exceeded or storage unavailable — silently ignore for now.
  }
};

export const deleteBuildOrder = (id: string): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(keyFor(id));
  } catch {
    // ignore
  }
};

export const exportBuildOrder = (id: string): string => {
  const bo = getBuildOrder(id);
  if (!bo) return "";
  return JSON.stringify(bo, null, 2);
};
