import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import * as https from "https";

@Injectable()
export class ProxmoxService {
  private readonly logger = new Logger(ProxmoxService.name);
  private readonly client: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    const host = this.config.getOrThrow<string>("PROXMOX_HOST");
    const tokenId = this.config.getOrThrow<string>("PROXMOX_TOKEN_ID");
    const tokenSecret = this.config.getOrThrow<string>("PROXMOX_TOKEN_SECRET");
    const tlsInsecure = this.config.get("PROXMOX_TLS_INSECURE", "false") === "true";

    this.client = axios.create({
      baseURL: `https://${host}:8006/api2/json`,
      httpsAgent: new https.Agent({ rejectUnauthorized: !tlsInsecure }),
      headers: {
        Authorization: `PVEAPIToken=${tokenId}=${tokenSecret}`
      },
      timeout: 30000
    });
  }

  private async get<T>(url: string): Promise<T> {
    const { data } = await this.client.get(url);
    return data.data as T;
  }

  private async post<T>(url: string, body?: Record<string, unknown>): Promise<T> {
    const { data } = await this.client.post(url, body);
    return data.data as T;
  }

  private async del<T>(url: string): Promise<T> {
    const { data } = await this.client.delete(url);
    return data.data as T;
  }

  listNodes() {
    return this.get<Array<Record<string, unknown>>>("/nodes");
  }

  nodeStatus(node: string) {
    return this.get<Record<string, unknown>>(`/nodes/${node}/status`);
  }

  listNodeStorage(node: string) {
    return this.get<Array<Record<string, unknown>>>(`/nodes/${node}/storage`);
  }

  listQemu(node: string) {
    return this.get<Array<Record<string, unknown>>>(`/nodes/${node}/qemu`);
  }

  getQemuConfig(node: string, vmid: number) {
    return this.get<Record<string, unknown>>(`/nodes/${node}/qemu/${vmid}/config`);
  }

  cloneQemu(node: string, templateVmid: number, payload: { newid?: number; name: string; full?: number }) {
    return this.post<string>(`/nodes/${node}/qemu/${templateVmid}/clone`, {
      full: 1,
      ...payload
    });
  }

  setConfig(node: string, vmid: number, cfg: Record<string, unknown>) {
    return this.post<string>(`/nodes/${node}/qemu/${vmid}/config`, cfg);
  }

  resizeDisk(node: string, vmid: number, disk: string, size: string) {
    return this.post<string>(`/nodes/${node}/qemu/${vmid}/resize`, { disk, size });
  }

  startVm(node: string, vmid: number) {
    return this.post<string>(`/nodes/${node}/qemu/${vmid}/status/start`);
  }

  stopVm(node: string, vmid: number) {
    return this.post<string>(`/nodes/${node}/qemu/${vmid}/status/stop`);
  }

  rebootVm(node: string, vmid: number) {
    return this.post<string>(`/nodes/${node}/qemu/${vmid}/status/reboot`);
  }

  deleteVm(node: string, vmid: number) {
    return this.del<string>(`/nodes/${node}/qemu/${vmid}`);
  }

  migrate(node: string, vmid: number, target: string) {
    return this.post<string>(`/nodes/${node}/qemu/${vmid}/migrate`, { target, online: 1 });
  }

  taskStatus(node: string, upid: string) {
    return this.get<Record<string, unknown>>(`/nodes/${node}/tasks/${encodeURIComponent(upid)}/status`);
  }

  async waitForTask(node: string, upid: string, timeoutSec = 180) {
    const start = Date.now();
    while ((Date.now() - start) / 1000 < timeoutSec) {
      const status = await this.taskStatus(node, upid);
      if (status.exitstatus || status.status === "stopped") {
        return status;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error(`Task timeout for ${upid}`);
  }

  async findVmNode(vmid: number) {
    try {
      const resources = await this.get<Array<Record<string, unknown>>>("/cluster/resources?type=vm");
      const found = resources.find((r) => Number(r.vmid) === vmid);
      if (found?.node) {
        return String(found.node);
      }
    } catch (error) {
      this.logger.warn(`cluster/resources lookup failed: ${String(error)}`);
    }

    const nodes = await this.listNodes();
    for (const node of nodes) {
      const nodeName = String(node.node);
      const qemus = await this.listQemu(nodeName);
      const exists = qemus.some((vm) => Number(vm.vmid) === vmid);
      if (exists) {
        return nodeName;
      }
    }

    return null;
  }

  listStorageContent(node: string, storage: string, contentType = "iso") {
    return this.get<Array<Record<string, unknown>>>(`/nodes/${node}/storage/${storage}/content?content=${contentType}`);
  }

  createQemu(node: string, config: Record<string, unknown>) {
    return this.post<string>(`/nodes/${node}/qemu`, config);
  }

  getQemuStatus(node: string, vmid: number) {
    return this.get<Record<string, unknown>>(`/nodes/${node}/qemu/${vmid}/status/current`);
  }

  async listAllIsos() {
    const nodes = await this.listNodes();
    const isos: Array<{ node: string; storage: string; volid: string; name: string; size: number }> = [];
    for (const node of nodes) {
      const nodeName = String(node.node ?? "");
      if (!nodeName) continue;
      let storages: Array<Record<string, unknown>> = [];
      try {
        storages = await this.listNodeStorage(nodeName);
      } catch {
        continue;
      }
      for (const s of storages) {
        const content = s.content != null ? String(s.content) : "";
        if (!content.includes("iso")) continue;
        try {
          const files = await this.listStorageContent(nodeName, String(s.storage ?? ""), "iso");
          const list = Array.isArray(files) ? files : [];
          for (const f of list) {
            const volid = String(f.volid ?? "");
            if (!volid) continue;
            isos.push({
              node: nodeName,
              storage: String(s.storage ?? ""),
              volid,
              name: volid.split("/").pop() ?? volid,
              size: Number(f.size ?? 0)
            });
          }
        } catch (err) {
          this.logger.warn(`Failed listing ISOs on ${nodeName}/${String(s.storage)}: ${String(err)}`);
        }
      }
    }
    return isos;
  }

  listHaResources() {
    return this.get<Array<Record<string, unknown>>>("/cluster/ha/resources");
  }

  clusterStatus() {
    return this.get<Array<Record<string, unknown>>>("/cluster/status");
  }

  addHaResource(vmid: number, group?: string) {
    return this.post<string>("/cluster/ha/resources", {
      type: "vm",
      sid: `vm:${vmid}`,
      state: "started",
      ...(group ? { group } : {})
    });
  }

  removeHaResource(vmid: number) {
    return this.del<string>(`/cluster/ha/resources/vm:${vmid}`);
  }
}
