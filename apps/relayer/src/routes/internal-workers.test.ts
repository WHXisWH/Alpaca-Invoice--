import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import {
  registerInternalWorkerRoutes,
  type InvoiceReconciliationWorkerPort,
  type InvoiceSubmissionWorkerPort
} from "./internal-workers";

async function buildTestApp(
  submission: InvoiceSubmissionWorkerPort,
  reconciliation: InvoiceReconciliationWorkerPort,
  options: Parameters<typeof registerInternalWorkerRoutes>[2] = {}
) {
  const app = Fastify();
  await registerInternalWorkerRoutes(app, {
    submission,
    reconciliation
  }, options);
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

  it("accepts cron-style GET requests with bearer auth", async () => {
    const submission: InvoiceSubmissionWorkerPort = {
      drain: vi.fn().mockResolvedValue({
        scanned: 2,
        claimed: 2,
        published: 2,
        failed: 0,
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
    const app = await buildTestApp(submission, reconciliation, {
      cronSecret: "test-cron-secret-1234"
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/internal/workers/invoice-submissions/drain?limit=6",
      headers: {
        authorization: "Bearer test-cron-secret-1234"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(submission.drain).toHaveBeenCalledWith(6);
    expect(response.json()).toEqual({
      drained: true,
      result: {
        scanned: 2,
        claimed: 2,
        published: 2,
        failed: 0,
        skipped: 0
      }
    });
  });

  it("rejects unauthenticated worker drain requests when a cron secret is configured", async () => {
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
        scanned: 0,
        reconciled: 0,
        pending: 0,
        reverted: 0,
        failed: 0
      })
    };
    const app = await buildTestApp(submission, reconciliation, {
      cronSecret: "test-cron-secret-1234"
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/internal/workers/invoice-reconciliation/drain"
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "unauthorized"
    });
    expect(reconciliation.drain).not.toHaveBeenCalled();
  });

  it("skips a worker run when the distributed lock cannot be acquired", async () => {
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
        scanned: 0,
        reconciled: 0,
        pending: 0,
        reverted: 0,
        failed: 0
      })
    };
    const app = await buildTestApp(submission, reconciliation, {
      redisUrl: "redis://example",
      runWithLock: vi.fn().mockResolvedValue({ locked: false })
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/internal/workers/invoice-submissions/drain",
      payload: {
        limit: 4
      }
    });

    expect(response.statusCode).toBe(200);
    expect(submission.drain).not.toHaveBeenCalled();
    expect(response.json()).toEqual({
      drained: false,
      skipped: true,
      reason: "worker already running"
    });
  });
});
