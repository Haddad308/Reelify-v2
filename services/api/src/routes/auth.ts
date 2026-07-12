import type { FastifyInstance } from "fastify";
import type { AppDeps } from "../app";
import { BadRequestError } from "../errors";
import { provisionPilotUser } from "../provisioning";

export function registerAuthRoutes(app: FastifyInstance, deps: AppDeps): void {
  app.post("/v1/auth/provision", async (req) => {
    const { pilotWorkspaceId } = deps.config;
    if (!pilotWorkspaceId) {
      throw new BadRequestError("user provisioning is not configured");
    }

    const { authSubject, email } = await deps.authenticator.authenticate(req);
    const body = (req.body ?? {}) as { email?: string };
    const resolvedEmail = email ?? body.email;
    if (!resolvedEmail) {
      throw new BadRequestError("email is required (pass in body if not present in token)");
    }

    return provisionPilotUser(deps.prisma, pilotWorkspaceId, authSubject, resolvedEmail);
  });
}
