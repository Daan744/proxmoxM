import { Injectable } from "@nestjs/common";
import { ProxmoxService } from "../proxmox/proxmox.service";

@Injectable()
export class ClusterService {
  constructor(private readonly proxmox: ProxmoxService) {}

  async health() {
    const nodes = await this.proxmox.listNodes();
    const detailed = await Promise.all(
      nodes.map(async (node) => {
        const nodeName = String(node.node);
        const status = await this.proxmox.nodeStatus(nodeName);
        const storageRaw = await this.proxmox.listNodeStorage(nodeName);
        const mem = (status.memory as { used?: number; total?: number } | undefined) ?? {};
        const memUsedBytes = Number(mem.used ?? 0);
        const memTotalBytes = Math.max(Number(mem.total ?? 1), 1);

        return {
          node: nodeName,
          status: String(node.status),
          cpuUsagePercent: Math.round(Number(status.cpu ?? 0) * 10000) / 100,
          memUsedMB: Math.round(memUsedBytes / 1048576),
          memTotalMB: Math.round(memTotalBytes / 1048576),
          memPercent: Math.round((memUsedBytes / memTotalBytes) * 10000) / 100,
          uptimeSeconds: Number(status.uptime ?? 0),
          uptimeFormatted: this.formatUptime(Number(status.uptime ?? 0)),
          storage: storageRaw.map((s) => {
            const used = Number(s.used ?? 0);
            const total = Math.max(Number(s.total ?? 1), 1);
            const avail = Number(s.avail ?? 0);
            return {
              name: String(s.storage),
              type: String(s.type ?? "unknown"),
              usedGB: Math.round((used / 1073741824) * 100) / 100,
              totalGB: Math.round((total / 1073741824) * 100) / 100,
              freeGB: Math.round((avail / 1073741824) * 100) / 100,
              percentUsed: Math.round((used / total) * 10000) / 100
            };
          })
        };
      })
    );

    let quorum: { quorate: boolean; nodes: number } | null = null;
    try {
      const clusterStatus = await this.proxmox.clusterStatus();
      const q = clusterStatus.find((item) => String(item.type) === "cluster");
      if (q) {
        quorum = { quorate: Number(q.quorate) === 1, nodes: Number(q.nodes ?? 0) };
      }
    } catch {
      quorum = null;
    }

    return { nodes: detailed, quorum };
  }

  haResources() {
    return this.proxmox.listHaResources();
  }

  private formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  }
}
