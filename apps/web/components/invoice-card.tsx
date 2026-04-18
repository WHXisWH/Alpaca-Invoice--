"use client";

import { format } from "date-fns";
import Link from "next/link";
import { Copy, Eye, Package } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Invoice } from "@/lib/types";
import { InvoiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface InvoiceCardProps {
  invoice: Invoice;
  role?: "SELLER" | "BUYER" | "BOTH" | "NONE";
  showFullAddresses?: boolean;
}

const statusBarColors: Record<InvoiceStatus, string> = {
  [InvoiceStatus.PENDING]: "bg-warning-400",
  [InvoiceStatus.PAID]: "bg-success-500",
  [InvoiceStatus.CANCELLED]: "bg-primary-400",
  [InvoiceStatus.EXPIRED]: "bg-error-500",
  [InvoiceStatus.DISPUTED]: "bg-amber-500",
  [InvoiceStatus.RESOLVED_CANCELLED]: "bg-red-400",
  [InvoiceStatus.RESOLVED_PAID]: "bg-emerald-400",
  [InvoiceStatus.ESCROWED]: "bg-blue-500",
  [InvoiceStatus.REFUNDED]: "bg-orange-400"
};

function truncateAddress(addr: string, showFullAddresses: boolean) {
  return showFullAddresses ? addr : `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export default function InvoiceCard({
  invoice,
  role = "BUYER",
  showFullAddresses = false
}: InvoiceCardProps) {
  const t = useTranslations();
  const details = invoice.details;
  const displayCurrency = details?.currency ?? "USD";

  return (
    <TooltipProvider>
      <div className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.3)] backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_46px_-24px_rgba(15,23,42,0.35)]">
        <div className={cn("absolute left-0 top-0 bottom-0 w-1", statusBarColors[invoice.status])} />

        <div className="p-5 pl-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="mb-1 text-xs font-medium text-primary-500">{t("invoice.detail.invoiceId")}</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm font-semibold text-primary-900">
                      {invoice.id.slice(0, 16)}...
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(invoice.id)}
                      className="cursor-pointer text-primary-400 hover:text-primary-600"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono text-xs">{invoice.id}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <StatusBadge status={invoice.status} />
          </div>

          <div className="mb-4">
            <p className="mb-1 text-xs font-medium text-primary-500">{t("invoice.detail.amount")}</p>
            <p className="text-2xl font-bold text-primary-900">
              {(Number(invoice.amount) / 1_000_000).toFixed(2)}
              <span className="ml-1.5 text-sm font-normal text-primary-500">{displayCurrency}</span>
            </p>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="mb-0.5 text-xs text-primary-500">{t("invoice.detail.buyer")}</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <code className="block truncate rounded bg-primary-50 px-2 py-1 text-xs text-primary-700">
                    {truncateAddress(invoice.buyer, showFullAddresses)}
                  </code>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono text-xs">{invoice.buyer}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div>
              <p className="mb-0.5 text-xs text-primary-500">{t("invoice.detail.dueDate")}</p>
              <p className="font-medium text-primary-800">{format(invoice.dueDate, "MMM dd, yyyy")}</p>
            </div>
          </div>

          {details ? (
            <div className="mb-4 rounded-lg bg-accent-50/60 px-3 py-2 ring-1 ring-accent-200/30">
              <div className="flex items-center gap-2 text-xs text-accent-700">
                <Package className="h-3.5 w-3.5" />
                <span className="font-medium">{details.invoiceNumber}</span>
                <span className="text-accent-500">·</span>
                <span>
                  {details.lineItems.length} {details.lineItems.length !== 1 ? t("invoice.card.items") : t("invoice.card.item")}
                </span>
                <span className="text-accent-500">·</span>
                <span>{details.currency}</span>
              </div>
            </div>
          ) : null}

          <div className="flex gap-2 border-t border-primary-100/70 pt-4">
            <Link
              href={`/invoices/${invoice.invoiceHash}`}
              className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary-200/60 bg-white/70 px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-white"
            >
              <Eye className="h-4 w-4" />
              {t("invoice.card.view")}
            </Link>
            <div className="inline-flex items-center justify-center rounded-lg border border-primary-200/60 bg-primary-50/60 px-3 py-2 text-xs font-semibold text-primary-600">
              {role}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
