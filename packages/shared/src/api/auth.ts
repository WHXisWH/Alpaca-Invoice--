import { z } from "zod";

export const relayerNonceResponseSchema = z.object({
  address: z.string().min(1),
  nonce: z.string().regex(/^\d+$/)
});

export type RelayerNonceResponse = z.infer<typeof relayerNonceResponseSchema>;
