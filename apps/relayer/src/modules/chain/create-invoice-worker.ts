import type { ChainSubmissionReceiptInput, InvoiceCreateRequestedEvent } from "@alpaca/database";
import type { InvoiceProjection } from "@alpaca/shared";
import type { InvoiceSubmissionGateway, InvoiceSubmissionRequest } from "./invoice-submission";

export interface InvoiceSubmissionProjectionPort {
  findByInvoiceId(invoiceId: string): Promise<InvoiceProjection | null>;
  markChainSubmission(invoiceId: string, receipt: ChainSubmissionReceiptInput): Promise<InvoiceProjection>;
  markSubmissionFailure(invoiceId: string, reason: string): Promise<InvoiceProjection>;
}

export interface InvoiceSubmissionOutboxPort {
  listPendingInvoiceCreateEvents(limit?: number): Promise<InvoiceCreateRequestedEvent[]>;
  markProcessing(eventId: string): Promise<boolean>;
  markPublished(eventId: string): Promise<void>;
  markFailed(eventId: string, reason: string): Promise<void>;
}

export interface DrainSubmissionResult {
  scanned: number;
  claimed: number;
  published: number;
  failed: number;
  skipped: number;
}

export class CreateInvoiceSubmissionWorker {
  constructor(
    private readonly projections: InvoiceSubmissionProjectionPort,
    private readonly outbox: InvoiceSubmissionOutboxPort,
    private readonly gateway: InvoiceSubmissionGateway
  ) {}

  async drain(limit = 20): Promise<DrainSubmissionResult> {
    const events = await this.outbox.listPendingInvoiceCreateEvents(limit);
    const result: DrainSubmissionResult = {
      scanned: events.length,
      claimed: 0,
      published: 0,
      failed: 0,
      skipped: 0
    };

    for (const event of events) {
      let projection: InvoiceProjection | null = null;
      const claimed = await this.outbox.markProcessing(event.eventId);

      if (!claimed) {
        result.skipped += 1;
        continue;
      }

      result.claimed += 1;

      try {
        projection = await this.projections.findByInvoiceId(event.payload.invoiceId);

        if (!projection) {
          throw new Error("invoice projection not found for outbox event");
        }

        const receipt = await this.gateway.submitCreateInvoice(this.toSubmissionRequest(projection));

        if (receipt.status === "submitted" && receipt.txHash) {
          await this.projections.markChainSubmission(event.payload.invoiceId, {
            txHash: receipt.txHash,
            ...(receipt.blockNumber ? { blockNumber: receipt.blockNumber } : {})
          });
        }

        await this.outbox.markPublished(event.eventId);
        result.published += 1;
      } catch (error) {
        result.failed += 1;
        const message = error instanceof Error ? error.message : "unknown submission error";
        if (projection) {
          await this.projections.markSubmissionFailure(projection.invoiceId, message);
        }
        await this.outbox.markFailed(event.eventId, message);
      }
    }

    return result;
  }

  private toSubmissionRequest(projection: InvoiceProjection): InvoiceSubmissionRequest {
    return {
      invoiceId: projection.invoiceId,
      invoiceHash: projection.invoiceHash,
      seller: projection.seller,
      buyer: projection.buyer,
      amountCipherHash: projection.amountCipherHash,
      taxAmountCipherHash: projection.taxAmountCipherHash,
      dueDate: projection.snapshot.dueDate,
      paymentRail: projection.paymentRail,
      settlementVisibility: projection.settlementVisibility
    };
  }
}
