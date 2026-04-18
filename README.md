# Alpaca Invoice Fhenix

Greenfield Fhenix rewrite of `alpaca-invoice`.

**Private by Default. Accountable by Design.**

**Confidential Invoicing, Verifiable Business.**

This repository is intentionally separate from the Aleo implementation. The goal is not to preserve Aleo execution assumptions inside the new codebase, but to carry forward the product strengths of Alpaca Invoice:

- premium frontend quality
- strong invoice domain modeling
- auditable privacy controls
- production-grade backend and operations boundaries
- explicit migration and legacy-read compatibility

## Repository Shape

```text
alpaca-invoice-fhenix/
  apps/
    web/         Next.js product frontend
    relayer/     Fastify backend for signatures, relay, decrypt jobs, webhooks
  packages/
    shared/      domain types, API contracts, shared validation
    ui/          shared design primitives and layout shells
    database/    Prisma schema and DB access package
    config/      runtime config helpers and env contracts
  contracts/     Solidity + Foundry for Fhenix contracts
  infra/         local infra and deployment helpers
  docs/          architecture, ADRs, migration execution notes
```

## Working Rules

1. Aleo-specific execution concepts do not enter this repository.
2. Shared package contracts are the system boundary between frontend, relayer, and database.
3. Contracts are append-only from a state migration perspective; relayer and DB handle projections.
4. Legacy Aleo data is treated as import or archive input, never as a runtime dependency.
5. The frontend is designed as a first-class product, not an admin console.

## First Build Slices

1. Contracts and shared domain contracts
2. Relayer and database foundations
3. Frontend shell and authenticated invoice flows
4. Audit, decrypt polling, escrow, and dispute modules
5. Legacy import and operational hardening

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the target architecture.
See [docs/IMPLEMENTATION_TRACKER.md](./docs/IMPLEMENTATION_TRACKER.md) for the execution checklist and current completion state.

## Infrastructure Stance

This repository does **not** require Docker in production.

- Production database can remain Vercel Postgres or another managed PostgreSQL provider.
- `infra/docker-compose.dev.yml` exists only as a local development convenience so relayer, Prisma, and queue-backed workflows can run against disposable Postgres and Redis.
- If you prefer Vercel Postgres locally or in preview environments, that is valid. Docker is optional, not architectural policy.
