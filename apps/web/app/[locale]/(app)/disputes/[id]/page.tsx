'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  User,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Copy,
  Scale,
} from 'lucide-react';
import { useDisputeStore } from '@/stores/Dispute/useDisputeStore';
import { useUserStore } from '@/stores/User/useUserStore';
import { DisputeStatus } from '@/lib/types';
import { Link } from '@/i18n/navigation';
import { truncateAddress, formatDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DisputeTimeline from '@/components/dispute-timeline';
import { useFhenixDisputeWrites } from '@/hooks/useFhenixProtocolWrites';
import { areContractsConfigured } from '@/lib/contracts';
import type { Bytes32 } from '@/lib/types';

export default function DisputeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('dispute.detail');
  const publicKey = useUserStore((s) => s.publicKey);
  const disputes = useDisputeStore((s) => s.disputes);
  const updateDispute = useDisputeStore((s) => s.updateDispute);
  const { resolveDispute } = useFhenixDisputeWrites();

  const disputeId = params.id as string;
  const dispute = disputes.find((d) => d.id === disputeId);

  const [isResolving, setIsResolving] = useState(false);

  const pk = publicKey?.toLowerCase() ?? '';
  const role =
    dispute?.plaintiff.toLowerCase() === pk
      ? 'plaintiff'
      : dispute?.defendant.toLowerCase() === pk
      ? 'defendant'
      : dispute?.arbiter.toLowerCase() === pk
      ? 'arbiter'
      : null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('copiedToClipboard'));
  };

  const handleResolve = async (resolution: 'plaintiff' | 'defendant' | 'split') => {
    if (!dispute) return;
    if (resolution === 'split') {
      toast.error(t('splitNotSupported'));
      return;
    }
    if (!areContractsConfigured()) {
      toast.error(t('contractsNotConfigured'));
      return;
    }
    setIsResolving(true);
    try {
      const result = await resolveDispute(dispute.id as Bytes32, resolution);
      if (!result.success) {
        toast.error(result.error || t('resolveFailed'));
        return;
      }
      const nextStatus =
        resolution === 'plaintiff' ? DisputeStatus.RESOLVED_CANCEL : DisputeStatus.RESOLVED_PAY;
      updateDispute(dispute.id as Bytes32, { status: nextStatus });
      toast.success(t('resolveSuccess'));
      router.push('/disputes');
    } catch {
      toast.error(t('resolveFailed'));
    } finally {
      setIsResolving(false);
    }
  };

  if (!dispute) {
    return (
      <div className="space-y-6">
        <div className="mx-auto max-w-4xl">
          <div className="surface-card p-12 text-center">
            <AlertTriangle className="mx-auto h-16 w-16 text-red-400" />
            <p className="mt-4 text-lg font-semibold text-primary-900">{t('disputeNotFound')}</p>
            <Link
              href="/disputes"
              className="mt-6 inline-block rounded-full bg-accent-500 px-6 py-2 text-sm font-bold text-white transition-all hover:bg-accent-400"
            >
              {t('backToDisputes')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = {
    [DisputeStatus.OPEN]: {
      label: t('status.open'),
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
    },
    [DisputeStatus.RESOLVED_CANCEL]: {
      label: t('status.resolvedPlaintiff'),
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    },
    [DisputeStatus.RESOLVED_PAY]: {
      label: t('status.resolvedDefendant'),
      icon: CheckCircle,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
  };

  const status =
    statusConfig[dispute.status as keyof typeof statusConfig] ?? statusConfig[DisputeStatus.OPEN];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <Link
            href="/disputes"
            className="inline-flex items-center gap-2 rounded-full border border-primary-200/60 bg-primary-50/80 px-4 py-2 text-sm font-medium text-primary-300 transition-all hover:bg-primary-100 hover:text-primary-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToDisputes')}
          </Link>

          <div className={cn('inline-flex items-center gap-2 rounded-full px-4 py-2', status.bgColor, status.borderColor, 'border')}>
            <StatusIcon className={cn('h-4 w-4', status.color)} />
            <span className={cn('text-sm font-bold uppercase', status.color)}>{status.label}</span>
          </div>
        </div>

        {/* Dispute Details Card */}
        <div className="surface-card p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-primary-900 tracking-tight">{t('title')}</h1>
            <p className="mt-2 text-sm font-mono text-primary-400">
              {t('disputeId')}: {truncateAddress(dispute.id)}
              <button onClick={() => copyToClipboard(dispute.id)} className="ml-2 inline-block text-accent-400 hover:text-accent-700">
                <Copy className="inline h-3 w-3" />
              </button>
            </p>
            {role && (
              <p className="mt-2 text-sm">
                <span className="rounded-full bg-accent-500/10 px-3 py-1 text-xs font-bold uppercase text-accent-400">
                  {t(`yourRole.${role}`)}
                </span>
              </p>
            )}
          </div>

          {/* Parties Grid */}
          <div className="grid gap-6 sm:grid-cols-3 mb-8">
            {/* Plaintiff */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-primary-600">
                <User className="h-4 w-4" />
                {t('plaintiff')}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-primary-200/60 bg-primary-50/80 px-4 py-3">
                <span className="flex-1 truncate font-mono text-sm text-primary-900">{truncateAddress(dispute.plaintiff)}</span>
                <button onClick={() => copyToClipboard(dispute.plaintiff)} className="text-accent-400 hover:text-accent-700">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              {role === 'plaintiff' && <span className="text-xs font-bold text-accent-400">{t('you')}</span>}
            </div>

            {/* Defendant */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-primary-600">
                <User className="h-4 w-4" />
                {t('defendant')}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-primary-200/60 bg-primary-50/80 px-4 py-3">
                <span className="flex-1 truncate font-mono text-sm text-primary-900">{truncateAddress(dispute.defendant)}</span>
                <button onClick={() => copyToClipboard(dispute.defendant)} className="text-accent-400 hover:text-accent-700">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              {role === 'defendant' && <span className="text-xs font-bold text-accent-400">{t('you')}</span>}
            </div>

            {/* Arbiter */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-primary-600">
                <Scale className="h-4 w-4" />
                {t('arbiter')}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-primary-200/60 bg-primary-50/80 px-4 py-3">
                <span className="flex-1 truncate font-mono text-sm text-primary-900">{truncateAddress(dispute.arbiter)}</span>
                <button onClick={() => copyToClipboard(dispute.arbiter)} className="text-accent-400 hover:text-accent-700">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              {role === 'arbiter' && <span className="text-xs font-bold text-accent-400">{t('you')}</span>}
            </div>
          </div>

          {/* Invoice Reference */}
          <div className="mb-8 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-400">
              <FileText className="h-4 w-4" />
              {t('relatedInvoice')}
            </div>
            <Link
              href={`/invoices/${dispute.invoiceId}`}
              className="mt-2 block font-mono text-base font-semibold text-primary-900 hover:text-accent-400 transition-colors"
            >
              {truncateAddress(dispute.invoiceId)} →
            </Link>
          </div>

          {/* Created Date */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm font-medium text-primary-600">
              <Clock className="h-4 w-4" />
              {t('createdAt')}
            </div>
            <div className="mt-2 text-base text-primary-900">{formatDate(dispute.createdAt)}</div>
          </div>

          {/* Arbiter Actions */}
          {role === 'arbiter' && dispute.status === DisputeStatus.OPEN && (
            <div className="mt-8 space-y-4">
              <h3 className="text-base font-semibold text-primary-900">{t('arbitrationActions')}</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <Button
                  onClick={() => handleResolve('plaintiff')}
                  disabled={isResolving}
                  className="rounded-full bg-green-500 py-4 text-sm font-bold text-white hover:bg-green-400"
                >
                  {t('resolveFavourPlaintiff')}
                </Button>
                <Button
                  onClick={() => handleResolve('defendant')}
                  disabled={isResolving}
                  className="rounded-full bg-blue-500 py-4 text-sm font-bold text-white hover:bg-blue-400"
                >
                  {t('resolveFavourDefendant')}
                </Button>
                <Button
                  type="button"
                  title={t('resolveSplit')}
                  disabled
                  className="rounded-full bg-purple-500/40 py-4 text-sm font-bold text-white/70 cursor-not-allowed"
                >
                  {t('resolveSplit')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Dispute Timeline */}
        <div className="surface-card p-8">
          <h2 className="mb-6 text-xl font-semibold text-primary-900">{t('timeline')}</h2>
          <DisputeTimeline
            dispute={{
              createdAt: dispute.createdAt,
              resolutionDeadline: dispute.resolutionDeadline,
              status: dispute.status,
              evidenceHash: dispute.evidenceHash,
              disputant: dispute.plaintiff,
            }}
          />
        </div>
      </div>
    </div>
  );
}
