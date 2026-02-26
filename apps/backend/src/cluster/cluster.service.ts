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
        const storage = await this.proxmox.listNodeStorage(nodeName);
        return {
          node: nodeName,
          status: node.status,
          cpu: status.cpu,
          memory: status.memory,
          uptime: status.uptime,
          storage
        };
      })
    );

    let quorum: Record<string, unknown> | null = null;
    try {
      const clusterStatus = await this.proxmox.clusterStatus();
      quorum = clusterStatus.find((item) => item.type === "quorum") ?? null;
    } catch {
      quorum = null;
    }

    return { nodes: detailed, quorum };
  }

  haResources() {
    return this.proxmox.listHaResources();
  }
}
