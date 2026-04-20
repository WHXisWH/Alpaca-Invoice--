import { createPrismaClient, InvoiceRepository, OutboxRepository } from "@alpaca/database";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  type DrainSubmissionResult,
  CreateInvoiceSubmissionWorker
} from "../modules/chain/create-invoice-worker";
import { buildInvoiceSubmissionGateway } from "../modules/chain/invoice-submission";
import {
  type DrainReconciliationResult,
  ReconcileInvoiceSubmissionsWorker
} from "../modules/chain/reconcile-invoice-submissions-worker";
import { buildTransactionReceiptReader } from "../modules/chain/receipt-reader";
import { runWithRedisLock } from "../modules/runtime/redis-lock";

export interface InvoiceSubmissionWorkerPort {
  drain(limit?: number): Promise<DrainSubmissionResult>;
}

export interface InvoiceReconciliationWorkerPort {
  drain(limit?: number): Promise<DrainReconciliationResult>;
}

const drainBodySchema = z
  .object({
    limit: z.number().int().positive().max(50).optional()
  })
  .optional();

const drainQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional()
});

type WorkerRouteOptions = {
  cronSecret?: string;
  redisUrl?: string;
  workerLockTtlMs?: number;
  runWithLock?: typeof runWithRedisLock;
};

export async function registerInternalWorkerRoutes(
  app: FastifyInstance,
  workers: {
    submission: InvoiceSubmissionWorkerPort;
    reconciliation: InvoiceReconciliationWorkerPort;
  } = buildDefaultWorkers(),
  options: WorkerRouteOptions = {}
) {
  const runtime = "runtime" in app ? app.runtime : undefined;
  const cronSecret = options.cronSecret ?? runtime?.CRON_SECRET ?? process.env.CRON_SECRET;
  const redisUrl = options.redisUrl ?? runtime?.REDIS_URL ?? process.env.REDIS_URL;
  const workerLockTtlMs = options.workerLockTtlMs ?? Number(runtime?.WORKER_LOCK_TTL_MS ?? process.env.WORKER_LOCK_TTL_MS ?? "55000");
  const withLock = options.runWithLock ?? runWithRedisLock;

  async function drainWorker<T>({
    workerName,
    limit,
    execute
  }: {
    workerName: string;
    limit: number | undefined;
    execute: (limit?: number) => Promise<T>;
  }) {
    if (redisUrl) {
      const outcome = await withLock({
        redisUrl,
        key: `alpaca:relayer:worker:${workerName}`,
        ttlMs: workerLockTtlMs,
        execute: () => execute(limit)
      });

      if (!outcome.locked) {
        return {
          drained: false,
          skipped: true,
          reason: "worker already running"
        };
      }

      return {
        drained: true,
        result: outcome.result
      };
    }

    return {
      drained: true,
      result: await execute(limit)
    };
  }

  function ensureAuthorized(authorizationHeader?: string) {
    if (!cronSecret) {
      return true;
    }

    return authorizationHeader === `Bearer ${cronSecret}`;
  }

  app.get("/api/internal/workers/invoice-submissions/drain", async (request, reply) => {
    if (!ensureAuthorized(request.headers.authorization)) {
      reply.code(401);
      return { error: "unauthorized" };
    }

    const query = drainQuerySchema.parse(request.query);

    return drainWorker({
      workerName: "invoice-submissions",
      limit: query.limit,
      execute: (limit) => workers.submission.drain(limit)
    });
  });

  app.post("/api/internal/workers/invoice-submissions/drain", async (request, reply) => {
    if (!ensureAuthorized(request.headers.authorization)) {
      reply.code(401);
      return { error: "unauthorized" };
    }

    const body = drainBodySchema.parse(request.body);

    return drainWorker({
      workerName: "invoice-submissions",
      limit: body?.limit,
      execute: (limit) => workers.submission.drain(limit)
    });
  });

  app.get("/api/internal/workers/invoice-reconciliation/drain", async (request, reply) => {
    if (!ensureAuthorized(request.headers.authorization)) {
      reply.code(401);
      return { error: "unauthorized" };
    }

    const query = drainQuerySchema.parse(request.query);

    return drainWorker({
      workerName: "invoice-reconciliation",
      limit: query.limit,
      execute: (limit) => workers.reconciliation.drain(limit)
    });
  });

  app.post("/api/internal/workers/invoice-reconciliation/drain", async (request, reply) => {
    if (!ensureAuthorized(request.headers.authorization)) {
      reply.code(401);
      return { error: "unauthorized" };
    }

    const body = drainBodySchema.parse(request.body);

    return drainWorker({
      workerName: "invoice-reconciliation",
      limit: body?.limit,
      execute: (limit) => workers.reconciliation.drain(limit)
    });
  });
}

export function buildDefaultWorkers() {
  const prisma = createPrismaClient();
  const repository = new InvoiceRepository(prisma);

  return {
    submission: new CreateInvoiceSubmissionWorker(
      repository,
      new OutboxRepository(prisma),
      buildInvoiceSubmissionGateway({
        FHENIX_RPC_URL: process.env.FHENIX_RPC_URL ?? "",
        RELAYER_CHAIN_ID: process.env.RELAYER_CHAIN_ID ?? "42069",
        RELAYER_PRIVATE_KEY: process.env.RELAYER_PRIVATE_KEY,
        RELAYER_INVOICE_REGISTRY_ADDRESS: process.env.RELAYER_INVOICE_REGISTRY_ADDRESS
      })
    ),
    reconciliation: new ReconcileInvoiceSubmissionsWorker(
      repository,
      buildTransactionReceiptReader({
        FHENIX_RPC_URL: process.env.FHENIX_RPC_URL ?? "",
        RELAYER_CHAIN_ID: process.env.RELAYER_CHAIN_ID ?? "42069"
      })
    )
  };
}
