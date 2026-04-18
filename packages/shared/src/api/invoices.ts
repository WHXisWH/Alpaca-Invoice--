import { z } from "zod";
import type {
  InvoiceProjection,
  InvoicePublicSnapshot,
  InvoiceStatus,
  InvoiceSubmissionStatus
} from "../domain/invoice";

export const invoicePublicSnapshotSchema = z.object({
  invoiceNumber: z.string().min(1).max(120),
  issueDate: z.number().int().positive(),
  dueDate: z.number().int().positive(),
  currencyCode: z.string().min(3).max(8),
  sellerDisplayName: z.string().min(1).max(120),
  buyerDisplayName: z.string().min(1).max(120),
  lineItemCount: z.number().int().nonnegative().max(1000),
  memo: z.string().max(4000).optional(),
  reference: z.string().max(250).optional()
});

export const createInvoiceRequestSchema = z
  .object({
    invoiceId: z.string().regex(/^0x[a-f0-9]{64}$/),
    invoiceHash: z.string().regex(/^0x[a-f0-9]{64}$/),
    seller: z.string().min(1),
    buyer: z.string().min(1),
    clientNonce: z.string().regex(/^0x[a-f0-9]{64}$/),
    paymentRail: z.enum(["erc20-public", "fherc20", "offchain-anchor"]),
    settlementVisibility: z.enum(["public", "confidential", "hybrid"]),
    amountCipherHash: z.string().regex(/^0x[a-f0-9]{64}$/),
    taxAmountCipherHash: z.string().regex(/^0x[a-f0-9]{64}$/),
    amountInput: z.string().min(1).max(20000),
    taxAmountInput: z.string().min(1).max(20000),
    snapshot: invoicePublicSnapshotSchema,
    nonce: z.string().regex(/^\d+$/),
    deadline: z.number().int().positive(),
    signature: z.string().regex(/^0x[a-f0-9]+$/)
  })
  .superRefine((value, ctx) => {
    if (value.snapshot.dueDate !== value.snapshot.dueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["snapshot", "dueDate"],
        message: "dueDate must be a valid unix timestamp"
      });
    }

    if (value.snapshot.issueDate > value.snapshot.dueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["snapshot", "issueDate"],
        message: "issueDate cannot be later than dueDate"
      });
    }

    if (value.seller.toLowerCase() === value.buyer.toLowerCase()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["buyer"],
        message: "buyer must differ from seller"
      });
    }
  });

export const createInvoiceResponseSchema = z.object({
  accepted: z.literal(true),
  invoice: z.custom<InvoiceProjection>()
});

export const listInvoicesResponseSchema = z.object({
  invoices: z.array(z.custom<InvoiceProjection>()),
  total: z.number().int().nonnegative()
});

export const listInvoicesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(12),
  status: z
    .enum(["draft", "submitted", "pending", "paid", "cancelled", "expired", "disputed", "resolved", "refunded"])
    .optional(),
  submissionStatus: z
    .enum(["accepted", "submitted", "reconciled", "reverted", "failed"])
    .optional(),
  attentionOnly: z.coerce.boolean().optional()
});

export type CreateInvoiceRequest = z.infer<typeof createInvoiceRequestSchema>;
export type CreateInvoiceResponse = z.infer<typeof createInvoiceResponseSchema>;
export type ListInvoicesResponse = z.infer<typeof listInvoicesResponseSchema>;
export type ListInvoicesQuery = {
  limit?: number;
  status?: InvoiceStatus | undefined;
  submissionStatus?: InvoiceSubmissionStatus | undefined;
  attentionOnly?: boolean | undefined;
};
export type InvoiceSnapshotInput = z.infer<typeof invoicePublicSnapshotSchema>;

export function buildInvoiceHashMaterial(snapshot: InvoicePublicSnapshot) {
  return JSON.stringify({
    invoiceNumber: snapshot.invoiceNumber,
    issueDate: snapshot.issueDate,
    dueDate: snapshot.dueDate,
    currencyCode: snapshot.currencyCode,
    sellerDisplayName: snapshot.sellerDisplayName,
    buyerDisplayName: snapshot.buyerDisplayName,
    lineItemCount: snapshot.lineItemCount,
    memo: snapshot.memo ?? null,
    reference: snapshot.reference ?? null
  });
}

export function buildInvoiceIdSeed(input: {
  seller: string;
  buyer: string;
  clientNonce: string;
  invoiceHash: string;
}) {
  return [
    input.seller.trim().toLowerCase(),
    input.buyer.trim().toLowerCase(),
    input.clientNonce.trim().toLowerCase(),
    input.invoiceHash.trim().toLowerCase()
  ].join(":");
}
