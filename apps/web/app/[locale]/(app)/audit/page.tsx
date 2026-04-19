'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useChainId } from 'wagmi';
import {
  ShieldCheck,
  Download,
  FileText,
  Lock,
  Eye,
  Key,
  CheckCircle,
  AlertCircle,
  Package,
} from 'lucide-react';
import { useUserStore } from '@/stores/User/useUserStore';
import { useInvoiceStore } from '@/stores/Invoice/InvoiceState';
import { InvoiceStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { truncateAddress, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { buildFhenixAuditPackage, downloadJsonFile } from '@/lib/fhenix-audit-package';
import { areContractsConfigured } from '@/lib/contracts';
import type { Address } from '@/lib/types';

export default function AuditPage() {
  const t = useTranslations('audit');
  const publicKey = useUserStore((s) => s.publicKey);
  const invoices = useInvoiceStore((s) => s.invoices);
  const chainId = useChainId();

  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const pk = publicKey?.toLowerCase() ?? '';

  // Filter invoices that can be audited (PAID status)
  const auditableInvoices = invoices.filter(
    (inv) =>
      inv.status === InvoiceStatus.PAID &&
      (inv.seller.toLowerCase() === pk || inv.buyer.toLowerCase() === pk)
  );

  const handleGenerateAuditPackage = async (invoiceId: string) => {
    if (!publicKey) {
      toast.error(t('generateFailed'));
      return;
    }
    const invoice = invoices.find((i) => i.id === invoiceId);
    if (!invoice) {
      toast.error(t('generateFailed'));
      return;
    }
    if (!areContractsConfigured()) {
      toast.error(t('generateFailed'));
      return;
    }
    setIsGenerating(true);
    setSelectedInvoiceId(invoiceId);
    try {
      const pkg = buildFhenixAuditPackage(invoice, publicKey as Address, chainId);
      downloadJsonFile(
        `audit-package-${invoiceId.slice(2, 12)}-${new Date().toISOString().slice(0, 10)}.json`,
        pkg
      );
      toast.success(t('generateSuccess'));
    } catch {
      toast.error(t('generateFailed'));
    } finally {
      setIsGenerating(false);
      setSelectedInvoiceId(null);
    }
  };

  const features = [
    {
      icon: Lock,
      title: t('features.privacy.title'),
      description: t('features.privacy.description'),
      color: 'text-accent-400',
      bgColor: 'bg-accent-500/10',
    },
    {
      icon: Eye,
      title: t('features.selective.title'),
      description: t('features.selective.description'),
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: ShieldCheck,
      title: t('features.verifiable.title'),
      description: t('features.verifiable.description'),
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: Key,
      title: t('features.compliance.title'),
      description: t('features.compliance.description'),
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950 p-6">
      <div className="mx-auto max-w-7xl space-y-8" data-tour="audit-center">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">{t('title')}</h1>
          <p className="mt-2 text-lg text-primary-400 font-medium">{t('subtitle')}</p>
        </div>

        {/* Hero Section */}
        <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-green-500/10 to-blue-500/10 p-8 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex-shrink-0">
              <div className="rounded-full bg-green-500/20 p-6">
                <ShieldCheck className="h-16 w-16 text-green-400" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-black text-white mb-4">{t('hero.title')}</h2>
              <p className="text-lg text-primary-300 leading-relaxed mb-6">
                {t('hero.description')}
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  t('hero.badge1'),
                  t('hero.badge2'),
                  t('hero.badge3'),
                ].map((badge, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2"
                  >
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-bold text-green-400">{badge}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className={`rounded-2xl border border-white/5 p-6 ${feature.bgColor} backdrop-blur-sm`}
              >
                <div className="mb-4">
                  <Icon className={`h-8 w-8 ${feature.color}`} />
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">{feature.title}</h3>
                <p className="text-sm text-primary-400 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Auditable Invoices */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-black text-white">{t('auditableInvoices')}</h2>
            <span className="rounded-full bg-white/5 px-4 py-2 text-sm font-bold text-primary-400">
              {auditableInvoices.length} {t('available')}
            </span>
          </div>

          {auditableInvoices.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
              <Package className="mx-auto h-16 w-16 text-primary-600" />
              <p className="mt-4 text-xl font-bold text-primary-300">{t('noAuditableInvoices')}</p>
              <p className="mt-2 text-sm text-primary-500">{t('noAuditableInvoicesDesc')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditableInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm transition-all hover:bg-white/[0.04]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary-400" />
                        <span className="font-mono text-sm text-primary-400">
                          {truncateAddress(invoice.id)}
                        </span>
                        <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs font-bold uppercase text-green-400">
                          {t('paid')}
                        </span>
                      </div>
                      <p className="text-sm text-primary-500">
                        {t('paidOn')}: {formatDate(invoice.createdAt)}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleGenerateAuditPackage(invoice.id)}
                      disabled={isGenerating && selectedInvoiceId === invoice.id}
                      className="rounded-full bg-accent-500 px-6 py-3 text-sm font-bold text-white hover:bg-accent-400"
                    >
                      {isGenerating && selectedInvoiceId === invoice.id ? (
                        t('generating')
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          {t('generatePackage')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* What's Included */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm">
            <h3 className="mb-6 flex items-center gap-2 text-xl font-black text-white">
              <Package className="h-6 w-6 text-accent-400" />
              {t('whatsIncluded.title')}
            </h3>
            <ul className="space-y-4">
              {[
                t('whatsIncluded.item1'),
                t('whatsIncluded.item2'),
                t('whatsIncluded.item3'),
                t('whatsIncluded.item4'),
                t('whatsIncluded.item5'),
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-primary-300">{item}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* How It Works */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm">
            <h3 className="mb-6 flex items-center gap-2 text-xl font-black text-white">
              <AlertCircle className="h-6 w-6 text-blue-400" />
              {t('howItWorks.title')}
            </h3>
            <ol className="space-y-4">
              {[
                t('howItWorks.step1'),
                t('howItWorks.step2'),
                t('howItWorks.step3'),
                t('howItWorks.step4'),
              ].map((step, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400 flex-shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-sm text-primary-300">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
