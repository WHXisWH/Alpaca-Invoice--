import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

function parseCorsOrigins(value?: string) {
  if (!value) {
    return true;
  }

  const origins = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : true;
}

export async function registerCors(app: FastifyInstance) {
  await app.register(cors, {
    origin: parseCorsOrigins(app.runtime.CORS_ORIGIN),
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"]
  });
}
