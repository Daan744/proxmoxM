import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    userId?: string | null;
    action: string;
    targetType: string;
    targetId?: string | null;
    meta?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        metaJson: (input.meta ?? {}) as Prisma.InputJsonValue
      }
    });
  }
}
