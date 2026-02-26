-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TemplateNodeScope" AS ENUM ('CLUSTER', 'NODE_ONLY');

-- CreateEnum
CREATE TYPE "VmPowerState" AS ENUM ('RUNNING', 'STOPPED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "VmStatus" AS ENUM ('PROVISIONING', 'RUNNING', 'STOPPED', 'FAILED', 'DELETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "quotaMaxVMs" INTEGER NOT NULL DEFAULT 5,
    "quotaMaxCoresTotal" INTEGER NOT NULL DEFAULT 16,
    "quotaMaxMemoryMBTotal" INTEGER NOT NULL DEFAULT 32768,
    "quotaMaxDiskGBTotal" INTEGER NOT NULL DEFAULT 500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nodeScope" "TemplateNodeScope" NOT NULL DEFAULT 'CLUSTER',
    "sourceNode" TEXT,
    "templateVmid" INTEGER NOT NULL,
    "storage" TEXT,
    "defaultBridge" TEXT,
    "defaultVlanTag" INTEGER,
    "minCores" INTEGER NOT NULL DEFAULT 1,
    "maxCores" INTEGER NOT NULL DEFAULT 8,
    "minMemoryMB" INTEGER NOT NULL DEFAULT 1024,
    "maxMemoryMB" INTEGER NOT NULL DEFAULT 16384,
    "minDiskGB" INTEGER NOT NULL DEFAULT 10,
    "maxDiskGB" INTEGER NOT NULL DEFAULT 500,
    "haEnabledDefault" BOOLEAN NOT NULL DEFAULT false,
    "haGroup" TEXT,
    "allowUserNodeSelect" BOOLEAN NOT NULL DEFAULT false,
    "allowHaToggle" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vm" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "templateId" TEXT,
    "name" TEXT NOT NULL,
    "vmid" INTEGER NOT NULL,
    "requestedNode" TEXT NOT NULL DEFAULT 'AUTO',
    "currentNode" TEXT,
    "cores" INTEGER NOT NULL,
    "memoryMB" INTEGER NOT NULL,
    "diskGB" INTEGER NOT NULL,
    "bridge" TEXT,
    "vlanTag" INTEGER,
    "haEnabled" BOOLEAN NOT NULL DEFAULT false,
    "haGroup" TEXT,
    "powerState" "VmPowerState" NOT NULL DEFAULT 'UNKNOWN',
    "status" "VmStatus" NOT NULL DEFAULT 'PROVISIONING',
    "ipAddress" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastStatusSyncAt" TIMESTAMP(3),
    CONSTRAINT "Vm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vm_vmid_key" ON "Vm"("vmid");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vm" ADD CONSTRAINT "Vm_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vm" ADD CONSTRAINT "Vm_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
