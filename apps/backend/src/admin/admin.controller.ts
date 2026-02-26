import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { UpdateAdminUserDto } from "./dto";
import { AdminService } from "./admin.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("users")
  listUsers() {
    return this.adminService.listUsers();
  }

  @Patch("users/:id")
  updateUser(@Param("id") id: string, @Body() dto: UpdateAdminUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Get("audit-logs")
  auditLogs(
    @Query("userId") userId?: string,
    @Query("action") action?: string,
    @Query("targetType") targetType?: string
  ) {
    return this.adminService.listAuditLogs({ userId, action, targetType });
  }
}
