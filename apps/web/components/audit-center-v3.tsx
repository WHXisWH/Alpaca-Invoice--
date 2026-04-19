'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw, Download, Calendar, User } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { useInvoiceStore } from '@/stores/Invoice/InvoiceState';
import { useUserStore } from '@/stores/User/useUserStore';
import { InvoiceStatus } from '@/lib/types';
import type { Address, EVMInvoice } from '@/lib/types';
import { buildFhenixAuditPackage, downloadJsonFile } from '@/lib/fhenix-audit-package';
import { useChainId } from 'wagmi';

type Role = 'buyer' | 'seller' | null;

function formatFhe(n: bigint): string {
  return (Number(n) / 1_000_000).toFixed(2);
}

function ymdFromDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function AuditCenterV3() {
  const t = useTranslations();
  const invoices = useInvoiceStore((s) => s.invoices);
  const { publicKey } = useUserStore();
  const chainId = useChainId();

  const [role, setRole] = useState<Role>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [expiresAt, setExpiresAt] = useState<string>(ymdFromDate(new Date(Date.now() + 7 * 86400 * 1000)));
  const [loading, setLoading] = useState(false);

  const pk = (publicKey ?? '').toLowerCase();

  const availableRecords = useMemo(() => {
    if (!role) return [];
    return invoices
      .filter((inv) => inv.status === InvoiceStatus.PAID)
      .filter((inv) => {
        if (!pk) return false;
        if (role === 'buyer') return inv.buyer.toLowerCase() === pk;
        return inv.seller.toLowerCase() === pk;
      })
      .map((inv) => ({
        id: inv.id,
        amount: inv.amount,
        paidAt: inv.updatedAt ?? inv.createdAt,
        selected: !!selectedIds[inv.id],
        invoice: inv,
      }));
  }, [role, invoices, pk, selectedIds]);

  const selectionSummary = useMemo(() => {
    const selected = availableRecords.filter((r) => r.selected);
    const totalAmount = selected.reduce((sum, r) => sum + r.amount, 0n);
    return { count: selected.length, totalAmount, invoices: selected.map((r) => r.invoice) };
  }, [availableRecords]);

  const toggleRecord = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = () => {
    setSelectedIds((prev) => {
      const next = { ...prev };
      for (const r of availableRecords) next[r.id] = true;
      return next;
    });
  };

  const deselectAll = () => {
    setSelectedIds((prev) => {
      const next = { ...prev };
      for (const r of availableRecords) next[r.id] = false;
      return next;
    });
  };

  const loadAvailableRecords = () => {
    // Store is already reactive; this keeps parity with the original UI.
    setSelectedIds((prev) => ({ ...prev }));
  };

  const generateFromSelection = async () => {
    if (!publicKey || !role) return;
    setLoading(true);
    try {
      const viewer = publicKey as Address;
      const pkgs = selectionSummary.invoices.map((inv: EVMInvoice) =>
        buildFhenixAuditPackage(inv, viewer, chainId)
      );
      downloadJsonFile(`audit-packages-${new Date().toISOString().slice(0, 10)}.json`, {
        version: 'fhenix-audit-bundle-1.0',
        generatedAt: new Date().toISOString(),
        role,
        expiresAt,
        packages: pkgs,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{t('audit.center.title')}</h2>
      <p className="text-sm text-slate-600">{t('audit.center.generateDescription')}</p>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <User className="h-4 w-4" />
          {t('audit.center.role')}
        </label>
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => setRole('buyer')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
              role === 'buyer' ? 'bg-primary-100 text-primary-800' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t('audit.center.buyerRole')}
          </button>
          <button
            type="button"
            onClick={() => setRole('seller')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
              role === 'seller' ? 'bg-primary-100 text-primary-800' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t('audit.center.sellerRole')}
          </button>
        </div>
      </div>

      {role && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-800">
                {role === 'buyer' ? t('audit.center.paymentRecords') : t('audit.center.paidInvoices')}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={loadAvailableRecords}
                  className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="mr-1 inline h-3 w-3" /> {t('common.refresh')}
                </button>
                <button
                  type="button"
                  onClick={selectAll}
                  className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t('common.selectAll')}
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t('common.clear')}
                </button>
              </div>
            </div>
            <ul className="max-h-48 overflow-auto rounded-lg border border-slate-200">
              {availableRecords.length === 0 ? (
                <li className="px-3 py-4 text-center text-sm text-slate-500">{t('audit.center.noRecords')}</li>
              ) : (
                availableRecords.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-0 hover:bg-slate-50"
                  >
                    <Checkbox checked={r.selected} onCheckedChange={() => toggleRecord(r.id)} />
                    <code className="flex-1 truncate text-xs text-slate-700">{String(r.id).slice(0, 24)}…</code>
                    <span className="text-xs font-medium text-slate-600">{formatFhe(r.amount)}</span>
                    {r.paidAt && <span className="text-xs text-slate-500">{r.paidAt.toLocaleDateString()}</span>}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <Calendar className="h-4 w-4" />
              {t('audit.center.expiryDate')}
            </label>
            <DatePicker value={expiresAt} onChange={(v) => setExpiresAt(v)} />
          </div>

          {selectionSummary.count > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm">
              <p className="font-medium text-amber-900">{t('audit.center.selectionSummary')}</p>
              <p className="mt-1 text-amber-800">
                {selectionSummary.count} record(s) · Total: {formatFhe(selectionSummary.totalAmount)} credits
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={generateFromSelection}
            disabled={loading || selectionSummary.count === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {loading ? t('audit.center.generating') : t('audit.center.generatePackage')}
          </button>
        </>
      )}
    </div>
  );
}

