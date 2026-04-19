'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Receipt, AlertTriangle, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useInvoiceStore as useCoreInvoiceStore } from '@/stores/invoiceStore';
import { useUserStore } from '@/stores/User/useUserStore';
import { useDisputeStore } from '@/stores/Dispute/useDisputeStore';
import { InvoiceStatus, DisputeStatus } from '@/lib/types';
import InvoiceCard from '@/components/invoice-card';
import { Link } from '@/i18n/navigation';
import { formatFHE } from '@/lib/utils';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const publicKey = useUserStore((s) => s.publicKey);
  const balance = useUserStore((s) => s.balance);
  const invoiceMap = useCoreInvoiceStore((s) => s.invoices);
  const invoiceIds = useCoreInvoiceStore((s) => s.invoiceIds);
  const disputes = useDisputeStore((s) => s.disputes);
  const pk = publicKey?.toLowerCase() ?? '';

  // Convert invoice map to array
  const invoices = invoiceIds
    .map((id) => invoiceMap[id])
    .filter((inv): inv is NonNullable<typeof inv> => inv != null);

  // Filter invoices by status
  const pendingInvoices = invoices.filter(inv => inv.status === InvoiceStatus.PENDING);
  const paidInvoices = invoices.filter(inv => inv.status === InvoiceStatus.PAID);
  const myInvoices = invoices.filter(
    (inv) => inv.seller.toLowerCase() === pk || inv.buyer.toLowerCase() === pk
  );

  // Filter disputes
  const myDisputes = disputes.filter(
    (d) =>
      d.plaintiff.toLowerCase() === pk ||
      d.defendant.toLowerCase() === pk ||
      d.arbiter.toLowerCase() === pk
  );
  const openDisputes = myDisputes.filter(d => d.status === DisputeStatus.OPEN);

  // Calculate statistics
  const stats = [
    {
      title: t('stats.totalInvoices'),
      value: myInvoices.length,
      icon: FileText,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: t('stats.pendingInvoices'),
      value: pendingInvoices.length,
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: t('stats.paidInvoices'),
      value: paidInvoices.length,
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      title: t('stats.openDisputes'),
      value: openDisputes.length,
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950 p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">
              {t('welcome')}
            </h1>
            <p className="mt-2 text-lg text-primary-400 font-medium">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-sm font-medium text-primary-400">{t('yourBalance')}</div>
            <div className="text-2xl font-black text-accent-400">
              {formatFHE(balance || BigInt(0))} FHE
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" data-tour="dashboard-stats">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm transition-all hover:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary-400">{stat.title}</p>
                    <p className="mt-2 text-3xl font-black text-white">{stat.value}</p>
                  </div>
                  <div className={`rounded-xl ${stat.bgColor} p-3`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/invoices/create"
            className="group rounded-2xl border border-white/5 bg-gradient-to-br from-accent-500/10 to-transparent p-6 transition-all hover:border-accent-500/30 hover:bg-accent-500/20"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-accent-500/20 p-3">
                <FileText className="h-6 w-6 text-accent-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">{t('actions.createInvoice')}</h3>
                <p className="text-sm text-primary-400">{t('actions.createInvoiceDesc')}</p>
              </div>
            </div>
          </Link>

          <Link
            href="/invoices"
            className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:border-primary-400/30 hover:bg-white/[0.04]"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-primary-500/20 p-3">
                <Receipt className="h-6 w-6 text-primary-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">{t('actions.viewInvoices')}</h3>
                <p className="text-sm text-primary-400">{t('actions.viewInvoicesDesc')}</p>
              </div>
            </div>
          </Link>

          <Link
            href="/disputes"
            className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:border-red-400/30 hover:bg-white/[0.04]"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-red-500/20 p-3">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">{t('actions.viewDisputes')}</h3>
                <p className="text-sm text-primary-400">{t('actions.viewDisputesDesc')}</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Invoices */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-black text-white">{t('recentInvoices')}</h2>
            <Link
              href="/invoices"
              className="text-sm font-medium text-accent-400 transition-colors hover:text-accent-300"
            >
              {t('viewAll')} →
            </Link>
          </div>

          {myInvoices.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-primary-600" />
              <p className="mt-4 text-lg font-medium text-primary-400">{t('noInvoices')}</p>
              <Link
                href="/invoices/create"
                className="mt-4 inline-block rounded-full bg-accent-500 px-6 py-2 text-sm font-bold text-white transition-all hover:bg-accent-400"
              >
                {t('createFirstInvoice')}
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myInvoices.slice(0, 6).map((invoice) => (
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
    </div>
  );
}
