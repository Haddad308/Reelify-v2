import { S3Client } from "@aws-sdk/client-s3";
import { getPrismaClient } from "@reelify/db";
import { createLogger } from "@reelify/shared";
import { buildApp } from "./app";
import { createAuthenticator } from "./auth";
import { loadConfig } from "./config";
import { MediaStorage } from "./storage";

const config = loadConfig();
const logger = createLogger({ service: "api", base: { authMode: config.authMode } });

const app = buildApp({
  config,
  prisma: getPrismaClient(),
  storage: new MediaStorage(new S3Client({ region: config.region }), config.uploadUrlTtlSeconds),
  authenticator: createAuthenticator(config),
  logger,
});

app
  .listen({ port: config.port, host: config.host })
  .then((address) => logger.info("api listening", { address }))
  .catch((err) => {
    logger.error("api failed to start", { error: err instanceof Error ? err.message : String(err) });
    process.exit(1);
  });
