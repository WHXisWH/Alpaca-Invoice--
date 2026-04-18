import { NonceRepository } from "@alpaca/database";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

export async function registerNonceRoutes(app: FastifyInstance) {
  const nonceRepository = new NonceRepository();

  app.get("/api/nonces/:address", async (request) => {
    const params = z.object({ address: z.string().min(1) }).parse(request.params);
    const nonce = await nonceRepository.getNextNonce(params.address);

    return {
      address: params.address.toLowerCase(),
      nonce
    };
  });
}
