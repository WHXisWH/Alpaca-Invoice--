'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Receipt, Search, Download, Filter } from 'lucide-react';
import { useUserStore } from '@/stores/User/useUserStore';
import { useReceiptStore } from '@/stores/receiptStore';
import ReceiptCard from '@/components/receipt-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ReceiptsPage() {
  const t = useTranslations('receipts');
  const publicKey = useUserStore((s) => s.publicKey);
  const receipts = useReceiptStore((s) => s.receipts);
  const pk = publicKey?.toLowerCase() ?? '';

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'sent' | 'received'>('all');

  // Filter receipts
  const filteredReceipts = useMemo(() => {
    let filtered = receipts;

    // Apply role filter
    if (roleFilter === 'sent') {
      filtered = filtered.filter((r) => r.payer.toLowerCase() === pk);
    } else if (roleFilter === 'received') {
      filtered = filtered.filter((r) => r.payee.toLowerCase() === pk);
    }

    // Apply search
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">{t('title')}</h1>
          <p className="mt-2 text-lg text-primary-400 font-medium">{t('subtitle')}</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: t('stats.all'), value: stats.all, filter: 'all' },
            { label: t('stats.sent'), value: stats.sent, filter: 'sent' },
            { label: t('stats.received'), value: stats.received, filter: 'received' },
          ].map((stat) => (
            <button
              key={stat.filter}
              onClick={() => setRoleFilter(stat.filter as 'all' | 'sent' | 'received')}
              className={`rounded-xl border p-4 text-left transition-all ${
                roleFilter === stat.filter
                  ? 'border-accent-500/50 bg-accent-500/10'
                  : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <div className="text-sm font-medium text-primary-400">{stat.label}</div>
              <div className="mt-1 text-2xl font-black text-white">{stat.value}</div>
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary-500" />
            <Input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-primary-500"
            />
          </div>
          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as 'all' | 'sent' | 'received')}>
            <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10 text-white">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.all')}</SelectItem>
              <SelectItem value="sent">{t('filters.sent')}</SelectItem>
              <SelectItem value="received">{t('filters.received')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Receipts List */}
        {filteredReceipts.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
            <Receipt className="mx-auto h-16 w-16 text-primary-600" />
            <p className="mt-4 text-xl font-bold text-primary-300">{t('noReceipts')}</p>
            <p className="mt-2 text-sm text-primary-500">{t('noReceiptsDesc')}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredReceipts.map((receipt) => (
              <ReceiptCard key={receipt.paymentId} receipt={receipt} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
