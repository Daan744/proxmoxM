import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { VmPowerState, VmStatus } from "@prisma/client";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProxmoxService } from "../proxmox/proxmox.service";

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly connection: IORedis;
  private readonly queue: Queue;
  private worker?: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly proxmox: ProxmoxService,
    private readonly audit: AuditService
  ) {
    this.connection = new IORedis(this.config.get("REDIS_URL", "redis://redis:6379"), {
      maxRetriesPerRequest: null
    });
    this.queue = new Queue("provisioning", { connection: this.connection });
  }

  async onModuleInit() {
    this.worker = new Worker(
      "provisioning",
      async (job) => {
        if (job.name === "provision-vm") await this.processProvision(String(job.data.vmId));
        if (job.name === "sync-vm-status") await this.processSyncVmStatus();
      },
      { connection: this.connection }
    );

    this.worker.on("failed", (job, error) => {
      this.logger.error(`Job ${job?.name} failed: ${String(error)}`);
    });

    await this.queue.add(
      "sync-vm-status",
      {},
      {
        repeat: { every: Number(this.config.get("PROXMOX_SYNC_EVERY_MS", "120000")) },
        jobId: "sync-vm-status-repeat"
      }
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue.close();
    await this.connection.quit();
  }

  enqueueProvisionVm(vmId: string) {
    return this.queue.add("provision-vm", { vmId }, { attempts: 2 });
  }

  private async processProvision(vmId: string) {
    const vm = await this.prisma.vm.findUnique({
      where: { id: vmId },
      include: { template: true, ownerUser: true }
    });
    if (!vm || !vm.template || vm.deletedAt) return;

    try {
      await this.validateQuota(vm.ownerUserId, vm.id);
      let selectedNode = await this.resolveNode(vm.requestedNode, vm.template.sourceNode);
      try {
        const upid = await this.proxmox.cloneQemu(selectedNode, vm.template.templateVmid, {
          newid: vm.vmid,
          name: vm.name
        });
        await this.proxmox.waitForTask(selectedNode, upid, 300);
      } catch {
        const fallback = await this.findFallbackNode(selectedNode);
        if (!fallback) throw new Error("No fallback node available");
        selectedNode = fallback;
        const upid = await this.proxmox.cloneQemu(selectedNode, vm.template.templateVmid, {
          newid: vm.vmid,
          name: vm.name
        });
        await this.proxmox.waitForTask(selectedNode, upid, 300);
      }

      const net0 = `virtio,bridge=${vm.bridge ?? vm.template.defaultBridge ?? "vmbr0"}${
        vm.vlanTag ? `,tag=${vm.vlanTag}` : ""
      }`;
      await this.proxmox.setConfig(selectedNode, vm.vmid, { cores: vm.cores, memory: vm.memoryMB, net0 });

      if (vm.diskGB > vm.template.minDiskGB) {
        await this.proxmox.resizeDisk(selectedNode, vm.vmid, "scsi0", `+${vm.diskGB - vm.template.minDiskGB}G`);
      }

      if (vm.haEnabled) {
        await this.proxmox.addHaResource(vm.vmid, vm.haGroup ?? vm.template.haGroup ?? undefined);
      }

      const startUpid = await this.proxmox.startVm(selectedNode, vm.vmid);
      await this.proxmox.waitForTask(selectedNode, startUpid, 180);

      await this.prisma.vm.update({
        where: { id: vm.id },
        data: {
          currentNode: selectedNode,
          status: VmStatus.RUNNING,
          powerState: VmPowerState.RUNNING,
          errorMessage: null,
          lastStatusSyncAt: new Date()
        }
      });
      await this.audit.log({
        userId: vm.ownerUserId,
        action: "vm.provision.success",
        targetType: "Vm",
        targetId: vm.id,
        meta: { node: selectedNode, vmid: vm.vmid }
      });
    } catch (error) {
      await this.prisma.vm.update({
        where: { id: vm.id },
        data: { status: VmStatus.FAILED, errorMessage: String(error), lastStatusSyncAt: new Date() }
      });
      await this.audit.log({
        userId: vm.ownerUserId,
        action: "vm.provision.failed",
        targetType: "Vm",
        targetId: vm.id,
        meta: { error: String(error) }
      });
      throw error;
    }
  }

  private async processSyncVmStatus() {
    const vms = await this.prisma.vm.findMany({ where: { deletedAt: null } });
    for (const vm of vms) {
      const node = await this.proxmox.findVmNode(vm.vmid);
      let powerState: VmPowerState = VmPowerState.UNKNOWN;
      if (node) {
        const all = await this.proxmox.listQemu(node);
        const found = all.find((x) => Number(x.vmid) === vm.vmid);
        powerState = found?.status === "running" ? VmPowerState.RUNNING : VmPowerState.STOPPED;
      }
      await this.prisma.vm.update({
        where: { id: vm.id },
        data: {
          currentNode: node ?? null,
          powerState,
          status: powerState === VmPowerState.RUNNING ? VmStatus.RUNNING : VmStatus.STOPPED,
          lastStatusSyncAt: new Date()
        }
      });
    }
  }

  private async validateQuota(ownerUserId: string | null, vmId: string) {
    if (!ownerUserId) return;
    const vm = await this.prisma.vm.findUnique({ where: { id: vmId } });
    const owner = await this.prisma.user.findUnique({ where: { id: ownerUserId } });
    if (!owner || !vm) return;
    const applyToAdmin = this.config.get("APPLY_QUOTA_TO_ADMIN", "false") === "true";
    if (owner.role === "ADMIN" && !applyToAdmin) return;

    const existing = await this.prisma.vm.findMany({
      where: { ownerUserId, deletedAt: null, status: { not: VmStatus.FAILED } }
    });
    const used = existing.reduce(
      (acc: { cores: number; memory: number; disk: number }, item) => {
        acc.cores += item.cores;
        acc.memory += item.memoryMB;
        acc.disk += item.diskGB;
        return acc;
      },
      { cores: 0, memory: 0, disk: 0 }
    );
    if (existing.length > owner.quotaMaxVMs) throw new Error("Quota exceeded: max VMs");
    if (used.cores > owner.quotaMaxCoresTotal) throw new Error("Quota exceeded: cores");
    if (used.memory > owner.quotaMaxMemoryMBTotal) throw new Error("Quota exceeded: memory");
    if (used.disk > owner.quotaMaxDiskGBTotal) throw new Error("Quota exceeded: disk");
  }

  private async resolveNode(requestedNode: string, templateSourceNode: string | null) {
    if (requestedNode && requestedNode !== "AUTO") return requestedNode;
    if (templateSourceNode) return templateSourceNode;

    const minFreeDisk = Number(this.config.get("MIN_FREE_DISK_GB", "20"));
    const maxCpuPct = Number(this.config.get("MAX_CPU_PCT_FOR_AUTO", "90"));
    const maxMemPct = Number(this.config.get("MAX_MEM_PCT_FOR_AUTO", "90"));
    const nodes = await this.proxmox.listNodes();
    const candidates: Array<{ node: string; score: number }> = [];

    for (const node of nodes) {
      if (node.status !== "online") continue;
      const nodeName = String(node.node);
      const status = await this.proxmox.nodeStatus(nodeName);
      const storages = await this.proxmox.listNodeStorage(nodeName);
      const cpuPct = Number(status.cpu ?? 0) * 100;
      const memory = (status.memory as { used?: number; total?: number } | undefined) ?? {};
      const memPct = (Number(memory.used ?? 0) / Math.max(Number(memory.total ?? 1), 1)) * 100;
      const freeBytes = storages.reduce((sum, s) => sum + Number(s.avail ?? 0), 0);
      const freeDiskGb = freeBytes / (1024 ** 3);
      if (cpuPct > maxCpuPct || memPct > maxMemPct) continue;
      const penalty = freeDiskGb < minFreeDisk ? 50 : 0;
      candidates.push({ node: nodeName, score: cpuPct * 0.6 + memPct * 0.4 + penalty });
    }

    if (candidates.length === 0) throw new Error("No eligible nodes for AUTO placement");
    return candidates.sort((a, b) => a.score - b.score)[0].node;
  }

  private async findFallbackNode(failedNode: string) {
    const nodes = await this.proxmox.listNodes();
    const candidate = nodes.find((n) => n.status === "online" && String(n.node) !== failedNode);
    return candidate ? String(candidate.node) : null;
  }
}
