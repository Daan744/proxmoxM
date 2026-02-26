import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateAdminUserDto } from "./dto";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  listUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        quotaMaxVMs: true,
        quotaMaxCoresTotal: true,
        quotaMaxMemoryMBTotal: true,
        quotaMaxDiskGBTotal: true,
        createdAt: true
      }
    });
  }

  updateUser(id: string, dto: UpdateAdminUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto
    });
  }

  listAuditLogs(filters: { userId?: string; action?: string; targetType?: string }) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(filters.userId ? { userId: filters.userId } : {}),
        ...(filters.action ? { action: { contains: filters.action } } : {}),
        ...(filters.targetType ? { targetType: filters.targetType } : {})
      },
      orderBy: { createdAt: "desc" },
      take: 500
    });
  }
}
