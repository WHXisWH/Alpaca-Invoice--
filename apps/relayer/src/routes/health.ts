import type { FastifyInstance } from "fastify";

export async function registerHealthRoute(app: FastifyInstance) {
  app.get("/health", async () => {
    return {
      status: "ok",
      service: "alpaca-relayer",
      chain: "fhenix",
      timestamp: new Date().toISOString()
    };
  });
}
