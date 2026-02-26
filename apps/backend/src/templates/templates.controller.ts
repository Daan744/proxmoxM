import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { AuditService } from "../audit/audit.service";
import { CreateTemplateDto, UpdateTemplateDto } from "./dto";
import { TemplatesService } from "./templates.service";

@Controller("templates")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemplatesController {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly audit: AuditService
  ) {}

  @Get()
  list() {
    return this.templatesService.list();
  }

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateTemplateDto, @CurrentUser() user: { id: string }) {
    const template = await this.templatesService.create(dto);
    await this.audit.log({
      userId: user.id,
      action: "template.create",
      targetType: "Template",
      targetId: template.id,
      meta: template as unknown as Record<string, unknown>
    });
    return template;
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentUser() user: { id: string }
  ) {
    const template = await this.templatesService.update(id, dto);
    await this.audit.log({
      userId: user.id,
      action: "template.update",
      targetType: "Template",
      targetId: template.id,
      meta: dto as unknown as Record<string, unknown>
    });
    return template;
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  async delete(@Param("id") id: string, @CurrentUser() user: { id: string }) {
    const template = await this.templatesService.delete(id);
    await this.audit.log({
      userId: user.id,
      action: "template.delete",
      targetType: "Template",
      targetId: id
    });
    return template;
  }

  @Post("sync")
  @Roles(Role.ADMIN)
  async sync() {
    return this.templatesService.syncFromProxmox();
  }
}
