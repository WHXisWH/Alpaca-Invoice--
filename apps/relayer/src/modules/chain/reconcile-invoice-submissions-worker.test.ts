import { describe, expect, it, vi } from "vitest";
import { ReconcileInvoiceSubmissionsWorker } from "./reconcile-invoice-submissions-worker";

describe("ReconcileInvoiceSubmissionsWorker", () => {
  it("marks successful receipts as reconciled", async () => {
    const projections = {
      listPendingChainSubmissions: vi.fn().mockResolvedValue([
        {
          invoiceId: "inv_123",
          txHash: "0xtx"
        }
      ]),
      markChainReconciled: vi.fn().mockResolvedValue(undefined),
      markChainReverted: vi.fn().mockResolvedValue(undefined),
      markSubmissionFailure: vi.fn().mockResolvedValue(undefined)
    };
    const receipts = {
      getTransactionReceipt: vi.fn().mockResolvedValue({
        status: "success",
        blockNumber: "99"
      })
    };

    const worker = new ReconcileInvoiceSubmissionsWorker(projections, receipts);
    const result = await worker.drain();

    expect(result).toEqual({
      scanned: 1,
      reconciled: 1,
      pending: 0,
      reverted: 0,
      failed: 0
    });
    expect(projections.markChainReconciled).toHaveBeenCalledWith("inv_123", "99");
    expect(projections.markChainReverted).not.toHaveBeenCalled();
    expect(projections.markSubmissionFailure).not.toHaveBeenCalled();
  });

  it("marks reverted receipts for operator visibility while leaving pending receipts untouched", async () => {
    const projections = {
      listPendingChainSubmissions: vi.fn().mockResolvedValue([
        {
          invoiceId: "inv_pending",
          txHash: "0xpending"
        },
        {
          invoiceId: "inv_reverted",
          txHash: "0xreverted"
        }
      ]),
      markChainReconciled: vi.fn().mockResolvedValue(undefined),
      markChainReverted: vi.fn().mockResolvedValue(undefined),
      markSubmissionFailure: vi.fn().mockResolvedValue(undefined)
    };
    const receipts = {
      getTransactionReceipt: vi
        .fn()
        .mockResolvedValueOnce({
          status: "pending"
        })
        .mockResolvedValueOnce({
          status: "reverted",
          blockNumber: "100"
        })
    };

    const worker = new ReconcileInvoiceSubmissionsWorker(projections, receipts);
    const result = await worker.drain();

    expect(result).toEqual({
      scanned: 2,
      reconciled: 0,
      pending: 1,
      reverted: 1,
      failed: 0
    });
    expect(projections.markChainReconciled).not.toHaveBeenCalled();
    expect(projections.markChainReverted).toHaveBeenCalledWith("inv_reverted", {
      blockNumber: "100",
      reason: "receipt-reverted"
    });
    expect(projections.markSubmissionFailure).not.toHaveBeenCalled();
  });

  it("counts unexpected receipt lookup errors as failures", async () => {
    const projections = {
      listPendingChainSubmissions: vi.fn().mockResolvedValue([
        {
          invoiceId: "inv_failure",
          txHash: "0xfailure"
        }
      ]),
      markChainReconciled: vi.fn().mockResolvedValue(undefined),
      markChainReverted: vi.fn().mockResolvedValue(undefined),
      markSubmissionFailure: vi.fn().mockResolvedValue(undefined)
    };
    const receipts = {
      getTransactionReceipt: vi.fn().mockRejectedValue(new Error("rpc timeout"))
    };

    const worker = new ReconcileInvoiceSubmissionsWorker(projections, receipts);
    const result = await worker.drain();

    expect(result).toEqual({
      scanned: 1,
      reconciled: 0,
      pending: 0,
      reverted: 0,
      failed: 1
    });
    expect(projections.markChainReconciled).not.toHaveBeenCalled();
    expect(projections.markChainReverted).not.toHaveBeenCalled();
    expect(projections.markSubmissionFailure).toHaveBeenCalledWith("inv_failure", "rpc timeout");
  });
});
