import { Injectable } from "@nestjs/common";
import { ProxmoxService } from "../proxmox/proxmox.service";

@Injectable()
export class ClusterService {
  constructor(private readonly proxmox: ProxmoxService) {}

  async health() {
    let nodes: Array<Record<string, unknown>> = [];
    try {
      nodes = await this.proxmox.listNodes();
    } catch {
      return { nodes: [], quorum: null };
    }
    const detailed = await Promise.all(
      nodes.map(async (node) => {
        const nodeName = String(node.node ?? "");
        try {
          const status = await this.proxmox.nodeStatus(nodeName);
          const storageRaw = await this.proxmox.listNodeStorage(nodeName);
          // Proxmox returns either memory.{used,total,free} or top-level mem (total) + free
          const memNested = status.memory as { used?: number; total?: number; free?: number } | undefined;
          let memUsedBytes = Number(memNested?.used ?? 0);
          let memTotalBytes = Math.max(Number(memNested?.total ?? 0), 1);
          if (memTotalBytes <= 0 || (memUsedBytes === 0 && (status.mem != null || status.free != null))) {
            const total = Number(status.mem ?? 0);
            const free = Number(status.free ?? 0);
            memTotalBytes = Math.max(total, 1);
            memUsedBytes = Math.max(0, total - free);
          }

          const uptimeSec = Number(status.uptime ?? 0);
          return {
            node: nodeName,
            status: String(node.status ?? "unknown"),
            cpuUsagePercent: Math.round(Number(status.cpu ?? 0) * 10000) / 100,
            memUsedMB: Math.round(memUsedBytes / 1048576),
            memTotalMB: Math.round(memTotalBytes / 1048576),
            memPercent: Math.round((memUsedBytes / memTotalBytes) * 10000) / 100,
            uptimeSeconds: uptimeSec,
            uptimeFormatted: this.formatUptime(uptimeSec),
            loadavg: Array.isArray(status.loadavg) ? status.loadavg : [status.loadavg].filter(Boolean),
            storage: (storageRaw as Array<Record<string, unknown>>).map((s) => {
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
        } catch {
          return {
            node: nodeName,
            status: String(node.status ?? "offline"),
            cpuUsagePercent: 0,
            memUsedMB: 0,
            memTotalMB: 0,
            memPercent: 0,
            uptimeSeconds: 0,
            uptimeFormatted: "0d 0h 0m",
            storage: []
          };
        }
      })
    );

    let quorum: { quorate: boolean; nodes: number } | null = null;
    try {
      const clusterStatus = await this.proxmox.clusterStatus();
      const q = clusterStatus.find((item) => String(item.type) === "cluster");
      if (q) {
        quorum = {
          quorate: Number(q.quorate) === 1,
          nodes: Number(q.nodes ?? 0)
        };
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
