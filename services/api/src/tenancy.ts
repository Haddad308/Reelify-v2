import type { PrismaClient, ProcessingJob } from "@reelify/db";
import { ForbiddenError, NotFoundError } from "./errors";

/**
 * Application authorization (plan §11, layers 2–3). After identity is verified,
 * confirm the user belongs to the agency/workspace referenced by the request.
 * The agency's immutable data_region is returned so callers can resolve the
 * bucket server-side.
 */
export interface WorkspaceAccess {
  userId: string;
  agencyId: string;
  workspaceId: string;
  dataRegion: string;
}

async function requireUserId(prisma: PrismaClient, authSubject: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { authSubject }, select: { id: true } });
  if (!user) throw new ForbiddenError("user is not provisioned");
  return user.id;
}

export async function requireWorkspaceAccess(
  prisma: PrismaClient,
  authSubject: string,
  workspaceId: string,
): Promise<WorkspaceAccess> {
  const userId = await requireUserId(prisma, authSubject);

  const workspace = await prisma.workspace.findFirst({ where: { id: workspaceId, deletedAt: null } });
  if (!workspace) throw new NotFoundError("workspace not found");

  const agency = await prisma.agency.findUnique({ where: { id: workspace.agencyId } });
  if (!agency) throw new NotFoundError("agency not found");

  const [membership, agencyUser] = await Promise.all([
    prisma.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    }),
    prisma.agencyUser.findUnique({
      where: { agencyId_userId: { agencyId: agency.id, userId } },
    }),
  ]);
  if (!membership && !agencyUser) throw new ForbiddenError("not a member of this workspace");

  return { userId, agencyId: agency.id, workspaceId, dataRegion: agency.dataRegion };
}

export async function requireVideoAccess(
  prisma: PrismaClient,
  authSubject: string,
  videoId: string,
): Promise<WorkspaceAccess & { videoId: string }> {
  const video = await prisma.videoAsset.findFirst({ where: { id: videoId, deletedAt: null } });
  if (!video) throw new NotFoundError("video not found");
  const access = await requireWorkspaceAccess(prisma, authSubject, video.workspaceId);
  return { ...access, videoId };
}

export async function requireJobAccess(
  prisma: PrismaClient,
  authSubject: string,
  jobId: string,
): Promise<WorkspaceAccess & { job: ProcessingJob }> {
  const job = await prisma.processingJob.findUnique({ where: { id: jobId } });
  if (!job) throw new NotFoundError("job not found");
  const access = await requireWorkspaceAccess(prisma, authSubject, job.workspaceId);
  return { ...access, job };
}
