'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import InvoiceForm from '@/components/invoice-form';

export default function CreateInvoicePage() {
  const t = useTranslations('invoice.create');

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Link
            href="/invoices"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-primary-300 transition-all hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToInvoices')}
          </Link>
        </div>

        <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm">
          <div className="mb-8">
            <h1 className="text-4xl font-black text-white tracking-tight">
              {t('title')}
            </h1>
            <p className="mt-2 text-lg text-primary-400 font-medium">
              {t('subtitle')}
            </p>
          </div>

          {/* Invoice Form */}
          <InvoiceForm />
        </div>

        {/* Help Text */}
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-blue-400">
            {t('helpTitle')}
          </h3>
          <p className="text-sm text-primary-300 leading-relaxed">
            {t('helpText')}
          </p>
        </div>
      </div>
    </div>
  );
}
