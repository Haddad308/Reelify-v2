import type { PrismaClient } from "@reelify/db";
import type { Logger } from "@reelify/shared";
import Fastify, { type FastifyInstance } from "fastify";
import type { Authenticator } from "./auth";
import type { ApiConfig } from "./config";
import { ApiError } from "./errors";
import { registerHealthRoutes } from "./routes/health";
import { registerJobRoutes } from "./routes/jobs";
import { registerUploadRoutes } from "./routes/uploads";
import { registerVideoRoutes } from "./routes/videos";
import type { MediaStorage } from "./storage";

export interface AppDeps {
  config: ApiConfig;
  prisma: PrismaClient;
  storage: MediaStorage;
  authenticator: Authenticator;
  logger: Logger;
}

export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({ logger: false, bodyLimit: 5 * 1024 * 1024 });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ApiError) {
      return reply.code(err.statusCode).send({ error: err.code, message: err.message });
    }
    const message = err instanceof Error ? err.message : String(err);
    const isValidation =
      typeof err === "object" && err !== null && Boolean((err as { validation?: unknown }).validation);
    if (isValidation) {
      return reply.code(400).send({ error: "bad_request", message });
    }
    deps.logger.error("unhandled API error", { error: message });
    return reply.code(500).send({ error: "internal", message: "internal server error" });
  });

  registerHealthRoutes(app);
  registerUploadRoutes(app, deps);
  registerJobRoutes(app, deps);
  registerVideoRoutes(app, deps);
  return app;
}
