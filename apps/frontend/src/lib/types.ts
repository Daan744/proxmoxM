export interface Vm {
  id: string;
  ownerUserId: string | null;
  templateId: string | null;
  isoPath: string | null;
  name: string;
  vmid: number;
  requestedNode: string;
  currentNode: string | null;
  cores: number;
  memoryMB: number;
  diskGB: number;
  bridge: string | null;
  vlanTag: number | null;
  haEnabled: boolean;
  haGroup: string | null;
  ciUser: string | null;
  ciSshKey: string | null;
  powerState: "RUNNING" | "STOPPED" | "UNKNOWN";
  status: "PROVISIONING" | "RUNNING" | "STOPPED" | "FAILED" | "DELETED";
  ipAddress: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  lastStatusSyncAt: string | null;
}

export interface VmLive extends Vm {
  live: {
    cpu: number;
    mem: number;
    maxmem: number;
    disk: number;
    maxdisk: number;
    netin: number;
    netout: number;
    status: string;
    uptime: number;
    pid: number;
  } | null;
}

export interface Template {
  id: string;
  name: string;
  nodeScope: "CLUSTER" | "NODE_ONLY";
  sourceNode: string | null;
  templateVmid: number;
  storage: string | null;
  defaultBridge: string | null;
  defaultVlanTag: number | null;
  minCores: number;
  maxCores: number;
  minMemoryMB: number;
  maxMemoryMB: number;
  minDiskGB: number;
  maxDiskGB: number;
  haEnabledDefault: boolean;
  haGroup: string | null;
  allowUserNodeSelect: boolean;
  allowHaToggle: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  quotaMaxVMs: number;
  quotaMaxCoresTotal: number;
  quotaMaxMemoryMBTotal: number;
  quotaMaxDiskGBTotal: number;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metaJson: Record<string, unknown> | null;
  createdAt: string;
}

export interface ClusterNode {
  node: string;
  status: string;
  cpuUsagePercent: number;
  memUsedMB: number;
  memTotalMB: number;
  memPercent: number;
  uptimeSeconds: number;
  uptimeFormatted: string;
  loadavg?: number[];
  storage: StorageInfo[];
}

export interface StorageInfo {
  name: string;
  type: string;
  usedGB: number;
  totalGB: number;
  freeGB: number;
  percentUsed: number;
}

export interface IsoFile {
  node: string;
  storage: string;
  volid: string;
  name: string;
  size: number;
}

export interface ProxmoxNode {
  node: string;
  status: string;
  cpu?: number;
  maxcpu?: number;
  mem?: number;
  maxmem?: number;
}
