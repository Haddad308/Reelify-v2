import type { FastifyInstance } from "fastify";
import type { AppDeps } from "../app";
import { requireVideoAccess, requireWorkspaceAccess } from "../tenancy";

export function registerVideoRoutes(app: FastifyInstance, deps: AppDeps): void {
  const { prisma, authenticator } = deps;

  // List videos in a workspace.
  app.get("/v1/workspaces/:workspaceId/videos", async (req) => {
    const { authSubject } = await authenticator.authenticate(req);
    const { workspaceId } = req.params as { workspaceId: string };
    await requireWorkspaceAccess(prisma, authSubject, workspaceId);
    const videos = await prisma.videoAsset.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        status: true,
        objectKey: true,
        sizeBytes: true,
        durationMs: true,
        createdAt: true,
      },
    });
    return {
      videos: videos.map((v) => ({
        id: v.id,
        status: v.status,
        sizeBytes: v.sizeBytes ? Number(v.sizeBytes) : null,
        durationMs: v.durationMs,
        createdAt: v.createdAt.toISOString(),
      })),
    };
  });

  // Latest transcript for a video (metadata + text; words fetched separately if needed).
  app.get("/v1/videos/:videoId/transcript", async (req, reply) => {
    const { authSubject } = await authenticator.authenticate(req);
    const { videoId } = req.params as { videoId: string };
    await requireVideoAccess(prisma, authSubject, videoId);
    const transcript = await prisma.transcript.findFirst({
      where: { videoAssetId: videoId },
      orderBy: { createdAt: "desc" },
    });
    if (!transcript) return reply.code(404).send({ error: "not_found", message: "no transcript yet" });
    const wordCount = await prisma.transcriptWord.count({ where: { transcriptId: transcript.id } });
    return {
      id: transcript.id,
      provider: transcript.provider,
      model: transcript.providerModel,
      language: transcript.language,
      durationMs: transcript.durationMs,
      wordCount,
      text: transcript.text,
    };
  });

  // Scored clip candidates for a video (latest by rank).
  app.get("/v1/videos/:videoId/clip-candidates", async (req) => {
    const { authSubject } = await authenticator.authenticate(req);
    const { videoId } = req.params as { videoId: string };
    await requireVideoAccess(prisma, authSubject, videoId);
    const transcripts = await prisma.transcript.findMany({
      where: { videoAssetId: videoId },
      select: { id: true },
    });
    const transcriptIds = transcripts.map((t) => t.id);
    const candidates =
      transcriptIds.length === 0
        ? []
        : await prisma.clipCandidate.findMany({
            where: { transcriptId: { in: transcriptIds } },
            orderBy: { rank: "asc" },
          });
    return {
      candidates: candidates.map((c) => ({
        id: c.id,
        rank: c.rank,
        score: c.score,
        startMs: c.startMs,
        endMs: c.endMs,
        durationMs: c.durationMs,
        title: c.title,
        category: c.reason,
      })),
    };
  });
}
