import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { InvoiceProjection } from "@alpaca/shared";
import { registerInvoiceRoutes } from "./invoices";
import { InvoiceValidationError } from "../modules/invoices/service";
import type { InvoiceServicePort } from "../modules/invoices/types";

function makeInvoiceProjection(): InvoiceProjection {
  return {
    invoiceId: "0x1".padEnd(66, "1"),
    invoiceHash: "0x2".padEnd(66, "2"),
    requestHash: "0x3".padEnd(66, "3"),
    clientNonce: "0x4".padEnd(66, "4"),
    seller: "0x1111111111111111111111111111111111111111",
    buyer: "0x2222222222222222222222222222222222222222",
    status: "submitted",
    submissionStatus: "accepted",
    paymentRail: "fherc20",
    settlementVisibility: "confidential",
    hasEscrow: false,
    hasDispute: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    snapshot: {
      invoiceNumber: "INV-100",
      issueDate: 1700000000,
      dueDate: 1700600000,
      currencyCode: "USD",
      sellerDisplayName: "Seller",
      buyerDisplayName: "Buyer",
      lineItemCount: 1
    },
    amountCipherHash: "0x5".padEnd(66, "5"),
    taxAmountCipherHash: "0x6".padEnd(66, "6")
  };
}

function createStubService(message?: string, statusCode = 400): InvoiceServicePort {
  return {
    async create() {
      if (message) {
        throw new InvoiceValidationError(message, statusCode);
      }

      return makeInvoiceProjection();
    },
    async get() {
      return null;
    },
    async list() {
      return [];
    }
  };
}

async function buildTestApp(service: InvoiceServicePort) {
  const app = Fastify();
  await registerInvoiceRoutes(app, service);
  return app;
}

describe("invoice routes", () => {
  it("maps invalid signer failures to 401", async () => {
    const app = await buildTestApp(
      createStubService("signature does not recover the seller address", 401)
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/invoices/create",
      payload: {}
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "signature does not recover the seller address"
    });
  });

  it("maps nonce mismatch failures to 409", async () => {
    const app = await buildTestApp(
      createStubService("provided nonce does not match relayer account state; expected 3", 409)
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/invoices/create",
      payload: {}
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: "provided nonce does not match relayer account state; expected 3"
    });
  });

  it("maps expired deadline failures to 400", async () => {
    const app = await buildTestApp(
      createStubService("request deadline has already expired", 400)
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/invoices/create",
      payload: {}
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "request deadline has already expired"
    });
  });

  it("maps duplicate create failures to 409", async () => {
    const app = await buildTestApp(createStubService("invoice already exists", 409));

    const response = await app.inject({
      method: "POST",
      url: "/api/invoices/create",
      payload: {}
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: "invoice already exists"
    });
  });

  it("passes invoice list filters through to the service", async () => {
    const expectedInvoice = makeInvoiceProjection();
    const service: InvoiceServicePort = {
      async create() {
        return makeInvoiceProjection();
      },
      async get() {
        return null;
      },
      list: vi.fn().mockResolvedValue([expectedInvoice])
    };
    const app = await buildTestApp(service);

    const response = await app.inject({
      method: "GET",
      url: "/api/invoices?limit=5&submissionStatus=failed&attentionOnly=true"
    });

    expect(response.statusCode).toBe(200);
    expect(service.list).toHaveBeenCalledWith({
      limit: 5,
      submissionStatus: "failed",
      attentionOnly: true
    });
    expect(response.json()).toEqual({
      invoices: [expectedInvoice],
      total: 1
    });
  });
});
