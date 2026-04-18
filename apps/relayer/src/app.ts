import Fastify from "fastify";
import { registerEnv } from "./plugins/env";
import { registerHealthRoute } from "./routes/health";
import { registerInvoiceRoutes } from "./routes/invoices";
import { registerDecryptRoutes } from "./routes/decrypt";
import { registerNonceRoutes } from "./routes/nonces";
import { registerInternalWorkerRoutes } from "./routes/internal-workers";

export async function buildApp() {
  const app = Fastify({
    logger: true,
    requestIdHeader: "x-request-id"
  });

  await registerEnv(app);
  await registerHealthRoute(app);
  await registerNonceRoutes(app);
  await registerInvoiceRoutes(app);
  await registerDecryptRoutes(app);
  await registerInternalWorkerRoutes(app);

  return app;
}
