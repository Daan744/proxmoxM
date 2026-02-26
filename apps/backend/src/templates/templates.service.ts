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
    const discovered: Array<Record<string, unknown>> = [];

    for (const node of nodes) {
      const nodeName = String(node.node);
      const qemus = await this.proxmox.listQemu(nodeName);
      for (const vm of qemus) {
        if (vm.template === 1 || vm.template === true) {
          discovered.push({
            node: nodeName,
            vmid: Number(vm.vmid),
            name: String(vm.name ?? `template-${vm.vmid}`),
            storage: vm.storage ?? null
          });
        }
      }
    }

    return discovered;
  }
}
