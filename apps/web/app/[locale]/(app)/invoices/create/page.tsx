'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import InvoiceForm from '@/components/invoice-form';

export default function CreateInvoicePage() {
  const t = useTranslations('invoice.create');
  const tDetail = useTranslations('invoice.detail');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-2 rounded-xl border border-primary-200/60 bg-white/70 px-4 py-2 text-sm font-medium text-primary-700 transition-all hover:border-primary-300 hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {tDetail('backToInvoices')}
        </Link>
      </div>

      <div className="surface-card p-6 md:p-8">
        <div className="mb-8">
          <p className="text-sm text-primary-600">{t('pageDescription')}</p>
          <h2 className="mt-2 text-2xl font-semibold text-primary-900">{t('title')}</h2>
          <p className="mt-2 text-sm text-primary-600">{t('subtitle')}</p>
        </div>

        <InvoiceForm />
      </div>

      <div className="rounded-2xl border border-blue-200/80 bg-blue-50/60 p-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-900">{t('helpTitle')}</h3>
        <p className="text-sm leading-relaxed text-blue-900/90">{t('helpText')}</p>
      </div>
    </div>
  );
}
