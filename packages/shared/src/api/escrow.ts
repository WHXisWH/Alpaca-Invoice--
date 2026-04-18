import { z } from "zod";

export const escrowCreateRequestSchema = z.object({
  invoiceId: z.string().regex(/^0x[a-f0-9]{64}$/),
  arbiterAddress: z.string().min(1),
  nonce: z.string().regex(/^0x[a-f0-9]{1,128}$/),
  deadline: z.number().int().positive(),
  signature: z.string().regex(/^0x[a-f0-9]+$/)
});

export const disputeOpenRequestSchema = z.object({
  invoiceId: z.string().regex(/^0x[a-f0-9]{64}$/),
  openedBy: z.string().min(1),
  reasonCode: z.string().min(1).max(120),
  evidenceHash: z.string().regex(/^0x[a-f0-9]{64}$/).optional(),
  nonce: z.string().regex(/^0x[a-f0-9]{1,128}$/),
  deadline: z.number().int().positive(),
  signature: z.string().regex(/^0x[a-f0-9]+$/)
});

export type EscrowCreateRequest = z.infer<typeof escrowCreateRequestSchema>;
export type DisputeOpenRequest = z.infer<typeof disputeOpenRequestSchema>;
