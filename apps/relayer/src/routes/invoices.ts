import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { InvoiceService, InvoiceValidationError } from "../modules/invoices/service";
import type { InvoiceServicePort } from "../modules/invoices/types";
import { listInvoicesQuerySchema } from "@alpaca/shared";

export async function registerInvoiceRoutes(
  app: FastifyInstance,
  invoiceService: InvoiceServicePort = new InvoiceService()
) {

  app.post("/api/invoices/create", async (request, reply) => {
    try {
      const invoice = await invoiceService.create(request.body);

      reply.code(201);
      return {
        accepted: true,
        invoice
      };
    } catch (error) {
      if (error instanceof InvoiceValidationError) {
        reply.code(error.statusCode);
        return {
          error: error.message
        };
      }

      throw error;
    }
  });

  app.get("/api/invoices/:invoiceId", async (request, reply) => {
    const params = z.object({ invoiceId: z.string().min(1) }).parse(request.params);
    const invoice = await invoiceService.get(params.invoiceId);

    if (!invoice) {
      reply.code(404);
      return {
        invoiceId: params.invoiceId,
        error: "invoice not found"
      };
    }

    return { invoice };
  });

  app.get("/api/invoices", async (request) => {
    const query = listInvoicesQuerySchema.parse(request.query);

    const invoices = await invoiceService.list(query);

    return {
      invoices,
      total: invoices.length
    };
  });
}
