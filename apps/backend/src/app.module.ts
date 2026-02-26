import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { AuditModule } from "./audit/audit.module";
import { ClusterModule } from "./cluster/cluster.module";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { ProxmoxModule } from "./proxmox/proxmox.module";
import { QueueModule } from "./queue/queue.module";
import { TemplatesModule } from "./templates/templates.module";
import { VmsModule } from "./vms/vms.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ProxmoxModule,
    AuditModule,
    AuthModule,
    TemplatesModule,
    VmsModule,
    AdminModule,
    ClusterModule,
    QueueModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
