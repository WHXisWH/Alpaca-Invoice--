import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import {
  registerInternalWorkerRoutes,
  type InvoiceReconciliationWorkerPort,
  type InvoiceSubmissionWorkerPort
} from "./internal-workers";

async function buildTestApp(
  submission: InvoiceSubmissionWorkerPort,
  reconciliation: InvoiceReconciliationWorkerPort
) {
  const app = Fastify();
  await registerInternalWorkerRoutes(app, {
    submission,
    reconciliation
  });
  return app;
}

describe("internal worker routes", () => {
  it("drains the invoice submission worker with the provided limit", async () => {
    const submission: InvoiceSubmissionWorkerPort = {
      drain: vi.fn().mockResolvedValue({
        scanned: 3,
        claimed: 3,
        published: 2,
        failed: 1,
        skipped: 0
      })
    };
    const reconciliation: InvoiceReconciliationWorkerPort = {
      drain: vi.fn().mockResolvedValue({
        scanned: 0,
        reconciled: 0,
        pending: 0,
        reverted: 0,
        failed: 0
      })
    };
    const app = await buildTestApp(submission, reconciliation);

    const response = await app.inject({
      method: "POST",
      url: "/api/internal/workers/invoice-submissions/drain",
      payload: {
        limit: 10
      }
    });

    expect(response.statusCode).toBe(200);
    expect(submission.drain).toHaveBeenCalledWith(10);
    expect(response.json()).toEqual({
      drained: true,
      result: {
        scanned: 3,
        claimed: 3,
        published: 2,
        failed: 1,
        skipped: 0
      }
    });
  });

  it("drains the invoice reconciliation worker with the provided limit", async () => {
    const submission: InvoiceSubmissionWorkerPort = {
      drain: vi.fn().mockResolvedValue({
        scanned: 0,
        claimed: 0,
        published: 0,
        failed: 0,
        skipped: 0
      })
    };
    const reconciliation: InvoiceReconciliationWorkerPort = {
      drain: vi.fn().mockResolvedValue({
        scanned: 4,
        reconciled: 2,
        pending: 1,
        reverted: 1,
        failed: 0
      })
    };
    const app = await buildTestApp(submission, reconciliation);

    const response = await app.inject({
      method: "POST",
      url: "/api/internal/workers/invoice-reconciliation/drain",
      payload: {
        limit: 8
      }
    });

    expect(response.statusCode).toBe(200);
    expect(reconciliation.drain).toHaveBeenCalledWith(8);
    expect(response.json()).toEqual({
      drained: true,
      result: {
        scanned: 4,
        reconciled: 2,
        pending: 1,
        reverted: 1,
        failed: 0
      }
    });
  });
});
