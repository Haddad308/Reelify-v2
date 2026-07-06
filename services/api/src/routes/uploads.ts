import { ID_PREFIXES, newId } from "@reelify/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppDeps } from "../app";
import { BadRequestError, NotFoundError } from "../errors";
import { requireIdempotencyKey } from "../http";
import { withIdempotency } from "../idempotency";
import { enqueueJobInTx } from "../jobs";
import { extFromFilename, sourceObjectKey } from "../objectKeys";
import { requireWorkspaceAccess } from "../tenancy";
import { parseBody } from "../validate";

const CreateUploadSessionBody = z.object({
  filename: z.string().min(1),
  contentType: z.string().optional(),
  sizeBytes: z.number().int().positive().optional(),
  sha256: z.string().optional(),
});

const GeneratePartsBody = z.object({
  partNumbers: z.array(z.number().int().min(1).max(10000)).min(1).max(1000),
});

const CompleteUploadBody = z.object({
  parts: z.array(z.object({ partNumber: z.number().int().min(1), etag: z.string().min(1) })).min(1),
});

export function registerUploadRoutes(app: FastifyInstance, deps: AppDeps): void {
  const { prisma, storage, config, authenticator } = deps;

  // Start a multipart upload session.
  app.post("/v1/workspaces/:workspaceId/upload-sessions", async (req, reply) => {
    const { authSubject } = await authenticator.authenticate(req);
    const { workspaceId } = req.params as { workspaceId: string };
    const access = await requireWorkspaceAccess(prisma, authSubject, workspaceId);
    const key = requireIdempotencyKey(req);
    const body = parseBody(CreateUploadSessionBody, req.body);

    const result = await withIdempotency(
      prisma,
      { endpoint: "create-upload-session", key, agencyId: access.agencyId, requestBody: body },
      async () => {
        const bucket = config.mediaBuckets[access.dataRegion];
        if (!bucket) throw new BadRequestError(`no bucket configured for data_region '${access.dataRegion}'`);

        const videoId = newId(ID_PREFIXES.video);
        const objectKey = sourceObjectKey(
          access.agencyId,
          workspaceId,
          videoId,
          extFromFilename(body.filename),
        );

        await prisma.videoAsset.create({
          data: {
            id: videoId,
            agencyId: access.agencyId,
            workspaceId,
            bucket,
            objectKey,
            sizeBytes: body.sizeBytes ? BigInt(body.sizeBytes) : null,
            checksumSha256: body.sha256 ?? null,
            status: "UPLOADING",
          },
        });

        const uploadId = await storage.createMultipartUpload(bucket, objectKey, body.contentType);
        const expiresAt = new Date(Date.now() + config.uploadUrlTtlSeconds * 1000);

        const session = await prisma.uploadSession.create({
          data: {
            videoAssetId: videoId,
            agencyId: access.agencyId,
            workspaceId,
            bucket,
            objectKey,
            multipartUploadId: uploadId,
            partSizeBytes: config.partSizeBytes,
            status: "PENDING",
            expiresAt,
          },
        });

        return {
          status: 201,
          body: {
            uploadSessionId: session.id,
            videoId,
            multipartUploadId: uploadId,
            partSizeBytes: config.partSizeBytes,
            objectKey,
            expiresAt: expiresAt.toISOString(),
          },
        };
      },
    );
    return reply.code(result.status).send(result.body);
  });

  // Presign a batch of part-upload URLs.
  app.post("/v1/upload-sessions/:id/parts", async (req, reply) => {
    const { authSubject } = await authenticator.authenticate(req);
    const { id } = req.params as { id: string };
    const session = await prisma.uploadSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundError("upload session not found");
    await requireWorkspaceAccess(prisma, authSubject, session.workspaceId);
    const body = parseBody(GeneratePartsBody, req.body);

    const parts = await Promise.all(
      body.partNumbers.map(async (n) => ({
        partNumber: n,
        url: await storage.presignUploadPart(session.bucket, session.objectKey, session.multipartUploadId, n),
      })),
    );
    return reply.send({ parts, expiresInSeconds: config.uploadUrlTtlSeconds });
  });

  // Complete the upload and enqueue processing (job + attempt + outbox in one tx).
  app.post("/v1/upload-sessions/:id/complete", async (req, reply) => {
    const { authSubject } = await authenticator.authenticate(req);
    const { id } = req.params as { id: string };
    const session = await prisma.uploadSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundError("upload session not found");
    const access = await requireWorkspaceAccess(prisma, authSubject, session.workspaceId);
    const key = requireIdempotencyKey(req);
    const body = parseBody(CompleteUploadBody, req.body);

    const result = await withIdempotency(
      prisma,
      { endpoint: "complete-upload", key, agencyId: access.agencyId, requestBody: body },
      async () => {
        const video = await prisma.videoAsset.findUnique({ where: { id: session.videoAssetId } });
        if (!video) throw new NotFoundError("video not found");

        const completion = await storage.completeMultipartUpload(
          session.bucket,
          session.objectKey,
          session.multipartUploadId,
          body.parts,
        );

        const jobId = await prisma.$transaction(async (tx) => {
          await tx.videoAsset.update({
            where: { id: video.id },
            data: { status: "UPLOADED", objectVersion: completion.versionId ?? null },
          });
          await tx.uploadSession.update({ where: { id: session.id }, data: { status: "COMPLETED" } });
          return enqueueJobInTx(tx, {
            videoId: video.id,
            agencyId: access.agencyId,
            workspaceId: access.workspaceId,
            userId: access.userId,
            pipelineVersion: config.pipelineVersion,
            sourceObjectKey: video.objectKey,
            sourceChecksum: video.checksumSha256 ?? undefined,
          });
        });

        return {
          status: 200,
          body: {
            videoId: video.id,
            status: "UPLOADED",
            processingJobId: jobId,
            processingStatus: "QUEUED",
          },
        };
      },
    );
    return reply.code(result.status).send(result.body);
  });
}
