'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Award, TrendingUp, Calendar, Shield, CheckCircle, FileText } from 'lucide-react';
import { useUserStore } from '@/stores/User/useUserStore';
import { useInvoiceStore } from '@/stores/Invoice/InvoiceState';
import { InvoiceStatus } from '@/lib/types';
import { formatFHE } from '@/lib/utils';

export default function CreditPage() {
  const t = useTranslations('credit');
  const publicKey = useUserStore((s) => s.publicKey);
  const invoices = useInvoiceStore((s) => s.invoices);

  // Calculate credit score metrics
  const myInvoices = invoices.filter(inv => inv.seller === publicKey || inv.buyer === publicKey);
  const paidInvoices = myInvoices.filter(inv => inv.status === InvoiceStatus.PAID);
  const totalInvoicesAsSeller = invoices.filter(inv => inv.seller === publicKey);
  const paidInvoicesAsSeller = totalInvoicesAsSeller.filter(inv => inv.status === InvoiceStatus.PAID);

  const paymentRate = totalInvoicesAsSeller.length > 0
    ? Math.round((paidInvoicesAsSeller.length / totalInvoicesAsSeller.length) * 100)
    : 0;

  const totalVolumeReceived = paidInvoicesAsSeller.reduce((sum, inv) => sum + inv.amount, BigInt(0));

  // Mock credit score (0-1000)
  const creditScore = Math.min(1000, paymentRate * 5 + Math.min(500, Number(totalVolumeReceived / BigInt(1000000))));

  const metrics = [
    {
      title: t('metrics.creditScore'),
      value: creditScore.toString(),
      max: '/ 1000',
      icon: Award,
      color: creditScore >= 700 ? 'text-green-400' : creditScore >= 400 ? 'text-yellow-400' : 'text-red-400',
      bgColor: creditScore >= 700 ? 'bg-green-500/10' : creditScore >= 400 ? 'bg-yellow-500/10' : 'bg-red-500/10',
    },
    {
      title: t('metrics.paymentRate'),
      value: `${paymentRate}%`,
      max: '',
      icon: TrendingUp,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: t('metrics.totalVolume'),
      value: formatFHE(totalVolumeReceived),
      max: 'FHE',
      icon: FileText,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: t('metrics.successfulTransactions'),
      value: paidInvoices.length.toString(),
      max: '',
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
  ];

  const getCreditLevel = (score: number) => {
    if (score >= 800) return { label: t('level.excellent'), color: 'text-green-400' };
    if (score >= 650) return { label: t('level.good'), color: 'text-blue-400' };
    if (score >= 500) return { label: t('level.fair'), color: 'text-yellow-400' };
    return { label: t('level.poor'), color: 'text-red-400' };
  };

  const creditLevel = getCreditLevel(creditScore);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950 p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">{t('title')}</h1>
          <p className="mt-2 text-lg text-primary-400 font-medium">{t('subtitle')}</p>
        </div>

        {/* Credit Score Hero */}
        <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-accent-500/10 to-purple-500/10 p-12 text-center backdrop-blur-sm">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-accent-500/20 p-6">
              <Award className="h-16 w-16 text-accent-400" />
            </div>
          </div>
          <h2 className="text-6xl font-black text-white mb-2">{creditScore}</h2>
          <p className="text-xl text-primary-400 font-medium mb-4">
            {t('outOf')} 1000
          </p>
          <div className={`inline-block rounded-full px-6 py-2 text-lg font-bold ${creditLevel.color} bg-white/5 border border-white/10`}>
            {creditLevel.label}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, idx) => {
            const Icon = metric.icon;
            return (
              <div
                key={idx}
                className={`rounded-2xl border border-white/5 p-6 ${metric.bgColor} backdrop-blur-sm transition-all hover:scale-105`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <Icon className={`h-8 w-8 ${metric.color}`} />
                </div>
                <div className="text-sm font-medium text-primary-400">{metric.title}</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">{metric.value}</span>
                  {metric.max && <span className="text-lg font-medium text-primary-400">{metric.max}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Credit Features */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* FHE Privacy Protection */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm">
            <div className="mb-6 flex items-center gap-4">
              <div className="rounded-xl bg-accent-500/20 p-3">
                <Shield className="h-8 w-8 text-accent-400" />
              </div>
              <h3 className="text-2xl font-black text-white">{t('privacy.title')}</h3>
            </div>
            <p className="text-base text-primary-300 leading-relaxed">
              {t('privacy.description')}
            </p>
            <div className="mt-6 space-y-3">
              {[
                t('privacy.feature1'),
                t('privacy.feature2'),
                t('privacy.feature3'),
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-primary-400">{feature}</p>
                </div>
              ))}
            </div>
          </div>

          {/* How to Improve */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm">
            <div className="mb-6 flex items-center gap-4">
              <div className="rounded-xl bg-green-500/20 p-3">
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-2xl font-black text-white">{t('improve.title')}</h3>
            </div>
            <p className="text-base text-primary-300 leading-relaxed mb-6">
              {t('improve.description')}
            </p>
            <ul className="space-y-3">
              {[
                t('improve.tip1'),
                t('improve.tip2'),
                t('improve.tip3'),
                t('improve.tip4'),
              ].map((tip, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-500/20 text-xs font-bold text-accent-400 flex-shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-sm text-primary-400">{tip}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Info Banner */}
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-blue-400">
            {t('info.title')}
          </h3>
          <p className="text-sm text-primary-300 leading-relaxed">
            {t('info.description')}
          </p>
        </div>
      </div>
    </div>
  );
}
