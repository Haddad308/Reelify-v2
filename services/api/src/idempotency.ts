import type { PrismaClient } from "@reelify/db";
import { hashRequestBody } from "@reelify/shared";
import { ConflictError } from "./errors";
import { isUniqueViolation } from "./prismaErrors";

export interface IdemResult {
  status: number;
  body: unknown;
}

/**
 * Enforces the `Idempotency-Key` contract (plan §7). Claims the key by inserting
 * a row first (so concurrent duplicates collide on the unique index), runs the
 * handler once, then persists the response for replays. Reusing a key with a
 * different body is a 409.
 */
export async function withIdempotency(
  prisma: PrismaClient,
  params: { endpoint: string; key: string; agencyId?: string; requestBody: unknown },
  handler: () => Promise<IdemResult>,
): Promise<IdemResult> {
  const { endpoint, key, agencyId } = params;
  const requestHash = hashRequestBody(params.requestBody);

  try {
    await prisma.idempotencyKey.create({ data: { endpoint, key, agencyId, requestHash } });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const existing = await prisma.idempotencyKey.findUnique({
      where: { endpoint_key: { endpoint, key } },
    });
    if (existing?.requestHash && existing.requestHash !== requestHash) {
      throw new ConflictError("Idempotency-Key reused with a different request body");
    }
    if (existing?.responseStatus != null) {
      return { status: existing.responseStatus, body: existing.responseBody };
    }
    throw new ConflictError("a request with this Idempotency-Key is still in progress");
  }

  const result = await handler();
  await prisma.idempotencyKey.update({
    where: { endpoint_key: { endpoint, key } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { responseStatus: result.status, responseBody: result.body as any },
  });
  return result;
}
