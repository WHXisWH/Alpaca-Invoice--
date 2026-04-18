import type { FastifyInstance } from "fastify";
import { z } from "zod";

const decryptRequestSchema = z.object({
  invoiceId: z.string().min(1),
  fieldType: z.enum(["amount", "taxAmount", "escrowBalance"]),
  requester: z.string().min(1),
  nonce: z.string().min(1),
  deadline: z.number().int().positive(),
  signature: z.string().min(1)
});

export async function registerDecryptRoutes(app: FastifyInstance) {
  app.post("/api/decrypt/request", async (request, reply) => {
    const payload = decryptRequestSchema.parse(request.body);

    reply.code(202);
    return {
      accepted: true,
      status: "queued",
      invoiceId: payload.invoiceId,
      fieldType: payload.fieldType
    };
  });
}
