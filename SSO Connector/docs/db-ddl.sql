-- Initial schema for SSO Connector MVP

CREATE TABLE "Application" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "env" TEXT NOT NULL,
  "redirectUrisJson" TEXT NOT NULL,
  "postLogoutRedirectsJson" TEXT NOT NULL,
  "provisioningMode" TEXT NOT NULL DEFAULT 'jit',
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdBy" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "Application_slug_env_key" ON "Application"("slug", "env");

CREATE TABLE "Audience" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Audience_name_key" ON "Audience"("name");

CREATE TABLE "Role" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

CREATE TABLE "AppAudienceRoleMapping" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "applicationId" TEXT NOT NULL,
  "audienceId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "oktaGroupName" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppAudienceRoleMapping_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AppAudienceRoleMapping_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "Audience" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AppAudienceRoleMapping_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AppAudienceRoleMapping_oktaGroupName_key" ON "AppAudienceRoleMapping"("oktaGroupName");
CREATE UNIQUE INDEX "AppAudienceRoleMapping_applicationId_audienceId_roleId_key" ON "AppAudienceRoleMapping"("applicationId", "audienceId", "roleId");

CREATE TABLE "OktaIntegration" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "applicationId" TEXT NOT NULL,
  "oktaAppId" TEXT NOT NULL,
  "oktaClientId" TEXT NOT NULL,
  "oktaIssuer" TEXT NOT NULL,
  "scimEnabled" BOOLEAN NOT NULL DEFAULT false,
  "scimBaseUrl" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "OktaIntegration_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OktaIntegration_applicationId_key" ON "OktaIntegration"("applicationId");

CREATE TABLE "PublishedConfig" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "applicationId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "configJson" TEXT NOT NULL,
  "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublishedConfig_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PublishedConfig_applicationId_version_key" ON "PublishedConfig"("applicationId", "version");

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actor" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "beforeJson" TEXT,
  "afterJson" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AuditEvent_targetType_targetId_idx" ON "AuditEvent"("targetType", "targetId");
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");
