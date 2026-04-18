import { describe, expect, it, vi } from "vitest";
import type { InvoiceCreateRequestedEvent } from "@alpaca/database";
import type { InvoiceProjection } from "@alpaca/shared";
import { CreateInvoiceSubmissionWorker } from "./create-invoice-worker";
import type { InvoiceSubmissionGateway } from "./invoice-submission";

function createProjection(): InvoiceProjection {
  return {
    invoiceId: "inv_123",
    invoiceHash: "hash_123",
    requestHash: "request_123",
    clientNonce: "client_123",
    seller: "0xseller",
    buyer: "0xbuyer",
    status: "submitted",
    submissionStatus: "accepted",
    paymentRail: "erc20-public",
    settlementVisibility: "public",
    hasEscrow: false,
    hasDispute: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    snapshot: {
      invoiceNumber: "INV-123",
      issueDate: 1_710_000_000,
      dueDate: 1_710_086_400,
      currencyCode: "USD",
      sellerDisplayName: "Seller",
      buyerDisplayName: "Buyer",
      lineItemCount: 2
    },
    amountCipherHash: "amount_hash",
    taxAmountCipherHash: "tax_hash"
  };
}

function createEvent(): InvoiceCreateRequestedEvent {
  return {
    eventId: "evt_123",
    createdAt: new Date().toISOString(),
    payload: {
      invoiceId: "inv_123",
      invoiceHash: "hash_123",
      seller: "0xseller",
      buyer: "0xbuyer"
    }
  };
}

describe("CreateInvoiceSubmissionWorker", () => {
  it("publishes accepted events without chain projection update", async () => {
    const projection = createProjection();
    const event = createEvent();
    const projections = {
      findByInvoiceId: vi.fn().mockResolvedValue(projection),
      markChainSubmission: vi.fn(),
      markSubmissionFailure: vi.fn()
    };
    const outbox = {
      listPendingInvoiceCreateEvents: vi.fn().mockResolvedValue([event]),
      markProcessing: vi.fn().mockResolvedValue(true),
      markPublished: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined)
    };
    const gateway: InvoiceSubmissionGateway = {
      submitCreateInvoice: vi.fn().mockResolvedValue({ status: "accepted" })
    };

    const worker = new CreateInvoiceSubmissionWorker(projections, outbox, gateway);
    const result = await worker.drain();

    expect(result).toEqual({
      scanned: 1,
      claimed: 1,
      published: 1,
      failed: 0,
      skipped: 0
    });
    expect(gateway.submitCreateInvoice).toHaveBeenCalledWith({
      invoiceId: projection.invoiceId,
      invoiceHash: projection.invoiceHash,
      seller: projection.seller,
      buyer: projection.buyer,
      amountCipherHash: projection.amountCipherHash,
      taxAmountCipherHash: projection.taxAmountCipherHash,
      dueDate: projection.snapshot.dueDate,
      paymentRail: projection.paymentRail,
      settlementVisibility: projection.settlementVisibility
    });
    expect(projections.markChainSubmission).not.toHaveBeenCalled();
    expect(projections.markSubmissionFailure).not.toHaveBeenCalled();
    expect(outbox.markPublished).toHaveBeenCalledWith(event.eventId);
  });

  it("writes tx metadata when the gateway returns a submitted receipt", async () => {
    const projection = createProjection();
    const event = createEvent();
    const projections = {
      findByInvoiceId: vi.fn().mockResolvedValue(projection),
      markChainSubmission: vi.fn().mockResolvedValue({
        ...projection,
        status: "pending",
        submissionStatus: "submitted",
        chainTxHash: "0xtx",
        chainBlockNumber: "88"
      }),
      markSubmissionFailure: vi.fn()
    };
    const outbox = {
      listPendingInvoiceCreateEvents: vi.fn().mockResolvedValue([event]),
      markProcessing: vi.fn().mockResolvedValue(true),
      markPublished: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined)
    };
    const gateway: InvoiceSubmissionGateway = {
      submitCreateInvoice: vi.fn().mockResolvedValue({
        status: "submitted",
        txHash: "0xtx",
        blockNumber: "88"
      })
    };

    const worker = new CreateInvoiceSubmissionWorker(projections, outbox, gateway);
    await worker.drain();

    expect(projections.markChainSubmission).toHaveBeenCalledWith(event.payload.invoiceId, {
      txHash: "0xtx",
      blockNumber: "88"
    });
    expect(projections.markSubmissionFailure).not.toHaveBeenCalled();
    expect(outbox.markPublished).toHaveBeenCalledWith(event.eventId);
  });

  it("marks the event as failed when projection lookup fails", async () => {
    const event = createEvent();
    const projections = {
      findByInvoiceId: vi.fn().mockResolvedValue(null),
      markChainSubmission: vi.fn(),
      markSubmissionFailure: vi.fn()
    };
    const outbox = {
      listPendingInvoiceCreateEvents: vi.fn().mockResolvedValue([event]),
      markProcessing: vi.fn().mockResolvedValue(true),
      markPublished: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined)
    };
    const gateway: InvoiceSubmissionGateway = {
      submitCreateInvoice: vi.fn()
    };

    const worker = new CreateInvoiceSubmissionWorker(projections, outbox, gateway);
    const result = await worker.drain();

    expect(result).toEqual({
      scanned: 1,
      claimed: 1,
      published: 0,
      failed: 1,
      skipped: 0
    });
    expect(outbox.markFailed).toHaveBeenCalledWith(event.eventId, "invoice projection not found for outbox event");
    expect(projections.markSubmissionFailure).not.toHaveBeenCalled();
    expect(outbox.markPublished).not.toHaveBeenCalled();
  });

  it("persists a submission failure when gateway submission throws after projection lookup", async () => {
    const projection = createProjection();
    const event = createEvent();
    const projections = {
      findByInvoiceId: vi.fn().mockResolvedValue(projection),
      markChainSubmission: vi.fn(),
      markSubmissionFailure: vi.fn().mockResolvedValue({
        ...projection,
        submissionStatus: "failed",
        chainFailureReason: "rpc timeout"
      })
    };
    const outbox = {
      listPendingInvoiceCreateEvents: vi.fn().mockResolvedValue([event]),
      markProcessing: vi.fn().mockResolvedValue(true),
      markPublished: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined)
    };
    const gateway: InvoiceSubmissionGateway = {
      submitCreateInvoice: vi.fn().mockRejectedValue(new Error("rpc timeout"))
    };

    const worker = new CreateInvoiceSubmissionWorker(projections, outbox, gateway);
    const result = await worker.drain();

    expect(result).toEqual({
      scanned: 1,
      claimed: 1,
      published: 0,
      failed: 1,
      skipped: 0
    });
    expect(projections.markSubmissionFailure).toHaveBeenCalledWith(projection.invoiceId, "rpc timeout");
    expect(outbox.markFailed).toHaveBeenCalledWith(event.eventId, "rpc timeout");
    expect(outbox.markPublished).not.toHaveBeenCalled();
  });
});
