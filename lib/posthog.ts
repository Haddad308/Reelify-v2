/**
 * User IDs that should not be tracked in PostHog (e.g. internal/test accounts).
 * Set NEXT_PUBLIC_POSTHOG_EXCLUDED_USER_IDS (comma-separated) to add more.
 */

let cachedSet: Set<string> | null = null;

function getExcludedIds(): Set<string> {
  if (cachedSet) return cachedSet;
  const set = new Set<string>();
  const env = process.env.NEXT_PUBLIC_POSTHOG_EXCLUDED_USER_IDS;
  if (env && typeof env === "string") {
    env.split(",").forEach((id) => set.add(id.trim()));
  }
  cachedSet = set;
  return set;
}

export function isPostHogExcludedUserId(userId: string): boolean {
  if (!userId || typeof userId !== "string") return false;
  return getExcludedIds().has(userId.trim());
}
