'use client';

import { useTranslations } from 'next-intl';
import { FileText, Receipt, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useInvoiceStore as useCoreInvoiceStore } from '@/stores/invoiceStore';
import { useUserStore } from '@/stores/User/useUserStore';
import { useDisputeStore } from '@/stores/Dispute/useDisputeStore';
import { InvoiceStatus, DisputeStatus } from '@/lib/types';
import InvoiceCard from '@/components/invoice-card';
import { Link } from '@/i18n/navigation';
import { formatFHE } from '@/lib/utils';
import { MotionContainer, MotionItem } from '@/components/ui/motion';

export default function DashboardPage() {
  const tDash = useTranslations('dashboard');
  const tNav = useTranslations('nav');
  const tInv = useTranslations('invoice.list');
  const tDispute = useTranslations('dispute');
  const tWallet = useTranslations('wallet');
  const tHero = useTranslations('landing.hero');
  const tCommon = useTranslations('common');

  const publicKey = useUserStore((s) => s.publicKey);
  const balance = useUserStore((s) => s.balance);
  const invoiceMap = useCoreInvoiceStore((s) => s.invoices);
  const invoiceIds = useCoreInvoiceStore((s) => s.invoiceIds);
  const disputes = useDisputeStore((s) => s.disputes);
  const pk = publicKey?.toLowerCase() ?? '';

  const invoices = invoiceIds
    .map((id) => invoiceMap[id])
    .filter((inv): inv is NonNullable<typeof inv> => inv != null);

  const pendingInvoices = invoices.filter((inv) => inv.status === InvoiceStatus.PENDING);
  const paidInvoices = invoices.filter((inv) => inv.status === InvoiceStatus.PAID);
  const myInvoices = invoices.filter(
    (inv) => inv.seller.toLowerCase() === pk || inv.buyer.toLowerCase() === pk
  );

  const myDisputes = disputes.filter(
    (d) =>
      d.plaintiff.toLowerCase() === pk ||
      d.defendant.toLowerCase() === pk ||
      d.arbiter.toLowerCase() === pk
  );
  const openDisputes = myDisputes.filter((d) => d.status === DisputeStatus.OPEN);

  const stats = [
    {
      title: tDash('stats.totalInvoices'),
      value: myInvoices.length,
      icon: FileText,
      iconWrap: 'bg-info-100/80 ring-info-200/40',
      iconClass: 'text-info-600',
    },
    {
      title: tDash('stats.pendingCount'),
      value: pendingInvoices.length,
      icon: Clock,
      iconWrap: 'bg-warning-100/80 ring-warning-200/40',
      iconClass: 'text-warning-600',
    },
    {
      title: tDash('stats.paidCount'),
      value: paidInvoices.length,
      icon: CheckCircle,
      iconWrap: 'bg-success-100/80 ring-success-200/40',
      iconClass: 'text-success-600',
    },
    {
      title: tNav('disputes'),
      value: openDisputes.length,
      icon: AlertTriangle,
      iconWrap: 'bg-error-100/80 ring-error-200/40',
      iconClass: 'text-error-600',
    },
  ];

  return (
    <MotionContainer className="space-y-6">
      <MotionItem className="surface-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary-500">{tDash('welcome')}</p>
            <p className="mt-1 text-sm text-primary-600">{tHero('subtitle')}</p>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium uppercase tracking-wide text-primary-500">
              {tWallet('balance')}
            </div>
            <div className="text-xl font-bold text-primary-900">{formatFHE(balance || BigInt(0))} FHE</div>
          </div>
        </div>
      </MotionItem>

      <MotionContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.06}>
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <MotionItem key={idx} className="surface-card card-hover p-5">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 ${stat.iconWrap}`}
                >
                  <Icon className={`h-6 w-6 ${stat.iconClass}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary-900">{stat.value}</p>
                  <p className="text-sm text-primary-500">{stat.title}</p>
                </div>
              </div>
            </MotionItem>
          );
        })}
      </MotionContainer>

      <MotionItem className="surface-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-primary-900">{tDash('quickActions')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-tour="dashboard-stats">
          <Link
            href="/invoices/create"
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-primary-200/60 bg-white/70 p-4 transition-all hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100/80 ring-1 ring-accent-200/40">
              <FileText className="h-5 w-5 text-accent-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-primary-900">{tNav('createInvoice')}</div>
              <div className="text-xs text-primary-500">{tInv('emptyDescription')}</div>
            </div>
          </Link>

          <Link
            href="/invoices"
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-primary-200/60 bg-white/70 p-4 transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100/80 ring-1 ring-primary-200/40">
              <Receipt className="h-5 w-5 text-primary-700" />
            </div>
            <div>
              <div className="text-sm font-semibold text-primary-900">{tNav('invoices')}</div>
              <div className="text-xs text-primary-500">{tInv('searchPlaceholder')}</div>
            </div>
          </Link>

          <Link
            href="/disputes"
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-primary-200/60 bg-white/70 p-4 transition-all hover:-translate-y-0.5 hover:border-error-200 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-error-100/80 ring-1 ring-error-200/40">
              <AlertTriangle className="h-5 w-5 text-error-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-primary-900">{tNav('disputes')}</div>
              <div className="text-xs text-primary-500">{tDispute('emptyDescription')}</div>
            </div>
          </Link>
        </div>
      </MotionItem>

      <MotionItem className="surface-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-900">{tDash('recentInvoices')}</h2>
          <Link
            href="/invoices"
            className="text-sm font-medium text-accent-600 transition-colors hover:text-accent-700"
          >
            {tCommon('viewAll')} →
          </Link>
        </div>

        {myInvoices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-primary-200/80 bg-primary-50/40 p-10 text-center">
            <FileText className="mx-auto h-10 w-10 text-primary-400" />
            <p className="mt-3 text-sm font-medium text-primary-700">{tInv('emptyTitle')}</p>
            <Link
              href="/invoices/create"
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-600"
            >
              {tHero('createFirstInvoice')}
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
      </MotionItem>
    </MotionContainer>
  );
}
