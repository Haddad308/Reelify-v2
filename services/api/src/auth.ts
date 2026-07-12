import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { FastifyRequest } from "fastify";
import type { ApiConfig } from "./config";
import { UnauthorizedError } from "./errors";

/**
 * Identity layer (plan §11, layer 1). Validates the caller and returns their
 * IdP subject. Application/DB authorization (agency + workspace membership) is a
 * separate step in tenancy.ts.
 */
export interface AuthContext {
  authSubject: string;
  email?: string;
}

export interface Authenticator {
  authenticate(req: FastifyRequest): Promise<AuthContext>;
}

/** Local-only: trusts an X-Reelify-User header. Never enabled in prod. */
export class DevAuthenticator implements Authenticator {
  async authenticate(req: FastifyRequest): Promise<AuthContext> {
    const sub = req.headers["x-reelify-user"];
    if (!sub || Array.isArray(sub)) throw new UnauthorizedError("missing X-Reelify-User (dev auth)");
    const email = req.headers["x-reelify-email"];
    return { authSubject: sub, email: typeof email === "string" ? email : undefined };
  }
}

/** Verifies a Cognito access token (issuer/audience/expiry) via the JWKS. */
export class CognitoAuthenticator implements Authenticator {
  private readonly verifier: ReturnType<typeof CognitoJwtVerifier.create>;

  constructor(userPoolId: string, clientId: string) {
    this.verifier = CognitoJwtVerifier.create({ userPoolId, tokenUse: "access", clientId });
  }

  async authenticate(req: FastifyRequest): Promise<AuthContext> {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedError("missing bearer token");
    try {
      const payload = await this.verifier.verify(token);
      const rec = payload as unknown as Record<string, unknown>;
      const username = typeof rec.username === "string" ? rec.username : undefined;
      const emailClaim = typeof rec.email === "string" ? rec.email : undefined;
      return {
        authSubject: payload.sub,
        email: emailClaim ?? (username?.includes("@") ? username : undefined),
      };
    } catch {
      throw new UnauthorizedError("invalid token");
    }
  }
}

export function createAuthenticator(config: ApiConfig): Authenticator {
  if (config.authMode === "cognito" && config.cognito) {
    return new CognitoAuthenticator(config.cognito.userPoolId, config.cognito.clientId);
  }
  return new DevAuthenticator();
}
