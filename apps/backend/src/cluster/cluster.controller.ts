import { Controller, Get, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ClusterService } from "./cluster.service";

@Controller("cluster")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ClusterController {
  constructor(private readonly clusterService: ClusterService) {}

  @Get("health")
  health() {
    return this.clusterService.health();
  }

  @Get("ha/resources")
  haResources() {
    return this.clusterService.haResources();
  }
}
