// Seeds a minimal tenant for the local end-to-end dry-run:
// one agency (data_region "us"), one owner user, one workspace.
// Idempotent (upserts). Run: npx tsx scripts/seed-e2e.ts
import { getPrismaClient } from "@reelify/db";

const prisma = getPrismaClient();

const AGENCY_ID = "ag_e2e";
const USER_ID = "usr_e2e";
const WORKSPACE_ID = "ws_e2e";
const AUTH_SUBJECT = "e2e-user";

async function main() {
  await prisma.agency.upsert({
    where: { id: AGENCY_ID },
    create: { id: AGENCY_ID, name: "E2E Agency", slug: "e2e", dataRegion: "us" },
    update: {},
  });
  await prisma.user.upsert({
    where: { id: USER_ID },
    create: { id: USER_ID, authSubject: AUTH_SUBJECT, email: "e2e@reelify.test" },
    update: {},
  });
  await prisma.agencyUser.upsert({
    where: { agencyId_userId: { agencyId: AGENCY_ID, userId: USER_ID } },
    create: { agencyId: AGENCY_ID, userId: USER_ID, role: "OWNER" },
    update: {},
  });
  await prisma.workspace.upsert({
    where: { id: WORKSPACE_ID },
    create: { id: WORKSPACE_ID, agencyId: AGENCY_ID, name: "E2E Workspace" },
    update: {},
  });

  console.log(
    JSON.stringify(
      { agencyId: AGENCY_ID, userId: USER_ID, workspaceId: WORKSPACE_ID, authSubject: AUTH_SUBJECT },
      null,
      2,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
