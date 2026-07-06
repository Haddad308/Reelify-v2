import type { FastifyInstance } from "fastify";

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get("/v1/healthz", async () => ({ status: "ok" }));
}
