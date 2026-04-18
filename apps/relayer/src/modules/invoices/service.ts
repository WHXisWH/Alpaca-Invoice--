import {
  NonceMismatchError,
  RepositoryConflictError,
  createPrismaClient,
  InvoiceRepository
} from "@alpaca/database";
import {
  buildInvoiceHashMaterial,
  buildInvoiceIdSeed,
  createInvoiceRequestSchema,
  type CreateInvoiceRequest,
  type ListInvoicesQuery
} from "@alpaca/shared";
import { sha256Hex } from "./hash";
import { ViemTypedDataRecoverer } from "./recoverer";
import type {
  InvoiceRepositoryPort,
  InvoiceServicePort,
  TypedDataRecoverPort
} from "./types";

export class InvoiceValidationError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
    this.name = "InvoiceValidationError";
  }
}

const DEADLINE_WINDOW_SECONDS = 60 * 60 * 24;

export class InvoiceService implements InvoiceServicePort {
  constructor(
    private readonly repository: InvoiceRepositoryPort = new InvoiceRepository(createPrismaClient()),
    private readonly recoverer: TypedDataRecoverPort = new ViemTypedDataRecoverer()
  ) {}

  async create(body: unknown) {
    const request = createInvoiceRequestSchema.parse(body);
    const nowSeconds = Math.floor(Date.now() / 1000);

    this.assertTemporalGuards(request, nowSeconds);
    this.assertHashes(request);
    const signerAddress = await this.assertSigner(request);

    try {
      return await this.repository.create({
        request,
        requestHash: sha256Hex(JSON.stringify(request)),
        signerAddress
      });
    } catch (error: unknown) {
      if (error instanceof RepositoryConflictError) {
        throw new InvoiceValidationError("invoice already exists", 409);
      }
      if (error instanceof NonceMismatchError) {
        throw new InvoiceValidationError(
          `provided nonce does not match relayer account state; expected ${error.expectedNonce}`,
          409
        );
      }

      throw error;
    }
  }

  async get(invoiceId: string) {
    return this.repository.findByInvoiceId(invoiceId);
  }

  async list(query: ListInvoicesQuery = { limit: 12 }) {
    return this.repository.listRecent(query);
  }

  private assertTemporalGuards(request: CreateInvoiceRequest, nowSeconds: number) {
    if (request.deadline <= nowSeconds) {
      throw new InvoiceValidationError("request deadline has already expired");
    }

    if (request.deadline - nowSeconds > DEADLINE_WINDOW_SECONDS) {
      throw new InvoiceValidationError("request deadline exceeds 24h window");
    }

    if (request.snapshot.dueDate < request.snapshot.issueDate) {
      throw new InvoiceValidationError("dueDate must be on or after issueDate");
    }
  }

  private assertHashes(request: CreateInvoiceRequest) {
    const expectedAmountCipherHash = sha256Hex(request.amountInput);
    if (expectedAmountCipherHash !== request.amountCipherHash) {
      throw new InvoiceValidationError("amountCipherHash does not match amountInput");
    }

    const expectedTaxCipherHash = sha256Hex(request.taxAmountInput);
    if (expectedTaxCipherHash !== request.taxAmountCipherHash) {
      throw new InvoiceValidationError("taxAmountCipherHash does not match taxAmountInput");
    }

    const expectedInvoiceHash = sha256Hex(buildInvoiceHashMaterial(request.snapshot));
    if (expectedInvoiceHash !== request.invoiceHash) {
      throw new InvoiceValidationError("invoiceHash does not match public snapshot");
    }

    const expectedInvoiceId = sha256Hex(
      buildInvoiceIdSeed({
        seller: request.seller,
        buyer: request.buyer,
        clientNonce: request.clientNonce,
        invoiceHash: request.invoiceHash
      })
    );

    if (expectedInvoiceId !== request.invoiceId) {
      throw new InvoiceValidationError("invoiceId does not match seller, buyer, clientNonce, and invoiceHash");
    }
  }

  private async assertSigner(request: CreateInvoiceRequest) {
    const signer = await this.recoverer.recoverCreateInvoiceSigner(request);

    if (signer.toLowerCase() !== request.seller.toLowerCase()) {
      throw new InvoiceValidationError("signature does not recover the seller address", 401);
    }

    return signer.toLowerCase();
  }
}
