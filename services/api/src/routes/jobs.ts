import type { FastifyInstance } from "fastify";
import type { AppDeps } from "../app";
import { BadRequestError, NotFoundError } from "../errors";
import { requireIdempotencyKey } from "../http";
import { withIdempotency } from "../idempotency";
import { createJobWithOutbox, findActiveJob } from "../jobs";
import { isUniqueViolation } from "../prismaErrors";
import { requireJobAccess, requireVideoAccess } from "../tenancy";

export function registerJobRoutes(app: FastifyInstance, deps: AppDeps): void {
  const { prisma, config, authenticator } = deps;

  // Create or reuse the active processing job for a video.
  app.post("/v1/videos/:videoId/processing-jobs", async (req, reply) => {
    const { authSubject } = await authenticator.authenticate(req);
    const { videoId } = req.params as { videoId: string };
    const access = await requireVideoAccess(prisma, authSubject, videoId);
    const key = requireIdempotencyKey(req);

    const result = await withIdempotency(
      prisma,
      { endpoint: "create-job", key, agencyId: access.agencyId, requestBody: req.body ?? {} },
      async () => {
        const video = await prisma.videoAsset.findUnique({ where: { id: videoId } });
        if (!video) throw new NotFoundError("video not found");
        if (video.status === "UPLOADING") throw new BadRequestError("video upload is not complete");

        const existing = await findActiveJob(prisma, videoId, config.pipelineVersion);
        if (existing) {
          return {
            status: 200,
            body: { processingJobId: existing.id, processingStatus: existing.status, reused: true },
          };
        }
        try {
          const jobId = await createJobWithOutbox(prisma, {
            videoId,
            agencyId: access.agencyId,
            workspaceId: access.workspaceId,
            userId: access.userId,
            pipelineVersion: config.pipelineVersion,
            sourceObjectKey: video.objectKey,
            sourceChecksum: video.checksumSha256 ?? undefined,
          });
          return { status: 201, body: { processingJobId: jobId, processingStatus: "QUEUED", reused: false } };
        } catch (err) {
          // Lost an active-job race: the partial unique index rejected us.
          if (isUniqueViolation(err)) {
            const now = await findActiveJob(prisma, videoId, config.pipelineVersion);
            if (now) {
              return {
                status: 200,
                body: { processingJobId: now.id, processingStatus: now.status, reused: true },
              };
            }
          }
          throw err;
        }
      },
    );
    return reply.code(result.status).send(result.body);
  });

  // Fetch current job state (polling).
  app.get("/v1/processing-jobs/:jobId", async (req) => {
    const { authSubject } = await authenticator.authenticate(req);
    const { jobId } = req.params as { jobId: string };
    const { job } = await requireJobAccess(prisma, authSubject, jobId);
    return {
      id: job.id,
      videoId: job.videoAssetId,
      status: job.status,
      pipelineVersion: job.pipelineVersion,
      cancellationRequested: job.cancellationRequested,
      lastError: job.lastErrorMessage ?? undefined,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  });
}
