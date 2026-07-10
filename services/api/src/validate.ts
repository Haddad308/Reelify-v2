import type { ZodType } from "zod";
import { BadRequestError } from "./errors";

export function parseBody<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
      .join("; ");
    throw new BadRequestError(detail);
  }
  return result.data;
}
