import type { PrismaClient } from "@reelify/db";
import { BadRequestError, ConflictError, NotFoundError } from "./errors";

export interface ProvisionResult {
  userId: string;
  workspaceId: string;
  created: boolean;
}

/**
 * Idempotently links a Cognito identity to the pilot workspace. Called once
 * after self sign-up / first login so tenancy checks pass on subsequent API calls.
 */
export async function provisionPilotUser(
  prisma: PrismaClient,
  workspaceId: string,
  authSubject: string,
  email: string,
): Promise<ProvisionResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new BadRequestError("email is required to provision a new user");

  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, deletedAt: null },
    select: { id: true },
  });
  if (!workspace) throw new NotFoundError("pilot workspace not found");

  const existingBySubject = await prisma.user.findUnique({
    where: { authSubject },
    select: { id: true },
  });
  if (existingBySubject) {
    await prisma.workspaceMembership.upsert({
      where: { workspaceId_userId: { workspaceId, userId: existingBySubject.id } },
      create: { workspaceId, userId: existingBySubject.id, role: "EDITOR" },
      update: {},
    });
    return { userId: existingBySubject.id, workspaceId, created: false };
  }

  const existingByEmail = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, authSubject: true },
  });
  if (existingByEmail && existingByEmail.authSubject !== authSubject) {
    throw new ConflictError("email is already registered to another account");
  }

  const user = await prisma.user.create({
    data: { authSubject, email: normalizedEmail },
    select: { id: true },
  });
  await prisma.workspaceMembership.create({
    data: { workspaceId, userId: user.id, role: "EDITOR" },
  });

  return { userId: user.id, workspaceId, created: true };
}
