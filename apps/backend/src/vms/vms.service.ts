import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Role, VmPowerState, VmStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProxmoxService } from "../proxmox/proxmox.service";
import { QueueService } from "../queue/queue.service";
import { CreateVmDto } from "./dto";

type RequestUser = { id: string; role: Role };

@Injectable()
export class VmsService {
  private readonly logger = new Logger(VmsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly proxmox: ProxmoxService,
    private readonly config: ConfigService,
    private readonly audit: AuditService
  ) {}

  async list(user: RequestUser) {
    return this.prisma.vm.findMany({
      where: user.role === Role.ADMIN ? { deletedAt: null } : { ownerUserId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" }
    });
  }

  async getById(id: string, user: RequestUser) {
    const vm = await this.prisma.vm.findUnique({ where: { id } });
    if (!vm) throw new NotFoundException("VM not found");
    this.assertVmAccess(vm, user);
    return vm;
  }

  async getLive(id: string, user: RequestUser) {
    const vm = await this.getById(id, user);
    const node = vm.currentNode ?? (await this.proxmox.findVmNode(vm.vmid));
    if (!node) return { ...vm, live: null };
    try {
      const live = await this.proxmox.getQemuStatus(node, vm.vmid);
      return { ...vm, live };
    } catch {
      return { ...vm, live: null };
    }
  }

  async listIsos() {
    try {
      return await this.proxmox.listAllIsos();
    } catch (err) {
      this.logProxmoxError("listAllIsos", err);
      return [];
    }
  }

  async listNodes() {
    try {
      return await this.proxmox.listNodes();
    } catch (err) {
      this.logProxmoxError("listNodes", err);
      return [];
    }
  }

  async listProxmoxVms() {
    const nodes = await this.listNodes();
    const allVms: Array<Record<string, unknown> & { _node: string }> = [];
    for (const node of nodes) {
      const nodeName = String((node as { node?: string }).node ?? "");
      if (!nodeName) continue;
      try {
        const qemus = await this.proxmox.listQemu(nodeName);
        for (const vm of qemus as Array<Record<string, unknown>>) {
          if (vm.template === 1 || vm.template === true) continue;
          allVms.push({ ...vm, _node: nodeName });
        }
      } catch {
        // skip node on error
      }
    }
    return allVms;
  }

  async syncFromProxmox(adminUserId?: string) {
    let proxmoxVms: Array<Record<string, unknown> & { _node: string }>;
    try {
      proxmoxVms = await this.listProxmoxVms();
    } catch (err) {
      this.logProxmoxError("syncFromProxmox list", err);
      throw new BadRequestException(
        "Proxmox niet bereikbaar. Controleer PROXMOX_HOST en token."
      );
    }
    let imported = 0;
    let updated = 0;
    for (const pvm of proxmoxVms) {
      const vmid = Number(pvm.vmid);
      if (!Number.isInteger(vmid) || vmid < 1) continue;
      const existing = await this.prisma.vm.findUnique({ where: { vmid } });
      const statusStr = String(pvm.status ?? "").toLowerCase();
      const powerState =
        statusStr === "running" ? VmPowerState.RUNNING : VmPowerState.STOPPED;
      const status =
        statusStr === "running" ? VmStatus.RUNNING : VmStatus.STOPPED;
      if (existing) {
        await this.prisma.vm.update({
          where: { id: existing.id },
          data: {
            currentNode: String(pvm._node ?? ""),
            powerState,
            status:
              existing.status === VmStatus.FAILED ||
              existing.status === VmStatus.DELETED
                ? existing.status
                : status,
            lastStatusSyncAt: new Date()
          }
        });
        updated++;
      } else {
        const cores = Number(pvm.cpus ?? pvm.maxcpu ?? 1) || 1;
        const memoryMB =
          Math.round(Number(pvm.maxmem ?? 0) / 1048576) || 512;
        const diskGB =
          Math.round(Number(pvm.maxdisk ?? 0) / 1073741824) || 10;
        await this.prisma.vm.create({
          data: {
            name: String(pvm.name ?? `vm-${vmid}`),
            vmid,
            ownerUserId: null,
            requestedNode: "AUTO",
            currentNode: String(pvm._node ?? ""),
            cores,
            memoryMB,
            diskGB,
            bridge: "vmbr0",
            status: VmStatus.RUNNING,
            powerState
          }
        });
        imported++;
      }
    }
    if (adminUserId) {
      this.audit.log({
        userId: adminUserId,
        action: "vm.sync",
        targetType: "Vm",
        targetId: null,
        meta: { imported, updated, total: proxmoxVms.length }
      }).catch(() => {});
    }
    return { imported, updated, total: proxmoxVms.length };
  }

  private logProxmoxError(context: string, err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    this.logger.warn(`Proxmox ${context}: ${msg}`);
  }

  async create(dto: CreateVmDto, user: RequestUser) {
    if (user.role === Role.USER && this.config.get("ALLOW_USER_PROVISIONING", "false") !== "true") {
      throw new ForbiddenException("User provisioning disabled");
    }
    if (!dto.templateId && !dto.isoPath) {
      throw new BadRequestException("Either templateId or isoPath is required");
    }

    let template = dto.templateId
      ? await this.prisma.template.findUnique({ where: { id: dto.templateId } })
      : null;

    if (dto.templateId && !template) throw new NotFoundException("Template not found");

    if (template) {
      if (dto.requestedNode && dto.requestedNode !== "AUTO" && !template.allowUserNodeSelect) {
        throw new ForbiddenException("Template does not allow node selection");
      }
      if (dto.cores < template.minCores || dto.cores > template.maxCores) {
        throw new ForbiddenException("Cores out of template limits");
      }
      if (dto.memoryMB < template.minMemoryMB || dto.memoryMB > template.maxMemoryMB) {
        throw new ForbiddenException("Memory out of template limits");
      }
      if (dto.diskGB < template.minDiskGB || dto.diskGB > template.maxDiskGB) {
        throw new ForbiddenException("Disk out of template limits");
      }
    }

    const ownerUserId = user.role === Role.ADMIN ? (dto.ownerUserId ?? user.id) : user.id;
    const maxVmid = await this.prisma.vm.aggregate({ _max: { vmid: true } });
    const vmid = (maxVmid._max.vmid ?? 999) + 1;
    const safeName = String(dto.name ?? "").replace(/\.\./g, "").replace(/[/\\<>'"]/g, "").trim().slice(0, 128) || "vm";

    const vm = await this.prisma.vm.create({
      data: {
        name: safeName,
        vmid,
        ownerUserId,
        templateId: dto.templateId ?? null,
        isoPath: dto.isoPath ?? null,
        requestedNode: dto.requestedNode ?? "AUTO",
        currentNode: null,
        cores: dto.cores,
        memoryMB: dto.memoryMB,
        diskGB: dto.diskGB,
        bridge: dto.bridge ?? template?.defaultBridge ?? "vmbr0",
        vlanTag: dto.vlanTag ?? template?.defaultVlanTag,
        haEnabled: dto.haEnabled ?? template?.haEnabledDefault ?? false,
        haGroup: dto.haGroup ?? template?.haGroup,
        ciUser: dto.cloudInit?.username ?? null,
        ciSshKey: dto.cloudInit?.sshKey ?? null,
        status: VmStatus.PROVISIONING,
        powerState: VmPowerState.UNKNOWN
      }
    });

    await this.queue.enqueueProvisionVm(vm.id);
    await this.audit.log({
      userId: user.id,
      action: "vm.create.requested",
      targetType: "Vm",
      targetId: vm.id,
      meta: { vmid, ownerUserId, mode: dto.isoPath ? "iso" : "template" }
    });
    return vm;
  }

  async start(id: string, user: RequestUser) {
    const vm = await this.getById(id, user);
    const node = vm.currentNode ?? (await this.proxmox.findVmNode(vm.vmid));
    if (!node) throw new NotFoundException("VM node not found");
    const upid = await this.proxmox.startVm(node, vm.vmid);
    await this.proxmox.waitForTask(node, upid, 120);
    return this.prisma.vm.update({
      where: { id: vm.id },
      data: { powerState: VmPowerState.RUNNING, status: VmStatus.RUNNING, currentNode: node }
    });
  }

  async stop(id: string, user: RequestUser) {
    const vm = await this.getById(id, user);
    const node = vm.currentNode ?? (await this.proxmox.findVmNode(vm.vmid));
    if (!node) throw new NotFoundException("VM node not found");
    const upid = await this.proxmox.stopVm(node, vm.vmid);
    await this.proxmox.waitForTask(node, upid, 120);
    return this.prisma.vm.update({
      where: { id: vm.id },
      data: { powerState: VmPowerState.STOPPED, status: VmStatus.STOPPED, currentNode: node }
    });
  }

  async reboot(id: string, user: RequestUser) {
    const vm = await this.getById(id, user);
    const node = vm.currentNode ?? (await this.proxmox.findVmNode(vm.vmid));
    if (!node) throw new NotFoundException("VM node not found");
    const upid = await this.proxmox.rebootVm(node, vm.vmid);
    await this.proxmox.waitForTask(node, upid, 120);
    return { success: true };
  }

  async delete(id: string, user: RequestUser) {
    const vm = await this.getById(id, user);
    const node = vm.currentNode ?? (await this.proxmox.findVmNode(vm.vmid));
    if (node) {
      await this.proxmox.deleteVm(node, vm.vmid);
      if (vm.haEnabled) {
        try { await this.proxmox.removeHaResource(vm.vmid); } catch {}
      }
    }
    return this.prisma.vm.update({
      where: { id: vm.id },
      data: {
        status: VmStatus.DELETED,
        deletedAt: new Date(),
        powerState: VmPowerState.STOPPED,
        currentNode: node ?? vm.currentNode
      }
    });
  }

  async migrate(id: string, target: string, user: RequestUser) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException("Only admins can migrate");
    const vm = await this.getById(id, user);
    const node = vm.currentNode ?? (await this.proxmox.findVmNode(vm.vmid));
    if (!node) throw new NotFoundException("VM node not found");
    const upid = await this.proxmox.migrate(node, vm.vmid, target);
    await this.proxmox.waitForTask(node, upid, 300);
    return this.prisma.vm.update({ where: { id: vm.id }, data: { currentNode: target } });
  }

  private assertVmAccess(vm: { ownerUserId: string | null }, user: RequestUser) {
    if (user.role === Role.ADMIN) return;
    if (vm.ownerUserId !== user.id) throw new ForbiddenException("Forbidden");
  }
}
