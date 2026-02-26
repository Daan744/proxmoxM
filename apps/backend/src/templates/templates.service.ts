import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ProxmoxService } from "../proxmox/proxmox.service";
import { CreateTemplateDto, UpdateTemplateDto } from "./dto";

@Injectable()
export class TemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly proxmox: ProxmoxService
  ) {}

  list() {
    return this.prisma.template.findMany({ orderBy: { createdAt: "desc" } });
  }

  create(dto: CreateTemplateDto) {
    return this.prisma.template.create({ data: dto });
  }

  update(id: string, dto: UpdateTemplateDto) {
    return this.prisma.template.update({ where: { id }, data: dto });
  }

  delete(id: string) {
    return this.prisma.template.delete({ where: { id } });
  }

  async syncFromProxmox() {
    const nodes = await this.proxmox.listNodes();
    let created = 0;
    let updated = 0;

    for (const node of nodes) {
      const nodeName = String(node.node);
      const qemus = await this.proxmox.listQemu(nodeName);
      for (const vm of qemus) {
        if (vm.template !== 1 && vm.template !== true) continue;
        const vmid = Number(vm.vmid);
        const name = String(vm.name ?? `template-${vmid}`);
        const existing = await this.prisma.template.findFirst({ where: { templateVmid: vmid } });
        if (existing) {
          await this.prisma.template.update({
            where: { id: existing.id },
            data: { name, sourceNode: nodeName }
          });
          updated++;
        } else {
          await this.prisma.template.create({
            data: {
              name,
              templateVmid: vmid,
              nodeScope: "CLUSTER",
              sourceNode: nodeName,
              storage: "local-lvm",
              defaultBridge: "vmbr0",
              minCores: 1,
              maxCores: 16,
              minMemoryMB: 512,
              maxMemoryMB: 65536,
              minDiskGB: 5,
              maxDiskGB: 1000,
              haEnabledDefault: false,
              allowUserNodeSelect: true,
              allowHaToggle: true
            }
          });
          created++;
        }
      }
    }

    return { created, updated, total: created + updated };
  }
}
