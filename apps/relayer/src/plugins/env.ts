import type { FastifyInstance } from "fastify";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  RELAYER_PORT: z.string().default("4100"),
  RELAYER_HOST: z.string().default("0.0.0.0"),
  RELAYER_CHAIN_ID: z.string().default("42069"),
  RELAYER_VERIFYING_CONTRACT: z
    .string()
    .default("0x0000000000000000000000000000000000000000"),
  RELAYER_PRIVATE_KEY: z
    .string()
    .regex(/^(0x)?[a-fA-F0-9]{64}$/)
    .optional(),
  RELAYER_INVOICE_REGISTRY_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  FHENIX_RPC_URL: z.string().min(1, "FHENIX_RPC_URL is required")
});

export async function registerEnv(app: FastifyInstance) {
  const env = envSchema.parse(process.env);
  app.decorate("runtime", env);
}

declare module "fastify" {
  interface FastifyInstance {
    runtime: z.infer<typeof envSchema>;
  }
}
