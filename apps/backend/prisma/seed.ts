import argon2 from "argon2";
import { PrismaClient, Role, TemplateNodeScope } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
  const passwordHash = await argon2.hash(adminPassword);

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash,
      role: Role.ADMIN,
      quotaMaxVMs: 100,
      quotaMaxCoresTotal: 512,
      quotaMaxMemoryMBTotal: 1048576,
      quotaMaxDiskGBTotal: 100000
    },
    update: {
      passwordHash,
      role: Role.ADMIN
    }
  });

  const templates = [
    {
      name: "Ubuntu 22.04 Cloudinit",
      nodeScope: TemplateNodeScope.CLUSTER,
      templateVmid: 9000,
      storage: "local-lvm"
    },
    {
      name: "Debian 12 Cloudinit",
      nodeScope: TemplateNodeScope.CLUSTER,
      templateVmid: 9001,
      storage: "local-lvm"
    }
  ];

  for (const template of templates) {
    await prisma.template.upsert({
      where: { id: `${template.templateVmid}` },
      create: {
        ...template,
        id: `${template.templateVmid}`,
        minCores: 1,
        maxCores: 8,
        minMemoryMB: 1024,
        maxMemoryMB: 16384,
        minDiskGB: 10,
        maxDiskGB: 500,
        defaultBridge: process.env.PROXMOX_DEFAULT_BRIDGE ?? "vmbr0",
        allowUserNodeSelect: true,
        allowHaToggle: true
      },
      update: {}
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
