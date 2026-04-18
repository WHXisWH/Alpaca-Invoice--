"use client";

import { format } from "date-fns";
import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReceiptItem } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ReceiptCardProps {
  receipt: ReceiptItem;
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export default function ReceiptCard({ receipt }: ReceiptCardProps) {
  const t = useTranslations();

  return (
    <TooltipProvider>
      <div className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.3)] backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_46px_-24px_rgba(15,23,42,0.35)]">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-success-500" />
        <div className="p-5 pl-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="mb-1 text-xs font-medium text-primary-500">{t("receipt.paymentId")}</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm font-semibold text-primary-900">
                      {String(receipt.paymentId).slice(0, 16)}...
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(String(receipt.paymentId))}
                      className="cursor-pointer text-primary-400 hover:text-primary-600"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono text-xs">{String(receipt.paymentId)}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-success-100/80 px-2.5 py-1 text-xs font-semibold text-success-700 ring-1 ring-white/60">
              {t("invoice.status.paid")}
            </span>
          </div>

          <div className="mb-4">
            <p className="mb-1 text-xs font-medium text-primary-500">{t("receipt.amount")}</p>
            <p className="text-2xl font-bold text-primary-900">
              {(Number(receipt.amount) / 1_000_000).toFixed(2)}
              <span className="ml-1.5 text-sm font-normal text-primary-500">USD</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="mb-0.5 text-xs text-primary-500">{t("receipt.payer")}</p>
              <code className="block truncate rounded bg-primary-50 px-2 py-1 text-xs text-primary-700">
                {truncateAddress(receipt.payer)}
              </code>
            </div>
            <div>
              <p className="mb-0.5 text-xs text-primary-500">{t("receipt.payee")}</p>
              <code className="block truncate rounded bg-primary-50 px-2 py-1 text-xs text-primary-700">
                {truncateAddress(receipt.payee)}
              </code>
            </div>
            <div>
              <p className="mb-0.5 text-xs text-primary-500">{t("receipt.paidAt")}</p>
              <p className="font-medium text-primary-800">{format(receipt.paidAt, "MMM dd, yyyy HH:mm")}</p>
            </div>
            <div>
              <p className="mb-0.5 text-xs text-primary-500">{t("receipt.invoiceId")}</p>
              <code className="block truncate rounded bg-primary-50 px-2 py-1 text-xs text-primary-700">
                {String(receipt.invoiceId).slice(0, 12)}...
              </code>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
