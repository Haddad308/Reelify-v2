/**
 * Tenant-scoped S3 object keys (plan §11). Keys are generated server-side and
 * are NEVER used as the authorization check. Prefixes match the storage
 * module's lifecycle rules (`originals/` tiers to cheap storage, `audio/`
 * expires).
 */

function sanitizeExt(ext: string): string {
  const cleaned = ext.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return cleaned || "bin";
}

export function sourceObjectKey(
  agencyId: string,
  workspaceId: string,
  videoId: string,
  ext = "mp4",
): string {
  return `originals/${agencyId}/${workspaceId}/${videoId}/original.${sanitizeExt(ext)}`;
}

export function audioObjectKey(
  agencyId: string,
  workspaceId: string,
  videoId: string,
  ext: string,
): string {
  return `audio/${agencyId}/${workspaceId}/${videoId}/audio.${sanitizeExt(ext)}`;
}

/** Derive a file extension from a filename, defaulting to mp4. */
export function extFromFilename(filename: string | undefined): string {
  if (!filename) return "mp4";
  const match = /\.([a-zA-Z0-9]+)$/.exec(filename);
  return match?.[1] ? match[1].toLowerCase() : "mp4";
}
