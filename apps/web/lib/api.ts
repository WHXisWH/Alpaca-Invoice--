import type { InvoiceProjection, ListInvoicesQuery, RelayerNonceResponse } from "@alpaca/shared";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchInvoices(query?: ListInvoicesQuery) {
  const params = new URLSearchParams();

  if (query?.limit !== undefined) {
    params.set("limit", String(query.limit));
  }
  if (query?.status) {
    params.set("status", query.status);
  }
  if (query?.submissionStatus) {
    params.set("submissionStatus", query.submissionStatus);
  }
  if (query?.attentionOnly !== undefined) {
    params.set("attentionOnly", String(query.attentionOnly));
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";

  return requestJson<{ invoices: InvoiceProjection[]; total: number }>(`/api/invoices${suffix}`);
}

export function fetchInvoice(invoiceId: string) {
  return requestJson<{ invoice: InvoiceProjection }>(`/api/invoices/${invoiceId}`);
}

export function fetchNonce(address: string) {
  return requestJson<RelayerNonceResponse>(`/api/nonces/${address}`);
}

export function postInvoice<T>(body: unknown) {
  return requestJson<T>("/api/invoices/create", {
    method: "POST",
    body: JSON.stringify(body)
  });
}
