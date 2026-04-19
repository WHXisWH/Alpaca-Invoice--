'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Receipt, Search, Filter } from 'lucide-react';
import { useUserStore } from '@/stores/User/useUserStore';
import { useReceiptStore } from '@/stores/receiptStore';
import ReceiptCard from '@/components/receipt-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function ReceiptsPage() {
  const tReceipt = useTranslations('receipt');
  const tList = useTranslations('invoice.list');
  const publicKey = useUserStore((s) => s.publicKey);
  const receipts = useReceiptStore((s) => s.receipts);
  const pk = publicKey?.toLowerCase() ?? '';

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'sent' | 'received'>('all');

  const filteredReceipts = useMemo(() => {
    let filtered = receipts;

    if (roleFilter === 'sent') {
      filtered = filtered.filter((r) => r.payer.toLowerCase() === pk);
    } else if (roleFilter === 'received') {
      filtered = filtered.filter((r) => r.payee.toLowerCase() === pk);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.paymentId.toLowerCase().includes(query) ||
          r.invoiceId.toLowerCase().includes(query) ||
          r.payer.toLowerCase().includes(query) ||
          r.payee.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [receipts, roleFilter, searchQuery, pk]);

  const stats = {
    all: receipts.length,
    sent: receipts.filter((r) => r.payer.toLowerCase() === pk).length,
    received: receipts.filter((r) => r.payee.toLowerCase() === pk).length,
  };

  const statBtn = (active: boolean) =>
    cn(
      'rounded-xl border p-4 text-left transition-all',
      active
        ? 'border-accent-300 bg-accent-50/80 shadow-sm'
        : 'border-primary-200/60 bg-white/70 hover:border-primary-300 hover:shadow-sm'
    );

  return (
    <div className="space-y-6">
      <p className="text-sm text-primary-600">{tReceipt('description')}</p>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: tList('roleAll'), value: stats.all, filter: 'all' as const },
          { label: tList('roleSent'), value: stats.sent, filter: 'sent' as const },
          { label: tList('roleReceived'), value: stats.received, filter: 'received' as const },
        ].map((stat) => (
          <button
            key={stat.filter}
            type="button"
            onClick={() => setRoleFilter(stat.filter)}
            className={statBtn(roleFilter === stat.filter)}
          >
            <div className="text-sm font-medium text-primary-500">{stat.label}</div>
            <div className="mt-1 text-2xl font-bold text-primary-900">{stat.value}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary-400" />
          <Input
            type="text"
            placeholder={tList('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as 'all' | 'sent' | 'received')}>
          <SelectTrigger className="w-full sm:w-52">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary-500" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tList('roleAll')}</SelectItem>
            <SelectItem value="sent">{tList('roleSent')}</SelectItem>
            <SelectItem value="received">{tList('roleReceived')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredReceipts.length === 0 ? (
        <div className="surface-card p-12 text-center">
          <Receipt className="mx-auto h-12 w-12 text-primary-400" />
          <p className="mt-4 text-lg font-semibold text-primary-900">{tReceipt('emptyTitle')}</p>
          <p className="mt-2 text-sm text-primary-600">{tReceipt('emptyDescription')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredReceipts.map((r) => (
            <ReceiptCard key={r.paymentId} receipt={r} />
          ))}
        </div>
      )}
    </div>
  );
}
