'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Calendar,
  User,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useInvoiceStore, persistInvoiceToStore } from '@/stores/Invoice/InvoiceState';
import { useUserStore } from '@/stores/User/useUserStore';
import { useReceiptStore } from '@/stores/receiptStore';
import { useFhenixInvoiceWrites } from '@/hooks/useFhenixProtocolWrites';
import { areContractsConfigured } from '@/lib/contracts';
import { InvoiceStatus, type Bytes32 } from '@/lib/types';
import { Link } from '@/i18n/navigation';
import { formatFHE, formatDate, truncateAddress, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('invoice.detail');
  const publicKey = useUserStore((s) => s.publicKey);
  const invoices = useInvoiceStore((s) => s.invoices);

  const invoiceId = params.id as string;
  const invoice = invoices.find((inv) => inv.id === invoiceId);

  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [isCancelLoading, setIsCancelLoading] = useState(false);

  const { payInvoice, cancelInvoice } = useFhenixInvoiceWrites();
  const addReceipt = useReceiptStore((s) => s.addReceipt);

  const pk = publicKey?.toLowerCase() ?? '';
  const role =
    invoice?.seller.toLowerCase() === pk ? 'SELLER' : invoice?.buyer.toLowerCase() === pk ? 'BUYER' : null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('copiedToClipboard'));
  };

  const handlePayInvoice = async () => {
    if (!invoice) return;
    if (!areContractsConfigured()) {
      toast.error(t('contractsNotConfigured'));
      return;
    }
    setIsPaymentLoading(true);
    try {
      const result = await payInvoice(invoice.id as Bytes32);
      if (!result.success || !result.transactionHash) {
        toast.error(result.error || t('paymentFailed'));
        return;
      }
      const paidAt = new Date();
      persistInvoiceToStore({
        ...invoice,
        status: InvoiceStatus.PAID,
        transactionHash: result.transactionHash,
        updatedAt: paidAt,
      });
      const receipt = {
        paymentId: result.transactionHash,
        invoiceId: invoice.id,
        payer: invoice.buyer,
        payee: invoice.seller,
        amount: invoice.amount,
        paidAt,
        ...(invoice.details ? { details: invoice.details } : {}),
      };
      addReceipt(receipt);
      toast.success(t('paymentSuccess'));
      router.push('/invoices');
    } catch (error) {
      toast.error(t('paymentFailed'));
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!invoice) return;
    if (!areContractsConfigured()) {
      toast.error(t('contractsNotConfigured'));
      return;
    }
    setIsCancelLoading(true);
    try {
      const result = await cancelInvoice(invoice.id as Bytes32);
      if (!result.success) {
        toast.error(result.error || t('cancelFailed'));
        return;
      }
      persistInvoiceToStore({
        ...invoice,
        status: InvoiceStatus.CANCELLED,
        ...(result.transactionHash ? { transactionHash: result.transactionHash } : {}),
        updatedAt: new Date(),
      });
      toast.success(t('cancelSuccess'));
      router.push('/invoices');
    } catch (error) {
      toast.error(t('cancelFailed'));
    } finally {
      setIsCancelLoading(false);
    }
  };

  if (!invoice) {
    return (
      <div className="space-y-6">
        <div className="mx-auto max-w-4xl">
          <div className="surface-card p-12 text-center">
            <AlertTriangle className="mx-auto h-16 w-16 text-red-400" />
            <p className="mt-4 text-lg font-semibold text-primary-900">{t('invoiceNotFound')}</p>
            <Link
              href="/invoices"
              className="mt-6 inline-block rounded-full bg-accent-500 px-6 py-2 text-sm font-bold text-white transition-all hover:bg-accent-400"
            >
              {t('backToInvoices')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = {
    [InvoiceStatus.PENDING]: {
      label: t('status.pending'),
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
    },
    [InvoiceStatus.PAID]: {
      label: t('status.paid'),
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    },
    [InvoiceStatus.CANCELLED]: {
      label: t('status.cancelled'),
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
    },
    [InvoiceStatus.DISPUTED]: {
      label: t('status.disputed'),
      icon: AlertTriangle,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
    },
  };

  const status =
    statusConfig[invoice.status as keyof typeof statusConfig] ??
    statusConfig[InvoiceStatus.PENDING];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <Link
            href="/invoices"
            className="inline-flex items-center gap-2 rounded-full border border-primary-200/60 bg-primary-50/80 px-4 py-2 text-sm font-medium text-primary-300 transition-all hover:bg-primary-100 hover:text-primary-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToInvoices')}
          </Link>

          <div className={cn('inline-flex items-center gap-2 rounded-full px-4 py-2', status.bgColor, status.borderColor, 'border')}>
            <StatusIcon className={cn('h-4 w-4', status.color)} />
            <span className={cn('text-sm font-bold uppercase', status.color)}>{status.label}</span>
          </div>
        </div>

        {/* Invoice Details Card */}
        <div className="surface-card p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-primary-900 tracking-tight">{t('title')}</h1>
            <p className="mt-2 text-sm font-mono text-primary-400">
              {t('invoiceId')}: {truncateAddress(invoice.id)}
              <button onClick={() => copyToClipboard(invoice.id)} className="ml-2 inline-block text-accent-400 hover:text-accent-700">
                <Copy className="inline h-3 w-3" />
              </button>
            </p>
          </div>

          {/* Amount Section */}
          <div className="mb-8 rounded-2xl border border-accent-500/20 bg-accent-500/5 p-6">
            <div className="text-sm font-medium text-primary-400">{t('totalAmount')}</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-5xl font-black text-accent-400">{formatFHE(invoice.amount)}</span>
              <span className="text-2xl font-bold text-accent-400">FHE</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Seller */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-primary-600">
                <User className="h-4 w-4" />
                {t('seller')}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-primary-200/60 bg-primary-50/80 px-4 py-3">
                <span className="flex-1 truncate font-mono text-sm text-primary-900">{truncateAddress(invoice.seller)}</span>
                <button onClick={() => copyToClipboard(invoice.seller)} className="text-accent-400 hover:text-accent-700">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              {role === 'SELLER' && <span className="text-xs font-bold text-accent-400">{t('youAreSeller')}</span>}
            </div>

            {/* Buyer */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-primary-600">
                <User className="h-4 w-4" />
                {t('buyer')}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-primary-200/60 bg-primary-50/80 px-4 py-3">
                <span className="flex-1 truncate font-mono text-sm text-primary-900">{truncateAddress(invoice.buyer)}</span>
                <button onClick={() => copyToClipboard(invoice.buyer)} className="text-accent-400 hover:text-accent-700">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              {role === 'BUYER' && <span className="text-xs font-bold text-accent-400">{t('youAreBuyer')}</span>}
            </div>

            {/* Created At */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-primary-600">
                <Calendar className="h-4 w-4" />
                {t('createdAt')}
              </div>
              <div className="rounded-xl border border-primary-200/60 bg-primary-50/80 px-4 py-3 text-sm text-primary-900">
                {formatDate(invoice.createdAt)}
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-primary-600">
                <Clock className="h-4 w-4" />
                {t('dueDate')}
              </div>
              <div className="rounded-xl border border-primary-200/60 bg-primary-50/80 px-4 py-3 text-sm text-primary-900">
                {formatDate(invoice.dueDate)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex gap-4">
            {role === 'BUYER' && invoice.status === InvoiceStatus.PENDING && (
              <Button
                onClick={handlePayInvoice}
                disabled={isPaymentLoading}
                className="flex-1 rounded-full bg-accent-500 py-6 text-base font-semibold text-primary-900 hover:bg-accent-400"
              >
                {isPaymentLoading ? t('processing') : t('payInvoice')}
              </Button>
            )}

            {role === 'SELLER' && invoice.status === InvoiceStatus.PENDING && (
              <Button
                onClick={handleCancelInvoice}
                disabled={isCancelLoading}
                variant="outline"
                className="flex-1 rounded-full border-primary-200/60 py-6 text-lg font-bold hover:bg-primary-50/90"
              >
                {isCancelLoading ? t('processing') : t('cancelInvoice')}
              </Button>
            )}

            {invoice.status === InvoiceStatus.PAID && (
              <Link href="/receipts" className="flex-1">
                <Button className="w-full rounded-full bg-green-500 py-6 text-base font-semibold text-primary-900 hover:bg-green-400">
                  {t('viewReceipt')}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Transaction Hash (if available) */}
        {invoice.status === InvoiceStatus.PAID && (
          <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-green-400">{t('transactionDetails')}</h3>
            <div className="flex items-center gap-2">
              <span className="flex-1 truncate font-mono text-sm text-primary-600">{t('viewOnExplorer')}</span>
              <button className="text-green-400 hover:text-green-300">
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
