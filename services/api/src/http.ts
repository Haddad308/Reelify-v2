import type { FastifyRequest } from "fastify";
import { BadRequestError } from "./errors";

export function requireIdempotencyKey(req: FastifyRequest): string {
  const key = req.headers["idempotency-key"];
  if (!key || Array.isArray(key)) throw new BadRequestError("Idempotency-Key header is required");
  return key;
}
