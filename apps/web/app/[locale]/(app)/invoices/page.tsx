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
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'sent' | 'received' | 'pending' | 'paid' | 'cancelled';

export default function InvoicesPage() {
  const tList = useTranslations('invoice.list');
  const tNav = useTranslations('nav');
  const publicKey = useUserStore((s) => s.publicKey);
  const invoices = useInvoiceStore((s) => s.invoices);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const pk = publicKey?.toLowerCase() ?? '';

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    if (statusFilter === 'sent') {
      filtered = filtered.filter((inv) => inv.seller.toLowerCase() === pk);
    } else if (statusFilter === 'received') {
      filtered = filtered.filter((inv) => inv.buyer.toLowerCase() === pk);
    } else if (statusFilter === 'pending') {
      filtered = filtered.filter((inv) => inv.status === InvoiceStatus.PENDING);
    } else if (statusFilter === 'paid') {
      filtered = filtered.filter((inv) => inv.status === InvoiceStatus.PAID);
    } else if (statusFilter === 'cancelled') {
      filtered = filtered.filter((inv) => inv.status === InvoiceStatus.CANCELLED);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.id.toLowerCase().includes(query) ||
          inv.seller.toLowerCase().includes(query) ||
          inv.buyer.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [invoices, statusFilter, searchQuery, pk]);

  const stats = {
    all: invoices.length,
    sent: invoices.filter((inv) => inv.seller.toLowerCase() === pk).length,
    received: invoices.filter((inv) => inv.buyer.toLowerCase() === pk).length,
    pending: invoices.filter((inv) => inv.status === InvoiceStatus.PENDING).length,
    paid: invoices.filter((inv) => inv.status === InvoiceStatus.PAID).length,
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-primary-600">{tList('searchPlaceholder')}</p>
        <Link
          href="/invoices/create"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-600"
        >
          <Plus className="h-4 w-4" />
          {tNav('createInvoice')}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: tList('roleAll'), value: stats.all, filter: 'all' as const },
          { label: tList('roleSent'), value: stats.sent, filter: 'sent' as const },
          { label: tList('roleReceived'), value: stats.received, filter: 'received' as const },
          { label: tList('filterPending'), value: stats.pending, filter: 'pending' as const },
          { label: tList('filterPaid'), value: stats.paid, filter: 'paid' as const },
        ].map((stat) => (
          <button
            key={stat.filter}
            type="button"
            onClick={() => setStatusFilter(stat.filter)}
            className={statBtn(statusFilter === stat.filter)}
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
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as FilterType)}>
          <SelectTrigger className="w-full sm:w-52">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary-500" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tList('filterAll')}</SelectItem>
            <SelectItem value="sent">{tList('roleSent')}</SelectItem>
            <SelectItem value="received">{tList('roleReceived')}</SelectItem>
            <SelectItem value="pending">{tList('filterPending')}</SelectItem>
            <SelectItem value="paid">{tList('filterPaid')}</SelectItem>
            <SelectItem value="cancelled">{tList('filterCancelled')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="surface-card p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-primary-400" />
          <p className="mt-4 text-lg font-semibold text-primary-900">{tList('emptyTitle')}</p>
          <p className="mt-2 text-sm text-primary-600">{tList('emptyDescription')}</p>
          <Link
            href="/invoices/create"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-600"
          >
            {tList('createFirst')}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-tour="invoice-list">
          {filteredInvoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              role={invoice.seller.toLowerCase() === pk ? 'SELLER' : 'BUYER'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
