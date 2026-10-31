import { normalizePlayerTag } from "./player-tag";

const KEY = "rival-royale:recent-tags:v1";
const EVENT = "rival-recent-tags";
export function recentTagsSnapshot() {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
export function parseRecentTags(value: string): string[] {
  try {
    const raw: unknown = JSON.parse(value);
    return Array.isArray(raw)
      ? [
          ...new Set(
            raw
              .filter((tag): tag is string => typeof tag === "string")
              .map(normalizePlayerTag)
              .filter((tag): tag is string => tag !== null),
          ),
        ].slice(0, 5)
      : [];
  } catch {
    return [];
  }
}
export function rememberPlayerTag(value: string) {
  const tag = normalizePlayerTag(value);
  if (!tag) return;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(
        [
          tag,
          ...parseRecentTags(recentTagsSnapshot()).filter(
            (item) => item !== tag,
          ),
        ].slice(0, 5),
      ),
    );
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* Storage is optional. */
  }
}
export function clearRecentTags() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* Storage is optional. */
  }
}
export function subscribeRecentTags(listener: () => void) {
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
