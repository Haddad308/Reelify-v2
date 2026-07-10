import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import { getPrismaClient } from "@reelify/db";
import { createLogger, SqsConsumer } from "@reelify/shared";
import { loadConfig } from "./config";
import { createProcessAudioHandler } from "./handler";

const config = loadConfig();
const logger = createLogger({ service: "ffmpeg-worker" });

const queueUrl = process.env.SQS_EXTRACTION_QUEUE_URL;
if (!queueUrl) throw new Error("Missing required env var: SQS_EXTRACTION_QUEUE_URL");

const consumer = new SqsConsumer({
  queueUrl,
  client: new SQSClient({ region: config.region }),
  logger,
  handler: createProcessAudioHandler({
    config,
    s3: new S3Client({ region: config.region }),
    prisma: getPrismaClient(),
    logger,
  }),
});

process.on("SIGTERM", () => consumer.stop());
process.on("SIGINT", () => consumer.stop());

consumer.run().catch((err) => {
  logger.error("ffmpeg worker crashed", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
