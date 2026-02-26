# Proxmox Self-Service Portal (NestJS + Next.js)

Productieklare basis voor een Proxmox VE self-service portal met:
- Node-aware provisioning (AUTO placement + fallback)
- HA-aware VM lifecycle
- RBAC (`USER`, `ADMIN`)
- Async provisioning en periodieke status sync via BullMQ
- Docker Compose stack (frontend, backend, postgres, redis)

## Stack

- Monorepo
  - `apps/backend`: NestJS + TypeScript
  - `apps/frontend`: Next.js App Router + TypeScript + Tailwind
- Database: PostgreSQL + Prisma
- Queue: BullMQ + Redis
- Auth: JWT access token + refresh token rotatie in HttpOnly cookie
- Security: `helmet`, rate limiting, input validation (`class-validator`), request body size limit

## Feature overview

### Admin
- Templates beheren (`CRUD`) + Proxmox sync
- VM provisioning (zelfde flow als user-provisioning)
  - owner kan gekozen worden
  - quota optioneel toepassen via `APPLY_QUOTA_TO_ADMIN`
- VM actions: start/stop/reboot/delete/migrate
- Users beheren (rol + quota)
- Audit logs bekijken
- Cluster health bekijken (nodes, storage, quorum best effort, HA resources)

### User
- Alleen eigen VM’s zien
- Provisioning alleen als `ALLOW_USER_PROVISIONING=true`
- Quota checks op provisioning
- Actions op eigen VM’s (start/stop/reboot/delete)

## Architectuur

### Backend modules
- `auth`: register/login/refresh/logout + jwt strategy
- `templates`: CRUD + sync vanuit Proxmox
- `vms`: create/list/get/actions/migrate
- `admin`: users + audit logs
- `cluster`: health + HA resources
- `proxmox`: axios wrapper voor Proxmox API
- `queue`: BullMQ provisioning worker + repeatable sync job
- `audit`: centrale audit logging service

### Provisioning flow (`provision-vm`)
1. VM record laden + template + owner
2. Quota check (admin bypass afhankelijk van config)
3. Node kiezen
   - requested node als expliciet
   - anders AUTO scoring:
     - alleen online nodes
     - threshold checks (`MIN_FREE_DISK_GB`, `MAX_CPU_PCT_FOR_AUTO`, `MAX_MEM_PCT_FOR_AUTO`)
     - score = `cpu*0.6 + mem*0.4 + penalty`
4. Clone template
5. Config toepassen (cores/memory/net)
6. Disk resize indien nodig
7. HA resource registreren (best effort)
8. VM starten
9. DB status updaten + audit log
10. Bij fout: `FAILED` + `errorMessage`

### Failover awareness / sync
- Repeatable job: `sync-vm-status` elke `PROXMOX_SYNC_EVERY_MS`
- Voor elke VM (niet deleted):
  - `findVmNode(vmid)`
  - power state bepalen
  - `currentNode`, `powerState`, `status`, `lastStatusSyncAt` updaten

## API routes

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

### Templates
- `GET /templates` (authenticated)
- `POST /templates` (ADMIN)
- `PATCH /templates/:id` (ADMIN)
- `DELETE /templates/:id` (ADMIN)
- `POST /templates/sync` (ADMIN)

### VMs
- `GET /vms`
- `POST /vms`
- `GET /vms/:id`
- `POST /vms/:id/start`
- `POST /vms/:id/stop`
- `POST /vms/:id/reboot`
- `DELETE /vms/:id`
- `POST /vms/:id/migrate` (ADMIN)

### Admin
- `GET /admin/users`
- `PATCH /admin/users/:id`
- `GET /admin/audit-logs`

### Cluster
- `GET /cluster/health`
- `GET /cluster/ha/resources`

## Proxmox API wrapper

Geimplementeerd in `apps/backend/src/proxmox/proxmox.service.ts` met o.a.:
- `listNodes`, `nodeStatus`, `listNodeStorage`
- `listQemu`, `getQemuConfig`, `cloneQemu`, `setConfig`, `resizeDisk`
- `startVm`, `stopVm`, `rebootVm`, `deleteVm`, `migrate`
- `taskStatus`, `waitForTask`, `findVmNode`
- `listHaResources`, `addHaResource`, `removeHaResource`

> Let op: HA endpoints verschillen soms per Proxmox versie. In deze code is dit best effort geimplementeerd; pas endpoint paths/params aan waar nodig.

## Prisma models

In `apps/backend/prisma/schema.prisma`:
- `User`
- `RefreshToken`
- `Template`
- `Vm`
- `AuditLog`

Enums:
- `Role`
- `TemplateNodeScope`
- `VmPowerState`
- `VmStatus`

## Frontend pages

- `/login`
- `/register`
- `/dashboard`
- `/vms`
- `/vms/new`
- `/vms/[id]`
- `/admin/templates`
- `/admin/users`
- `/admin/audit`
- `/admin/cluster`

UI bevat:
- dark mode layout
- role-based sidebar
- VM table + actions
- basis forms/wizard

## Docker Compose

Services:
- `db` (postgres)
- `redis`
- `backend` (Nest)
- `frontend` (Next)

Inclusief healthchecks en volume `pgdata`.

## Quick start

1. Kopieer env:

```bash
cp .env.example .env
```

2. Vul Proxmox variabelen in `.env`:
- `PROXMOX_HOST`
- `PROXMOX_TOKEN_ID`
- `PROXMOX_TOKEN_SECRET`
- `PROXMOX_TLS_INSECURE=true` alleen voor dev/self-signed

3. Start stack:

```bash
docker compose up --build
```

4. Open:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001/health`

## Local build checks (zonder Docker)

```bash
npm install
npm --workspace apps/backend run build
npm --workspace apps/frontend run build
```

## Seed data

Seed draait in backend container startup:
- admin user:
  - email: `admin@example.local`
  - password: `Admin123!`
- 2 placeholder templates

### BELANGRIJKE SECURITY WAARSCHUWING

- Verander `SEED_ADMIN_PASSWORD` direct
- Gebruik seeded default credentials nooit in productie
- Zet `PROXMOX_TLS_INSECURE=false` in productie
- Gebruik sterke JWT secrets
- Gebruik restricted Proxmox API token scopes

## Belangrijke configuratie (`.env`)

### Feature flags
- `ALLOW_USER_PROVISIONING=true|false`
- `APPLY_QUOTA_TO_ADMIN=true|false`

### AUTO placement thresholds
- `MIN_FREE_DISK_GB`
- `MAX_CPU_PCT_FOR_AUTO`
- `MAX_MEM_PCT_FOR_AUTO`

### Security
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN_DAYS`
- `COOKIE_SECURE`
- `API_RATE_LIMIT_TTL_SEC`
- `API_RATE_LIMIT_MAX`
- `REQUEST_BODY_LIMIT`

### Queue/sync
- `PROXMOX_SYNC_EVERY_MS`

## Repository structuur

```text
.
+- docker-compose.yml
+- .env.example
+- package.json
+- apps/
   +- backend/
   ¦  +- Dockerfile
   ¦  +- prisma/
   ¦  ¦  +- schema.prisma
   ¦  ¦  +- seed.ts
   ¦  ¦  +- migrations/
   ¦  ¦     +- 0001_init/migration.sql
   ¦  +- src/
   ¦     +- main.ts
   ¦     +- app.module.ts
   ¦     +- auth/
   ¦     +- templates/
   ¦     +- vms/
   ¦     +- admin/
   ¦     +- cluster/
   ¦     +- proxmox/
   ¦     +- queue/
   ¦     +- audit/
   ¦     +- prisma/
   ¦     +- common/
   +- frontend/
      +- Dockerfile
      +- src/
         +- app/
         +- components/
         +- lib/
```

## Productie aandachtspunten

- Voeg HTTPS termination toe (reverse proxy)
- Restrict CORS origin(s)
- Harden cookies (`secure=true`, sameSite policy)
- Zet rate limits strakker per endpoint
- Voeg uitgebreide e2e/integration tests toe
- Maak migrations strategy en backup/restore runbooks
- Voeg observability toe (metrics/log aggregation/tracing)

## Bekende beperkingen in deze basis

- UI is functioneel, maar bewust minimal gehouden
- Sommige Proxmox responses zijn dynamisch getypeerd (best effort parsing)
- HA start is via standaard start + HA registration verify pattern
- Migrate endpoint is admin-only en simple implementation

