// @reelify/db — the generated Prisma client + a lazily-instantiated singleton.
// Services/workers import { getPrismaClient, Prisma, ... } from "@reelify/db".

export * from "../generated/client";
import { PrismaClient } from "../generated/client";

let client: PrismaClient | undefined;

/** Process-wide singleton so pooled connections aren't re-created per import. */
export function getPrismaClient(): PrismaClient {
  if (!client) {
    client = new PrismaClient();
  }
  return client;
}

export { PrismaClient };
