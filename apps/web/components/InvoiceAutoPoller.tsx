'use client';

/**
 * Placeholder for the legacy Aleo invoice polling pipeline (sendingInvoiceHashes + chain KV sync).
 * The Fhenix/EVM web app uses a different store shape and confirmation flow; keep the layout slot
 * without importing Aleo-only modules so the app typechecks and builds.
 */
export function InvoiceAutoPoller() {
  return null;
}
