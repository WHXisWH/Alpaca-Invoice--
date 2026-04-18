import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __alpacaPrisma__: PrismaClient | undefined;
}

export function createPrismaClient() {
  if (!globalThis.__alpacaPrisma__) {
    globalThis.__alpacaPrisma__ = new PrismaClient();
  }

  return globalThis.__alpacaPrisma__;
}
