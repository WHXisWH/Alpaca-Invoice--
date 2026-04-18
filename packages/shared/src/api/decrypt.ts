import { z } from "zod";

export const decryptRequestSchema = z.object({
  invoiceId: z.string().regex(/^0x[a-f0-9]{64}$/),
  fieldType: z.enum(["amount", "taxAmount", "escrowBalance"]),
  requester: z.string().min(1),
  nonce: z.string().regex(/^0x[a-f0-9]{1,128}$/),
  deadline: z.number().int().positive(),
  signature: z.string().regex(/^0x[a-f0-9]+$/)
});

export type DecryptRequest = z.infer<typeof decryptRequestSchema>;
