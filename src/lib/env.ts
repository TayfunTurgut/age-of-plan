/** True when running in a browser DOM. False under SSR / vitest's node env. */
export const isBrowser = (): boolean =>
  typeof window !== "undefined" && typeof document !== "undefined";
