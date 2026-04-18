import type { PrismaClient } from "@prisma/client";
import { createPrismaClient } from "./client";

export class NonceRepository {
  constructor(private readonly prisma: PrismaClient = createPrismaClient()) {}

  async getNextNonce(address: string) {
    const signerAddress = address.toLowerCase();
    const row = await this.prisma.relayerNonce.upsert({
      where: { signerAddress },
      create: {
        signerAddress,
        nextNonce: 0n
      },
      update: {}
    });

    return row.nextNonce.toString();
  }
}
