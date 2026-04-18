import type { CreateInvoiceRequest, InvoiceProjection, ListInvoicesQuery } from "@alpaca/shared";

export interface CreateInvoiceResult {
  invoice: InvoiceProjection;
}

export interface InvoiceServicePort {
  create(body: unknown): Promise<InvoiceProjection>;
  get(invoiceId: string): Promise<InvoiceProjection | null>;
  list(query?: ListInvoicesQuery): Promise<InvoiceProjection[]>;
}

export interface InvoiceRepositoryPort {
  create(input: {
    request: CreateInvoiceRequest;
    requestHash: string;
    signerAddress: string;
  }): Promise<InvoiceProjection>;
  findByInvoiceId(invoiceId: string): Promise<InvoiceProjection | null>;
  listRecent(query?: ListInvoicesQuery): Promise<InvoiceProjection[]>;
}

export interface TypedDataRecoverPort {
  recoverCreateInvoiceSigner(request: CreateInvoiceRequest): Promise<string>;
}
