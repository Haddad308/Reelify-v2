import { randomUUID } from "node:crypto";

/**
 * Prefixed, human-readable identifiers (e.g. `ag_ab12...`, `job_cd34...`).
 * The prefix aids debugging/log correlation; the body is a UUID with dashes
 * stripped. These may be supplied to Prisma explicitly (overriding the cuid
 * default) so IDs are consistent across API responses and logs.
 */
export const ID_PREFIXES = {
  agency: "ag",
  user: "usr",
  agencyUser: "au",
  workspace: "ws",
  membership: "wm",
  video: "vid",
  artifact: "art",
  job: "job",
  attempt: "att",
  transcript: "trs",
  scoringRun: "run",
  candidate: "clip",
  uploadSession: "ups",
  usageEvent: "ue",
  outbox: "obx",
} as const;

export type IdPrefix = (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES];

export function newId(prefix: IdPrefix): string {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}
