import { buildApp } from "./app";

async function main() {
  const app = await buildApp();
  const port = Number(process.env.RELAYER_PORT ?? 4100);
  const host = process.env.RELAYER_HOST ?? "0.0.0.0";

  await app.listen({ port, host });
  app.log.info(`relayer listening on ${host}:${port}`);
}

main().catch((error) => {
  console.error("[relayer] boot failed", error);
  process.exit(1);
});
