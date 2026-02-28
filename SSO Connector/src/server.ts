import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { PrismaClient, Environment, ProvisioningMode } from "@prisma/client";
import { z } from "zod";

dotenv.config();

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

const port = Number(process.env.PORT || 3000);
const oktaDryRun = (process.env.OKTA_DRY_RUN || "true").toLowerCase() === "true";

const createApplicationSchema = z.object({
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  env: z.nativeEnum(Environment),
  redirectUris: z.array(z.string().url()).min(1),
  postLogoutRedirectUris: z.array(z.string().url()).default([]),
  provisioningMode: z.nativeEnum(ProvisioningMode).default("jit"),
  createdBy: z.string().min(1)
});

const mappingSchema = z.object({
  mappings: z.array(
    z.object({
      audienceName: z.string().min(1),
      roleName: z.string().min(1),
      oktaGroupName: z.string().optional()
    })
  ).min(1)
});

const provisionSchema = z.object({
  actor: z.string().default("system"),
  scimEnabled: z.boolean().default(false),
  scimBaseUrl: z.string().url().optional()
});

const actorFromReq = (req: express.Request) => req.header("x-actor") || "system";

async function writeAudit(actor: string, action: string, targetType: string, targetId: string, beforeObj?: unknown, afterObj?: unknown) {
  await prisma.auditEvent.create({
    data: {
      actor,
      action,
      targetType,
      targetId,
      beforeJson: beforeObj ? JSON.stringify(beforeObj) : null,
      afterJson: afterObj ? JSON.stringify(afterObj) : null
    }
  });
}

function defaultGroupName(appSlug: string, audience: string, role: string) {
  const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return `replit-${normalize(appSlug)}-${normalize(audience)}-${normalize(role)}`;
}

app.get("/health", async (_req, res) => {
  const counts = await Promise.all([
    prisma.application.count(),
    prisma.audience.count(),
    prisma.role.count()
  ]);

  res.json({
    ok: true,
    service: "sso-connector",
    counts: {
      applications: counts[0],
      audiences: counts[1],
      roles: counts[2]
    }
  });
});

app.post("/applications", async (req, res) => {
  const parsed = createApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const payload = parsed.data;

  try {
    const created = await prisma.application.create({
      data: {
        name: payload.name,
        slug: payload.slug,
        env: payload.env,
        redirectUrisJson: JSON.stringify(payload.redirectUris),
        postLogoutRedirectsJson: JSON.stringify(payload.postLogoutRedirectUris),
        provisioningMode: payload.provisioningMode,
        createdBy: payload.createdBy
      }
    });

    await writeAudit(
      payload.createdBy,
      "application.create",
      "application",
      created.id,
      undefined,
      created
    );

    return res.status(201).json(created);
  } catch (err: any) {
    if (String(err?.code) === "P2002") {
      return res.status(409).json({ error: "slug/env already exists" });
    }
    return res.status(500).json({ error: "failed to create application" });
  }
});

app.get("/applications", async (_req, res) => {
  const applications = await prisma.application.findMany({
    orderBy: [{ createdAt: "desc" }]
  });

  return res.json(
    applications.map((a) => ({
      ...a,
      redirectUris: JSON.parse(a.redirectUrisJson),
      postLogoutRedirectUris: JSON.parse(a.postLogoutRedirectsJson)
    }))
  );
});

app.get("/applications/:id", async (req, res) => {
  const appId = req.params.id;
  const found = await prisma.application.findUnique({
    where: { id: appId },
    include: {
      mappings: {
        include: {
          audience: true,
          role: true
        }
      },
      oktaIntegration: true,
      publishedConfigs: {
        orderBy: { version: "desc" },
        take: 1
      }
    }
  });

  if (!found) {
    return res.status(404).json({ error: "application not found" });
  }

  return res.json({
    ...found,
    redirectUris: JSON.parse(found.redirectUrisJson),
    postLogoutRedirectUris: JSON.parse(found.postLogoutRedirectsJson)
  });
});

app.post("/applications/:id/audience-mappings", async (req, res) => {
  const appId = req.params.id;
  const parsed = mappingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const actor = actorFromReq(req);
  const targetApp = await prisma.application.findUnique({ where: { id: appId } });
  if (!targetApp) {
    return res.status(404).json({ error: "application not found" });
  }

  const before = await prisma.appAudienceRoleMapping.findMany({ where: { applicationId: appId } });

  const result = await prisma.$transaction(async (tx) => {
    await tx.appAudienceRoleMapping.deleteMany({ where: { applicationId: appId } });

    for (const item of parsed.data.mappings) {
      const audience = await tx.audience.upsert({
        where: { name: item.audienceName },
        update: {},
        create: { name: item.audienceName }
      });

      const role = await tx.role.upsert({
        where: { name: item.roleName },
        update: {},
        create: { name: item.roleName }
      });

      await tx.appAudienceRoleMapping.create({
        data: {
          applicationId: appId,
          audienceId: audience.id,
          roleId: role.id,
          oktaGroupName: item.oktaGroupName || defaultGroupName(targetApp.slug, audience.name, role.name)
        }
      });
    }

    return tx.appAudienceRoleMapping.findMany({
      where: { applicationId: appId },
      include: { audience: true, role: true }
    });
  });

  await writeAudit(actor, "mappings.replace", "application", appId, before, result);
  return res.json({ applicationId: appId, mappings: result });
});

app.post("/applications/:id/okta/provision", async (req, res) => {
  const appId = req.params.id;
  const parsed = provisionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const appRecord = await prisma.application.findUnique({ where: { id: appId } });
  if (!appRecord) {
    return res.status(404).json({ error: "application not found" });
  }

  const before = await prisma.oktaIntegration.findUnique({ where: { applicationId: appId } });

  const oktaAppId = `okta-app-${appRecord.slug}-${appRecord.env}`;
  const oktaClientId = `client-${appRecord.slug}-${appRecord.env}`;
  const oktaIssuer = process.env.OKTA_ORG_URL ? `${process.env.OKTA_ORG_URL}/oauth2/default` : "https://example.okta.com/oauth2/default";

  // MVP: this route is dry-run by default. Swap this block with real Okta API calls.
  const integration = await prisma.oktaIntegration.upsert({
    where: { applicationId: appId },
    update: {
      oktaAppId,
      oktaClientId,
      oktaIssuer,
      scimEnabled: parsed.data.scimEnabled,
      scimBaseUrl: parsed.data.scimBaseUrl || null
    },
    create: {
      applicationId: appId,
      oktaAppId,
      oktaClientId,
      oktaIssuer,
      scimEnabled: parsed.data.scimEnabled,
      scimBaseUrl: parsed.data.scimBaseUrl || null
    }
  });

  await writeAudit(parsed.data.actor, "okta.provision", "application", appId, before, {
    ...integration,
    dryRun: oktaDryRun
  });

  return res.json({
    message: oktaDryRun
      ? "Provision recorded in dry-run mode. Integrate real Okta API calls next."
      : "Provision executed.",
    dryRun: oktaDryRun,
    integration
  });
});

app.post("/applications/:id/publish-config", async (req, res) => {
  const appId = req.params.id;
  const actor = actorFromReq(req);

  const appRecord = await prisma.application.findUnique({ where: { id: appId } });
  if (!appRecord) {
    return res.status(404).json({ error: "application not found" });
  }

  const integration = await prisma.oktaIntegration.findUnique({ where: { applicationId: appId } });
  if (!integration) {
    return res.status(400).json({ error: "okta integration not provisioned" });
  }

  const mappings = await prisma.appAudienceRoleMapping.findMany({
    where: { applicationId: appId },
    include: { role: true }
  });

  const latest = await prisma.publishedConfig.findFirst({
    where: { applicationId: appId },
    orderBy: { version: "desc" }
  });
  const nextVersion = (latest?.version || 0) + 1;

  const config = {
    issuer: integration.oktaIssuer,
    clientId: integration.oktaClientId,
    audClaim: appRecord.slug,
    allowedGroups: mappings.map((m) => m.oktaGroupName),
    groupToRoleMap: Object.fromEntries(mappings.map((m) => [m.oktaGroupName, m.role.name])),
    requiredClaims: ["sub", "email"],
    tokenValidation: {
      algorithms: ["RS256"],
      clockSkewSeconds: 60
    }
  };

  const published = await prisma.publishedConfig.create({
    data: {
      applicationId: appId,
      version: nextVersion,
      configJson: JSON.stringify(config)
    }
  });

  await writeAudit(actor, "config.publish", "application", appId, undefined, {
    version: nextVersion,
    config
  });

  return res.status(201).json({
    version: published.version,
    publishedAt: published.publishedAt,
    config
  });
});

app.get("/applications/:id/config", async (req, res) => {
  const appId = req.params.id;
  const latest = await prisma.publishedConfig.findFirst({
    where: { applicationId: appId },
    orderBy: { version: "desc" }
  });

  if (!latest) {
    return res.status(404).json({ error: "no published config" });
  }

  return res.json({
    applicationId: appId,
    version: latest.version,
    publishedAt: latest.publishedAt,
    config: JSON.parse(latest.configJson)
  });
});

app.get("/applications/:id/drift", async (req, res) => {
  const appId = req.params.id;
  const target = await prisma.application.findUnique({ where: { id: appId } });
  if (!target) {
    return res.status(404).json({ error: "application not found" });
  }

  const integration = await prisma.oktaIntegration.findUnique({ where: { applicationId: appId } });
  const mappings = await prisma.appAudienceRoleMapping.findMany({ where: { applicationId: appId } });

  const issues: string[] = [];
  if (!integration) {
    issues.push("missing okta integration");
  }
  if (!mappings.length) {
    issues.push("no audience/role mappings");
  }

  // Placeholder checks to keep MVP deterministic in dry-run mode.
  if (integration && !integration.oktaIssuer.includes("/oauth2/")) {
    issues.push("okta issuer does not include oauth2 authorization server path");
  }

  return res.json({
    applicationId: appId,
    drift: issues.length > 0,
    issues
  });
});

app.get("/audit-events", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  const events = await prisma.auditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit
  });
  return res.json(events);
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "internal error" });
});

app.listen(port, () => {
  console.log(`sso-connector listening on :${port}`);
});
