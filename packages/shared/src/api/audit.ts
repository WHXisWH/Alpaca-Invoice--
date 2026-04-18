import { z } from "zod";

export const auditScopeSchema = z.enum([
  "invoice.metadata",
  "invoice.amount",
  "invoice.tax",
  "counterparty.identity",
  "settlement.history",
  "escrow.state",
  "dispute.state"
]);

export const auditAuthorizationRequestSchema = z.object({
  invoiceId: z.string().regex(/^0x[a-f0-9]{64}$/),
  auditKeyHash: z.string().regex(/^0x[a-f0-9]{64}$/),
  scopes: z.array(auditScopeSchema).min(1),
  expiresAt: z.number().int().positive(),
  nonce: z.string().regex(/^0x[a-f0-9]{1,128}$/),
  deadline: z.number().int().positive(),
  signature: z.string().regex(/^0x[a-f0-9]+$/)
});

export type AuditAuthorizationRequest = z.infer<typeof auditAuthorizationRequestSchema>;
