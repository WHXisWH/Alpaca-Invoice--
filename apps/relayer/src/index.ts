import { buildApp } from "./app";
import { buildDefaultWorkers } from "./routes/internal-workers";
import { createPrismaClient, OutboxRepository } from "@alpaca/database";
import dotenv from "dotenv";
import path from "node:path";

const WORKER_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS ?? "30000");

async function startWorkerLoop(log: { info: (msg: string) => void; error: (msg: string, err?: unknown) => void }) {
  const workers = buildDefaultWorkers();

  async function tick() {
    try {
      const submission = await workers.submission.drain();
      if (submission.published > 0 || submission.failed > 0) {
        log.info(`[worker] invoice-submissions: scanned=${submission.scanned} published=${submission.published} failed=${submission.failed}`);
      }
    } catch (err) {
      log.error("[worker] invoice-submissions drain error", err);
    }

    try {
      const reconciliation = await workers.reconciliation.drain();
      if (reconciliation.reconciled > 0 || reconciliation.failed > 0) {
        log.info(`[worker] invoice-reconciliation: scanned=${reconciliation.scanned} reconciled=${reconciliation.reconciled} failed=${reconciliation.failed}`);
      }
    } catch (err) {
      log.error("[worker] invoice-reconciliation drain error", err);
    }
  }

  // Requeue any stuck invoices (no chainTxHash, no pending outbox event)
  try {
    const outbox = new OutboxRepository(createPrismaClient());
    const requeued = await outbox.requeueStuckInvoices();
    if (requeued > 0) {
      log.info(`[worker] requeued ${requeued} stuck invoice(s) with no chain submission`);
    }
  } catch (err) {
    log.error("[worker] requeue stuck invoices error", err);
  }

  // Run immediately on start, then on interval
  tick();
  setInterval(tick, WORKER_INTERVAL_MS);
  log.info(`[worker] background loop started (interval=${WORKER_INTERVAL_MS}ms)`);
}

async function main() {
  const repoRoot = path.resolve(__dirname, "..", "..", "..");
  dotenv.config({ path: path.join(repoRoot, ".env") });
  dotenv.config({ path: path.join(repoRoot, "apps", "relayer", ".env") });

  const app = await buildApp();
  const port = Number(process.env.RELAYER_PORT ?? 4100);
  const host = process.env.RELAYER_HOST ?? "0.0.0.0";

  await app.listen({ port, host });
  app.log.info(`relayer listening on ${host}:${port}`);

  startWorkerLoop({
    info: (msg) => app.log.info(msg),
    error: (msg, err) => app.log.error({ err }, msg)
  }).catch((err) => app.log.error({ err }, "[worker] startWorkerLoop failed"));
}

main().catch((error) => {
  console.error("[relayer] boot failed", error);
  process.exit(1);
});
