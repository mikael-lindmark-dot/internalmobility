import { PrismaClient, Environment, ProvisioningMode } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const app = await prisma.application.upsert({
    where: { slug_env: { slug: "sales-dashboard", env: Environment.dev } },
    update: {},
    create: {
      name: "Sales Dashboard",
      slug: "sales-dashboard",
      env: Environment.dev,
      redirectUrisJson: JSON.stringify(["https://sales-dashboard.dev.replit.app/auth/callback"]),
      postLogoutRedirectsJson: JSON.stringify(["https://sales-dashboard.dev.replit.app"]),
      provisioningMode: ProvisioningMode.jit,
      createdBy: "seed"
    }
  });

  const employee = await prisma.audience.upsert({
    where: { name: "employee" },
    update: {},
    create: { name: "employee" }
  });

  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin" }
  });

  await prisma.appAudienceRoleMapping.upsert({
    where: { applicationId_audienceId_roleId: { applicationId: app.id, audienceId: employee.id, roleId: adminRole.id } },
    update: {},
    create: {
      applicationId: app.id,
      audienceId: employee.id,
      roleId: adminRole.id,
      oktaGroupName: "replit-sales-dashboard-employee-admin"
    }
  });

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
