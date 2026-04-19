'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Search, Filter, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useDisputeStore } from '@/stores/Dispute/useDisputeStore';
import { useUserStore } from '@/stores/User/useUserStore';
import { DisputeStatus } from '@/lib/types';
import { Link } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { truncateAddress, formatDate, cn } from '@/lib/utils';

type FilterType = 'all' | 'plaintiff' | 'defendant' | 'arbiter' | 'open' | 'resolved';

export default function DisputesPage() {
  const t = useTranslations('disputes');
  const publicKey = useUserStore((s) => s.publicKey);
  const disputes = useDisputeStore((s) => s.disputes);
  const pk = publicKey?.toLowerCase() ?? '';

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  // Filter disputes
  const filteredDisputes = useMemo(() => {
    let filtered = disputes;

    // Apply role/status filter
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

    // Apply search
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

  const getDisputeStatusConfig = (status: DisputeStatus) => {
    const configs = {
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
    return (
      configs[status as keyof typeof configs] ?? configs[DisputeStatus.OPEN]
    );
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: t('stats.all'), value: stats.all, filter: 'all' },
            { label: t('stats.asPlaintiff'), value: stats.plaintiff, filter: 'plaintiff' },
            { label: t('stats.asDefendant'), value: stats.defendant, filter: 'defendant' },
            { label: t('stats.asArbiter'), value: stats.arbiter, filter: 'arbiter' },
            { label: t('stats.open'), value: stats.open, filter: 'open' },
          ].map((stat) => (
            <button
              key={stat.filter}
              onClick={() => setFilter(stat.filter as FilterType)}
              className={`rounded-xl border p-4 text-left transition-all ${
                filter === stat.filter
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
          <Select value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
            <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10 text-white">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.all')}</SelectItem>
              <SelectItem value="plaintiff">{t('filters.plaintiff')}</SelectItem>
              <SelectItem value="defendant">{t('filters.defendant')}</SelectItem>
              <SelectItem value="arbiter">{t('filters.arbiter')}</SelectItem>
              <SelectItem value="open">{t('filters.open')}</SelectItem>
              <SelectItem value="resolved">{t('filters.resolved')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Disputes List */}
        {filteredDisputes.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
            <AlertTriangle className="mx-auto h-16 w-16 text-primary-600" />
            <p className="mt-4 text-xl font-bold text-primary-300">{t('noDisputes')}</p>
            <p className="mt-2 text-sm text-primary-500">{t('noDisputesDesc')}</p>
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
                  className="block rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:border-accent-500/30 hover:bg-white/[0.04]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="font-mono text-sm text-primary-400">
                          {t('disputeId')}: {truncateAddress(dispute.id)}
                        </h3>
                        {role && (
                          <span className="rounded-full bg-accent-500/10 px-2 py-1 text-xs font-bold uppercase text-accent-400">
                            {t(`role.${role}`)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-primary-500">
                        {t('invoiceId')}: {truncateAddress(dispute.invoiceId)}
                      </p>
                      <p className="mt-2 text-xs text-primary-600">
                        {t('createdAt')}: {formatDate(dispute.createdAt)}
                      </p>
                    </div>
                    <div className={cn('inline-flex items-center gap-2 rounded-full px-4 py-2', statusConfig.bgColor, statusConfig.borderColor, 'border')}>
                      <StatusIcon className={cn('h-4 w-4', statusConfig.color)} />
                      <span className={cn('text-sm font-bold uppercase', statusConfig.color)}>{statusConfig.label}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
