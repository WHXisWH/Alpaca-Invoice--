export interface PendingChainSubmissionRecord {
  invoiceId: string;
  txHash: string;
}

export interface PendingChainSubmissionPort {
  listPendingChainSubmissions(limit?: number): Promise<PendingChainSubmissionRecord[]>;
  markChainReconciled(invoiceId: string, blockNumber: string): Promise<unknown>;
  markChainReverted(
    invoiceId: string,
    input: {
      blockNumber?: string | number | bigint | null;
      reason?: string | undefined;
    }
  ): Promise<unknown>;
  markSubmissionFailure(invoiceId: string, reason: string): Promise<unknown>;
}

export interface TransactionReceiptPollResult {
  status: "pending" | "success" | "reverted";
  blockNumber?: string | undefined;
}

export interface TransactionReceiptReaderPort {
  getTransactionReceipt(txHash: string): Promise<TransactionReceiptPollResult>;
}

export interface DrainReconciliationResult {
  scanned: number;
  reconciled: number;
  pending: number;
  reverted: number;
  failed: number;
}

export class ReconcileInvoiceSubmissionsWorker {
  constructor(
    private readonly projections: PendingChainSubmissionPort,
    private readonly receipts: TransactionReceiptReaderPort
  ) {}

  async drain(limit = 20): Promise<DrainReconciliationResult> {
    const submissions = await this.projections.listPendingChainSubmissions(limit);
    const result: DrainReconciliationResult = {
      scanned: submissions.length,
      reconciled: 0,
      pending: 0,
      reverted: 0,
      failed: 0
    };

    for (const submission of submissions) {
      try {
        const receipt = await this.receipts.getTransactionReceipt(submission.txHash);

        if (receipt.status === "pending") {
          result.pending += 1;
          continue;
        }

        if (receipt.status === "reverted") {
          await this.projections.markChainReverted(submission.invoiceId, {
            ...(receipt.blockNumber ? { blockNumber: receipt.blockNumber } : {}),
            reason: "receipt-reverted"
          });
          result.reverted += 1;
          continue;
        }

        if (!receipt.blockNumber) {
          throw new Error("successful receipt is missing blockNumber");
        }

        await this.projections.markChainReconciled(submission.invoiceId, receipt.blockNumber);
        result.reconciled += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown receipt error";
        await this.projections.markSubmissionFailure(submission.invoiceId, message);
        result.failed += 1;
      }
    }

    return result;
  }
}
