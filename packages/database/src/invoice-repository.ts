import {
  PaymentRail,
  Prisma,
  SettlementVisibility,
  type InvoiceProjection as PrismaInvoiceProjection,
  type InvoiceStatus as PrismaInvoiceStatus,
  type PrismaClient
} from "@prisma/client";
import type {
  CreateInvoiceRequest,
  InvoiceProjection,
  InvoiceSubmissionStatus,
  InvoicePublicSnapshot,
  ListInvoicesQuery,
  PaymentRail as SharedPaymentRail,
  SettlementVisibility as SharedSettlementVisibility
} from "@alpaca/shared";
import { NonceMismatchError, RepositoryConflictError } from "./errors";

function mapPaymentRail(value: SharedPaymentRail): PaymentRail {
  switch (value) {
    case "erc20-public":
      return PaymentRail.erc20_public;
    case "fherc20":
      return PaymentRail.fherc20;
    case "offchain-anchor":
      return PaymentRail.offchain_anchor;
  }
}

function mapSettlementVisibility(value: SharedSettlementVisibility): SettlementVisibility {
  switch (value) {
    case "public":
      return SettlementVisibility.public;
    case "confidential":
      return SettlementVisibility.confidential;
    case "hybrid":
      return SettlementVisibility.hybrid;
  }
}

function mapInvoiceStatus(value: PrismaInvoiceStatus): InvoiceProjection["status"] {
  return value;
}

function mapSubmissionStatus(record: PrismaInvoiceProjection): InvoiceSubmissionStatus {
  if (record.chainFailureReason) {
    return record.chainFailureReason === "receipt-reverted" ? "reverted" : "failed";
  }

  if (record.chainBlockNumber !== null) {
    return "reconciled";
  }

  if (record.chainTxHash) {
    return "submitted";
  }

  return "accepted";
}

function toSnapshot(record: PrismaInvoiceProjection): InvoicePublicSnapshot {
  return {
    invoiceNumber: record.invoiceNumber,
    issueDate: Math.floor(record.issueDate.getTime() / 1000),
    dueDate: Math.floor(record.dueDate.getTime() / 1000),
    currencyCode: record.currencyCode,
    sellerDisplayName: record.sellerDisplayName,
    buyerDisplayName: record.buyerDisplayName,
    lineItemCount: record.lineItemCount,
    ...(record.memo ? { memo: record.memo } : {}),
    ...(record.reference ? { reference: record.reference } : {})
  };
}

function toDomain(record: PrismaInvoiceProjection): InvoiceProjection {
  return {
    invoiceId: record.invoiceId,
    invoiceHash: record.invoiceHash,
    requestHash: record.requestHash,
    clientNonce: record.clientNonce,
    seller: record.sellerAddress,
    buyer: record.buyerAddress,
    status: mapInvoiceStatus(record.status),
    submissionStatus: mapSubmissionStatus(record),
    paymentRail:
      record.paymentRail === PaymentRail.erc20_public
        ? "erc20-public"
        : record.paymentRail === PaymentRail.fherc20
          ? "fherc20"
          : "offchain-anchor",
    settlementVisibility:
      record.settlementVisibility === SettlementVisibility.public
        ? "public"
        : record.settlementVisibility === SettlementVisibility.confidential
          ? "confidential"
          : "hybrid",
    hasEscrow: record.hasEscrow,
    hasDispute: record.hasDispute,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    snapshot: toSnapshot(record),
    amountCipherHash: record.amountCipherHash,
    taxAmountCipherHash: record.taxAmountCipherHash,
    ...(record.chainTxHash ? { chainTxHash: record.chainTxHash } : {}),
    ...(record.chainBlockNumber !== null
      ? { chainBlockNumber: record.chainBlockNumber.toString() }
      : {}),
    ...(record.chainFailureReason ? { chainFailureReason: record.chainFailureReason } : {})
  };
}

export interface CreateInvoiceProjectionInput {
  request: CreateInvoiceRequest;
  requestHash: string;
  signerAddress: string;
}

export interface ChainSubmissionReceiptInput {
  txHash: string;
  blockNumber?: string | number | bigint | null;
}

export interface PendingChainSubmissionRecord {
  invoiceId: string;
  txHash: string;
}

export class InvoiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateInvoiceProjectionInput) {
    const { request, requestHash, signerAddress } = input;
    const rawRequest = JSON.parse(JSON.stringify(request)) as Prisma.InputJsonValue;
    const createData: Prisma.InvoiceProjectionCreateInput = {
      invoiceId: request.invoiceId,
      invoiceHash: request.invoiceHash,
      requestHash,
      clientNonce: request.clientNonce,
      sellerAddress: request.seller,
      buyerAddress: request.buyer,
      status: "submitted",
      paymentRail: mapPaymentRail(request.paymentRail),
      settlementVisibility: mapSettlementVisibility(request.settlementVisibility),
      invoiceNumber: request.snapshot.invoiceNumber,
      issueDate: new Date(request.snapshot.issueDate * 1000),
      dueDate: new Date(request.snapshot.dueDate * 1000),
      currencyCode: request.snapshot.currencyCode,
      sellerDisplayName: request.snapshot.sellerDisplayName,
      buyerDisplayName: request.snapshot.buyerDisplayName,
      lineItemCount: request.snapshot.lineItemCount,
      ...(request.snapshot.memo ? { memo: request.snapshot.memo } : {}),
      ...(request.snapshot.reference ? { reference: request.snapshot.reference } : {}),
      amountCipherHash: request.amountCipherHash,
      taxAmountCipherHash: request.taxAmountCipherHash,
      payloadSnapshot: {
        create: {
          nonce: request.nonce,
          deadline: new Date(request.deadline * 1000),
          signature: request.signature,
          amountInput: request.amountInput,
          taxAmountInput: request.taxAmountInput,
          rawRequest
        }
      }
    };

    const projection = await this.prisma.$transaction(async (tx) => {
      const nonceState = await tx.relayerNonce.upsert({
        where: { signerAddress },
        create: {
          signerAddress,
          nextNonce: 0n
        },
        update: {}
      });

      const providedNonce = BigInt(request.nonce);
      if (providedNonce !== nonceState.nextNonce) {
        throw new NonceMismatchError(
          "provided nonce does not match relayer account state",
          nonceState.nextNonce.toString()
        );
      }

      const created = await tx.invoiceProjection.create({
        data: createData
      }).catch((error: unknown) => {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "P2002"
        ) {
          throw new RepositoryConflictError("invoice projection already exists");
        }
        throw error;
      });

      await tx.outboxEvent.create({
        data: {
          topic: "invoice.create.requested",
          aggregateId: request.invoiceId,
          payload: {
            invoiceId: request.invoiceId,
            invoiceHash: request.invoiceHash,
            seller: request.seller,
            buyer: request.buyer
          } as Prisma.InputJsonValue
        }
      });

      await tx.idempotencyKey.create({
        data: {
          scope: "invoice.create",
          key: request.invoiceId,
          status: "completed",
          responseCode: 201,
          responseBody: {
            invoiceId: request.invoiceId
          } as Prisma.InputJsonValue
        }
      });

      await tx.relayerNonce.update({
        where: { signerAddress },
        data: {
          nextNonce: nonceState.nextNonce + 1n
        }
      });

      return created;
    });

    return toDomain(projection);
  }

  async markChainSubmission(invoiceId: string, receipt: ChainSubmissionReceiptInput) {
    const updated = await this.prisma.invoiceProjection.update({
      where: { invoiceId },
      data: {
        status: "pending",
        chainTxHash: receipt.txHash,
        chainFailureReason: null,
        ...(receipt.blockNumber !== undefined && receipt.blockNumber !== null
          ? { chainBlockNumber: BigInt(receipt.blockNumber) }
          : {})
      }
    });

    return toDomain(updated);
  }

  async listPendingChainSubmissions(limit = 20): Promise<PendingChainSubmissionRecord[]> {
    const records = await this.prisma.invoiceProjection.findMany({
      where: {
        chainTxHash: {
          not: null
        },
        chainBlockNumber: null
      },
      orderBy: {
        updatedAt: "asc"
      },
      take: limit,
      select: {
        invoiceId: true,
        chainTxHash: true
      }
    });

    return records
      .filter((record): record is { invoiceId: string; chainTxHash: string } => record.chainTxHash !== null)
      .map((record) => ({
        invoiceId: record.invoiceId,
        txHash: record.chainTxHash
      }));
  }

  async markChainReconciled(invoiceId: string, blockNumber: string | number | bigint) {
    const updated = await this.prisma.invoiceProjection.update({
      where: { invoiceId },
      data: {
        chainBlockNumber: BigInt(blockNumber),
        chainFailureReason: null
      }
    });

    return toDomain(updated);
  }

  async markChainReverted(
    invoiceId: string,
    input: {
      blockNumber?: string | number | bigint | null;
      reason?: string | undefined;
    } = {}
  ) {
    const updated = await this.prisma.invoiceProjection.update({
      where: { invoiceId },
      data: {
        chainFailureReason: input.reason ?? "receipt-reverted",
        ...(input.blockNumber !== undefined && input.blockNumber !== null
          ? { chainBlockNumber: BigInt(input.blockNumber) }
          : {})
      }
    });

    return toDomain(updated);
  }

  async markSubmissionFailure(invoiceId: string, reason: string) {
    const updated = await this.prisma.invoiceProjection.update({
      where: { invoiceId },
      data: {
        chainFailureReason: reason
      }
    });

    return toDomain(updated);
  }

  async findByInvoiceId(invoiceId: string) {
    const record = await this.prisma.invoiceProjection.findUnique({
      where: { invoiceId }
    });

    return record ? toDomain(record) : null;
  }

  async listRecent(query: ListInvoicesQuery = { limit: 12 }) {
    const {
      limit = 12,
      status,
      submissionStatus,
      attentionOnly
    } = query;
    const where: Prisma.InvoiceProjectionWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (attentionOnly) {
      where.chainFailureReason = {
        not: null
      };
    }

    if (submissionStatus) {
      Object.assign(where, mapSubmissionStatusWhere(submissionStatus));
    }

    const records = await this.prisma.invoiceProjection.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit
    });

    return records.map(toDomain);
  }
}

function mapSubmissionStatusWhere(
  submissionStatus: InvoiceSubmissionStatus
): Prisma.InvoiceProjectionWhereInput {
  switch (submissionStatus) {
    case "accepted":
      return {
        chainTxHash: null,
        chainBlockNumber: null,
        chainFailureReason: null
      };
    case "submitted":
      return {
        chainTxHash: {
          not: null
        },
        chainBlockNumber: null,
        chainFailureReason: null
      };
    case "reconciled":
      return {
        chainBlockNumber: {
          not: null
        },
        chainFailureReason: null
      };
    case "reverted":
      return {
        chainFailureReason: "receipt-reverted"
      };
    case "failed":
      return {
        AND: [
          {
            chainFailureReason: {
              not: null
            }
          },
          {
            chainFailureReason: {
              not: "receipt-reverted"
            }
          }
        ]
      };
  }
}
