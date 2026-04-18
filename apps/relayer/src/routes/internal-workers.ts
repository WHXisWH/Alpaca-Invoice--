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

export interface InvoiceSubmissionWorkerPort {
  drain(limit?: number): Promise<DrainSubmissionResult>;
}

export interface InvoiceReconciliationWorkerPort {
  drain(limit?: number): Promise<DrainReconciliationResult>;
}

export async function registerInternalWorkerRoutes(
  app: FastifyInstance,
  workers: {
    submission: InvoiceSubmissionWorkerPort;
    reconciliation: InvoiceReconciliationWorkerPort;
  } = buildDefaultWorkers()
) {
  app.post("/api/internal/workers/invoice-submissions/drain", async (request) => {
    const body = z
      .object({
        limit: z.number().int().positive().max(50).optional()
      })
      .optional()
      .parse(request.body);

    const result = await workers.submission.drain(body?.limit);

    return {
      drained: true,
      result
    };
  });

  app.post("/api/internal/workers/invoice-reconciliation/drain", async (request) => {
    const body = z
      .object({
        limit: z.number().int().positive().max(50).optional()
      })
      .optional()
      .parse(request.body);

    const result = await workers.reconciliation.drain(body?.limit);

    return {
      drained: true,
      result
    };
  });
}

function buildDefaultWorkers() {
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
