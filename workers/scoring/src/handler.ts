import type { getPrismaClient, Prisma } from "@reelify/db";
import {
  type ClipScoringProvider,
  ID_PREFIXES,
  isUniqueViolation,
  type Logger,
  newId,
  ScoreClipsMessage,
} from "@reelify/shared";
import type { ScoringWorkerConfig } from "./config";
import { groupWordsIntoSegments } from "./segments";

const TERMINAL = ["COMPLETED", "FAILED", "CANCELLED", "DELETED"];

export interface HandlerDeps {
  config: ScoringWorkerConfig;
  prisma: ReturnType<typeof getPrismaClient>;
  provider: ClipScoringProvider;
  logger: Logger;
}

/** SCORE_CLIPS handler: load transcript -> Gemini -> persist run + candidates -> job COMPLETED. */
export function createScoreClipsHandler(deps: HandlerDeps) {
  const { prisma, provider, config } = deps;

  return async function handle(body: string): Promise<void> {
    const msg = ScoreClipsMessage.parse(JSON.parse(body));
    const log = deps.logger.child({ jobId: msg.jobId, agencyId: msg.agencyId, stage: "SCORE_CLIPS" });

    const attempt = await prisma.processingJobAttempt.findUnique({ where: { id: msg.attemptId } });
    if (attempt && ["SUCCEEDED", "CANCELLED"].includes(attempt.status)) {
      log.info("attempt already terminal; skipping");
      return;
    }
    const job = await prisma.processingJob.findUnique({ where: { id: msg.jobId } });
    if (!job || TERMINAL.includes(job.status)) return;
    if (job.cancellationRequested) {
      await prisma.processingJobAttempt.update({
        where: { id: msg.attemptId },
        data: { status: "CANCELLED", finishedAt: new Date() },
      });
      await prisma.processingJob.update({ where: { id: msg.jobId }, data: { status: "CANCELLED" } });
      return;
    }

    // Idempotency: reuse an equivalent scoring run if one already exists.
    let run = await prisma.clipScoringRun.findFirst({
      where: {
        transcriptId: msg.transcriptId,
        provider: provider.provider,
        model: provider.model,
        promptVersion: provider.promptVersion,
        outputSchemaVersion: provider.outputSchemaVersion,
      },
    });

    if (!run) {
      const transcript = await prisma.transcript.findUnique({ where: { id: msg.transcriptId } });
      if (!transcript) throw new Error("transcript not found");
      const words = await prisma.transcriptWord.findMany({
        where: { transcriptId: msg.transcriptId },
        orderBy: { sequence: "asc" },
        select: { text: true, startMs: true, endMs: true },
      });
      const segments = groupWordsIntoSegments(words);
      const videoDurationSec = transcript.durationMs ? transcript.durationMs / 1000 : undefined;

      const result = await provider.score({
        segments,
        options: { outputLanguage: config.outputLanguage, videoDurationSec },
      });
      const runId = newId(ID_PREFIXES.scoringRun);

      try {
        run = await prisma.$transaction(async (tx) => {
          const created = await tx.clipScoringRun.create({
            data: {
              id: runId,
              transcriptId: msg.transcriptId,
              agencyId: msg.agencyId,
              provider: provider.provider,
              model: result.model,
              promptVersion: result.promptVersion,
              outputSchemaVersion: result.outputSchemaVersion,
              responseMeta: result.tokenUsage
                ? ({ tokenUsage: result.tokenUsage } as unknown as Prisma.InputJsonValue)
                : undefined,
            },
          });
          if (result.candidates.length > 0) {
            await tx.clipCandidate.createMany({
              data: result.candidates.map((c) => ({
                scoringRunId: created.id,
                transcriptId: msg.transcriptId,
                agencyId: msg.agencyId,
                startMs: Math.round(c.startSec * 1000),
                endMs: Math.round(c.endSec * 1000),
                durationMs: Math.round(c.durationSec * 1000),
                score: c.score ?? 0,
                rank: c.rank,
                title: c.title,
                reason: c.category,
              })),
            });
          }
          if (result.tokenUsage) {
            await tx.usageEvent.createMany({
              data: [
                {
                  agencyId: msg.agencyId,
                  workspaceId: msg.workspaceId,
                  videoAssetId: msg.videoAssetId,
                  jobId: msg.jobId,
                  stage: "SCORE_CLIPS",
                  unit: "GEMINI_INPUT_TOKEN",
                  quantity: result.tokenUsage.tokensInput,
                },
                {
                  agencyId: msg.agencyId,
                  workspaceId: msg.workspaceId,
                  videoAssetId: msg.videoAssetId,
                  jobId: msg.jobId,
                  stage: "SCORE_CLIPS",
                  unit: "GEMINI_OUTPUT_TOKEN",
                  quantity: result.tokenUsage.tokensOutput,
                },
              ],
            });
          }
          return created;
        });
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        run = await prisma.clipScoringRun.findFirst({
          where: {
            transcriptId: msg.transcriptId,
            provider: provider.provider,
            model: provider.model,
            promptVersion: provider.promptVersion,
            outputSchemaVersion: provider.outputSchemaVersion,
          },
        });
      }
    } else {
      log.info("reusing existing scoring run");
    }

    if (!run) throw new Error("scoring run unexpectedly missing after persistence");

    // Terminal stage: complete the job and mark the video READY.
    await prisma.$transaction(async (tx) => {
      await tx.processingJobAttempt.update({
        where: { id: msg.attemptId },
        data: { status: "SUCCEEDED", finishedAt: new Date() },
      });
      await tx.processingJob.update({ where: { id: msg.jobId }, data: { status: "COMPLETED" } });
      await tx.videoAsset.update({ where: { id: msg.videoAssetId }, data: { status: "READY" } });
    });

    log.info("scoring complete; job COMPLETED", { scoringRunId: run.id });
  };
}
