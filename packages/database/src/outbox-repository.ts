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
