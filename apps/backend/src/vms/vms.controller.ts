import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CreateVmDto } from "./dto";
import { VmsService } from "./vms.service";

@Controller("vms")
@UseGuards(JwtAuthGuard)
export class VmsController {
  constructor(private readonly vmsService: VmsService) {}

  @Get()
  list(@CurrentUser() user: { id: string; role: "USER" | "ADMIN" }) {
    return this.vmsService.list(user);
  }

  @Get("isos")
  listIsos() {
    return this.vmsService.listIsos();
  }

  @Get("nodes")
  listNodes() {
    return this.vmsService.listNodes();
  }

  @Post()
  create(
    @Body() dto: CreateVmDto,
    @CurrentUser() user: { id: string; role: "USER" | "ADMIN" }
  ) {
    return this.vmsService.create(dto, user);
  }

  @Post("sync")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  syncFromProxmox(@CurrentUser() user: { id: string; role: "USER" | "ADMIN" }) {
    return this.vmsService.syncFromProxmox(user.id);
  }

  @Get(":id")
  getById(@Param("id") id: string, @CurrentUser() user: { id: string; role: "USER" | "ADMIN" }) {
    return this.vmsService.getById(id, user);
  }

  @Get(":id/live")
  getLive(@Param("id") id: string, @CurrentUser() user: { id: string; role: "USER" | "ADMIN" }) {
    return this.vmsService.getLive(id, user);
  }

  @Post(":id/start")
  start(@Param("id") id: string, @CurrentUser() user: { id: string; role: "USER" | "ADMIN" }) {
    return this.vmsService.start(id, user);
  }

  @Post(":id/stop")
  stop(@Param("id") id: string, @CurrentUser() user: { id: string; role: "USER" | "ADMIN" }) {
    return this.vmsService.stop(id, user);
  }

  @Post(":id/reboot")
  reboot(@Param("id") id: string, @CurrentUser() user: { id: string; role: "USER" | "ADMIN" }) {
    return this.vmsService.reboot(id, user);
  }

  @Delete(":id")
  delete(@Param("id") id: string, @CurrentUser() user: { id: string; role: "USER" | "ADMIN" }) {
    return this.vmsService.delete(id, user);
  }

  @Post(":id/migrate")
  migrate(
    @Param("id") id: string,
    @Body() body: { target: string },
    @CurrentUser() user: { id: string; role: "USER" | "ADMIN" }
  ) {
    return this.vmsService.migrate(id, body.target, user);
  }
}
