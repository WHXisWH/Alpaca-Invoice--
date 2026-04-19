'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Search, Filter, Clock, CheckCircle } from 'lucide-react';
import { useDisputeStore } from '@/stores/Dispute/useDisputeStore';
import { useUserStore } from '@/stores/User/useUserStore';
import { DisputeStatus } from '@/lib/types';
import { Link } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { truncateAddress, formatDate, cn } from '@/lib/utils';

type FilterType = 'all' | 'plaintiff' | 'defendant' | 'arbiter' | 'open' | 'resolved';

export default function DisputesPage() {
  const t = useTranslations('dispute');
  const td = useTranslations('dispute.detail');
  const tReceipt = useTranslations('receipt');
  const tCommon = useTranslations('common');
  const publicKey = useUserStore((s) => s.publicKey);
  const disputes = useDisputeStore((s) => s.disputes);
  const pk = publicKey?.toLowerCase() ?? '';

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredDisputes = useMemo(() => {
    let filtered = disputes;

    if (filter === 'plaintiff') {
      filtered = filtered.filter((d) => d.plaintiff.toLowerCase() === pk);
    } else if (filter === 'defendant') {
      filtered = filtered.filter((d) => d.defendant.toLowerCase() === pk);
    } else if (filter === 'arbiter') {
      filtered = filtered.filter((d) => d.arbiter.toLowerCase() === pk);
    } else if (filter === 'open') {
      filtered = filtered.filter((d) => d.status === DisputeStatus.OPEN);
    } else if (filter === 'resolved') {
      filtered = filtered.filter((d) => d.status !== DisputeStatus.OPEN);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.id.toLowerCase().includes(query) ||
          d.invoiceId.toLowerCase().includes(query) ||
          d.plaintiff.toLowerCase().includes(query) ||
          d.defendant.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [disputes, filter, searchQuery, pk]);

  const stats = {
    all: disputes.length,
    plaintiff: disputes.filter((d) => d.plaintiff.toLowerCase() === pk).length,
    defendant: disputes.filter((d) => d.defendant.toLowerCase() === pk).length,
    arbiter: disputes.filter((d) => d.arbiter.toLowerCase() === pk).length,
    open: disputes.filter((d) => d.status === DisputeStatus.OPEN).length,
  };

  const getDisputeStatusConfig = useCallback(
    (status: DisputeStatus) => {
      const configs = {
        [DisputeStatus.OPEN]: {
          label: td('status.open'),
          icon: Clock,
          color: 'text-amber-700',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
        },
        [DisputeStatus.RESOLVED_CANCEL]: {
          label: td('status.resolvedPlaintiff'),
          icon: CheckCircle,
          color: 'text-emerald-700',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
        },
        [DisputeStatus.RESOLVED_PAY]: {
          label: td('status.resolvedDefendant'),
          icon: CheckCircle,
          color: 'text-blue-700',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
        },
      };
      return configs[status as keyof typeof configs] ?? configs[DisputeStatus.OPEN];
    },
    [td]
  );

  const statBtn = (active: boolean) =>
    cn(
      'rounded-xl border p-4 text-left transition-all',
      active
        ? 'border-accent-300 bg-accent-50/80 shadow-sm'
        : 'border-primary-200/60 bg-white/70 hover:border-primary-300 hover:shadow-sm'
    );

  return (
    <div className="space-y-6">
      <p className="text-sm text-primary-600">{t('pageDescription')}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: t('tabAll'), value: stats.all, f: 'all' as const },
          { label: td('plaintiff'), value: stats.plaintiff, f: 'plaintiff' as const },
          { label: td('defendant'), value: stats.defendant, f: 'defendant' as const },
          { label: td('arbiter'), value: stats.arbiter, f: 'arbiter' as const },
          { label: td('status.open'), value: stats.open, f: 'open' as const },
        ].map((stat) => (
          <button
            key={stat.f}
            type="button"
            onClick={() => setFilter(stat.f)}
            className={statBtn(filter === stat.f)}
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
            placeholder={tCommon('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
          <SelectTrigger className="w-full sm:w-52">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary-500" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('tabAll')}</SelectItem>
            <SelectItem value="plaintiff">{td('plaintiff')}</SelectItem>
            <SelectItem value="defendant">{td('defendant')}</SelectItem>
            <SelectItem value="arbiter">{td('arbiter')}</SelectItem>
            <SelectItem value="open">{td('status.open')}</SelectItem>
            <SelectItem value="resolved">{t('statusResolved')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredDisputes.length === 0 ? (
        <div className="surface-card p-12 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-primary-400" />
          <p className="mt-4 text-lg font-semibold text-primary-900">{t('emptyTitle')}</p>
          <p className="mt-2 text-sm text-primary-600">{t('emptyDescription')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDisputes.map((dispute) => {
            const statusConfig = getDisputeStatusConfig(dispute.status);
            const StatusIcon = statusConfig.icon;
            const role =
              dispute.plaintiff.toLowerCase() === pk
                ? 'plaintiff'
                : dispute.defendant.toLowerCase() === pk
                  ? 'defendant'
                  : dispute.arbiter.toLowerCase() === pk
                    ? 'arbiter'
                    : null;

            return (
              <Link
                key={dispute.id}
                href={`/disputes/${dispute.id}`}
                className="block rounded-2xl border border-primary-200/60 bg-white/80 p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent-200 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="font-mono text-sm text-primary-600">
                        {td('disputeId')}: {truncateAddress(dispute.id)}
                      </h3>
                      {role && (
                        <span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-semibold text-accent-800">
                          {role === 'plaintiff'
                            ? td('yourRole.plaintiff')
                            : role === 'defendant'
                              ? td('yourRole.defendant')
                              : td('yourRole.arbiter')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-primary-600">
                      {tReceipt('invoiceId')}: {truncateAddress(dispute.invoiceId)}
                    </p>
                    <p className="mt-2 text-xs text-primary-500">
                      {td('createdAt')}: {formatDate(dispute.createdAt)}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-4 py-2',
                      statusConfig.bgColor,
                      statusConfig.borderColor
                    )}
                  >
                    <StatusIcon className={cn('h-4 w-4', statusConfig.color)} />
                    <span className={cn('text-sm font-semibold', statusConfig.color)}>{statusConfig.label}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
