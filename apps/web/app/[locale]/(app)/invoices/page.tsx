'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Filter, Search, Plus } from 'lucide-react';
import { useInvoiceStore } from '@/stores/Invoice/InvoiceState';
import { useUserStore } from '@/stores/User/useUserStore';
import { InvoiceStatus } from '@/lib/types';
import InvoiceCard from '@/components/invoice-card';
import { Link } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type FilterType = 'all' | 'sent' | 'received' | 'pending' | 'paid' | 'cancelled';

export default function InvoicesPage() {
  const t = useTranslations('invoices');
  const publicKey = useUserStore((s) => s.publicKey);
  const invoices = useInvoiceStore((s) => s.invoices);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');

  // Filter and search invoices
  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    // Apply role filter
    if (statusFilter === 'sent') {
      filtered = filtered.filter(inv => inv.seller === publicKey);
    } else if (statusFilter === 'received') {
      filtered = filtered.filter(inv => inv.buyer === publicKey);
    } else if (statusFilter === 'pending') {
      filtered = filtered.filter(inv => inv.status === InvoiceStatus.PENDING);
    } else if (statusFilter === 'paid') {
      filtered = filtered.filter(inv => inv.status === InvoiceStatus.PAID);
    } else if (statusFilter === 'cancelled') {
      filtered = filtered.filter(inv => inv.status === InvoiceStatus.CANCELLED);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.id.toLowerCase().includes(query) ||
        inv.seller.toLowerCase().includes(query) ||
        inv.buyer.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [invoices, statusFilter, searchQuery, publicKey]);

  // Group by status
  const stats = {
    all: invoices.length,
    sent: invoices.filter(inv => inv.seller === publicKey).length,
    received: invoices.filter(inv => inv.buyer === publicKey).length,
    pending: invoices.filter(inv => inv.status === InvoiceStatus.PENDING).length,
    paid: invoices.filter(inv => inv.status === InvoiceStatus.PAID).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">
              {t('title')}
            </h1>
            <p className="mt-2 text-lg text-primary-400 font-medium">
              {t('subtitle')}
            </p>
          </div>
          <Link
            href="/invoices/create"
            className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-accent-400 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            {t('createInvoice')}
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: t('stats.all'), value: stats.all, filter: 'all' },
            { label: t('stats.sent'), value: stats.sent, filter: 'sent' },
            { label: t('stats.received'), value: stats.received, filter: 'received' },
            { label: t('stats.pending'), value: stats.pending, filter: 'pending' },
            { label: t('stats.paid'), value: stats.paid, filter: 'paid' },
          ].map((stat) => (
            <button
              key={stat.filter}
              onClick={() => setStatusFilter(stat.filter as FilterType)}
              className={`rounded-xl border p-4 text-left transition-all ${
                statusFilter === stat.filter
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
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as FilterType)}>
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
              <SelectItem value="pending">{t('filters.pending')}</SelectItem>
              <SelectItem value="paid">{t('filters.paid')}</SelectItem>
              <SelectItem value="cancelled">{t('filters.cancelled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Invoice List */}
        {filteredInvoices.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
            <FileText className="mx-auto h-16 w-16 text-primary-600" />
            <p className="mt-4 text-xl font-bold text-primary-300">{t('noInvoices')}</p>
            <p className="mt-2 text-sm text-primary-500">{t('noInvoicesDesc')}</p>
            <Link
              href="/invoices/create"
              className="mt-6 inline-block rounded-full bg-accent-500 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-accent-400"
            >
              {t('createFirstInvoice')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-tour="invoice-list">
            {filteredInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                role={invoice.seller === publicKey ? 'SELLER' : 'BUYER'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
