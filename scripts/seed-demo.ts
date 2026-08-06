import "dotenv/config";
import { auth } from "@/lib/auth";
import { createPersonalOrganisation } from "@/lib/organisation";
import { prisma } from "@/lib/prisma";

// Creates one demo account for local development, with a sample workflow
// and document so a fresh clone has something to look at immediately
// instead of an empty dashboard. Safe to run more than once — skips work
// that's already done. Never run this against a production database: the
// password below is public (it's in this file, in a public repo).
const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "demo-password-123";
const DEMO_NAME = "Demo User";

async function main() {
  const existingUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });

  const userId = existingUser
    ? existingUser.id
    : await auth.api
        .signUpEmail({ body: { email: DEMO_EMAIL, password: DEMO_PASSWORD, name: DEMO_NAME } })
        .then((result) => result.user.id);

  console.log(existingUser ? "Demo user already exists." : "Created demo user.");

  const membership = await prisma.membership.findUnique({ where: { userId } });
  const organisationId = membership
    ? membership.organisationId
    : (await createPersonalOrganisation(userId)).organisationId;

  const workflowCount = await prisma.workflow.count({ where: { organisationId } });
  if (workflowCount === 0) {
    await prisma.workflow.create({
      data: {
        name: "Ship the onboarding redesign",
        description: "Sample workflow so the dashboard isn't empty on first load.",
        status: "IN_PROGRESS",
        ownerId: userId,
        organisationId,
      },
    });
    console.log("Created sample workflow.");
  }

  console.log("\nDemo login:");
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
