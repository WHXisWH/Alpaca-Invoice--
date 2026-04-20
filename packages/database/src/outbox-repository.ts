import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";

const invoiceCreateRequestedPayloadSchema = z.object({
  invoiceId: z.string().min(1),
  invoiceHash: z.string().min(1),
  seller: z.string().min(1),
  buyer: z.string().min(1)
});

export type InvoiceCreateRequestedPayload = z.infer<typeof invoiceCreateRequestedPayloadSchema>;

export interface InvoiceCreateRequestedEvent {
  eventId: string;
  createdAt: string;
  payload: InvoiceCreateRequestedPayload;
}

export class OutboxRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listPendingInvoiceCreateEvents(limit = 20): Promise<InvoiceCreateRequestedEvent[]> {
    const records = await this.prisma.outboxEvent.findMany({
      where: {
        topic: "invoice.create.requested",
        status: "pending"
      },
      orderBy: { createdAt: "asc" },
      take: limit
    });

    return records.map((record) => ({
      eventId: record.id,
      createdAt: record.createdAt.toISOString(),
      payload: invoiceCreateRequestedPayloadSchema.parse(record.payload)
    }));
  }

  async markProcessing(eventId: string) {
    const result = await this.prisma.outboxEvent.updateMany({
      where: {
        id: eventId,
        status: "pending"
      },
      data: {
        status: "processing"
      }
    });

    return result.count === 1;
  }

  async markPublished(eventId: string) {
    await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: "published"
      }
    });
  }

  async requeueStuckInvoices(): Promise<number> {
    const activeEvents = await this.prisma.outboxEvent.findMany({
      where: {
        topic: "invoice.create.requested",
        status: { in: ["pending", "processing"] }
      },
      select: { aggregateId: true }
    });
    const activeIds = new Set(activeEvents.map((e) => e.aggregateId));

    const stuckInvoices = await this.prisma.invoiceProjection.findMany({
      where: {
        chainTxHash: null,
        chainBlockNumber: null,
        chainFailureReason: null
      },
      select: {
        invoiceId: true,
        invoiceHash: true,
        sellerAddress: true,
        buyerAddress: true
      }
    });

    const toRequeue = stuckInvoices.filter((inv) => !activeIds.has(inv.invoiceId));
    if (toRequeue.length === 0) return 0;

    await this.prisma.outboxEvent.createMany({
      data: toRequeue.map((inv) => ({
        topic: "invoice.create.requested",
        aggregateId: inv.invoiceId,
        payload: {
          invoiceId: inv.invoiceId,
          invoiceHash: inv.invoiceHash,
          seller: inv.sellerAddress,
          buyer: inv.buyerAddress
        } as Record<string, string>
      }))
    });

    return toRequeue.length;
  }

  async markFailed(eventId: string, reason: string) {
    await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: "failed",
        payload: {
          error: reason,
          ...(await this.readPayload(eventId))
        } as Prisma.InputJsonValue
      }
    });
  }

  private async readPayload(eventId: string) {
    const event = await this.prisma.outboxEvent.findUniqueOrThrow({
      where: { id: eventId },
      select: { payload: true }
    });

    return event.payload as Record<string, unknown>;
  }
}
