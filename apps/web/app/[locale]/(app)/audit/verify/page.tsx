'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import AuditVerifyFlow from '@/components/audit-verify-flow';
import { useFhenixAuditPackageVerify } from '@/controller/Audit/useFhenixAuditPackageVerify';

export default function AuditVerifyPage() {
  const t = useTranslations();
  const controller = useFhenixAuditPackageVerify();

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start gap-6">
        <div className="flex-1">
          <Link
            href="/audit"
            className="mb-4 inline-flex items-center gap-2 text-sm text-primary-500 hover:text-primary-700"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('audit.verify.backToCenter')}
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-primary-900">{t('audit.verify.title')}</h1>
              <p className="text-sm text-primary-500">{t('audit.verify.pageDescription')}</p>
            </div>
          </div>
        </div>
      </div>

      <AuditVerifyFlow
        envelopeText={controller.envelopeText}
        setEnvelopeText={controller.setEnvelopeText}
        auditKey={controller.auditKey}
        setAuditKey={controller.setAuditKey}
        previewResult={controller.previewResult}
        result={controller.result}
        loading={controller.loading}
        error={controller.error}
        onFileUpload={controller.handleFileUpload}
        onPreview={controller.handlePreview}
        onVerify={controller.handleVerify}
        onExportReport={controller.handleExportReport}
        onExportPdfReport={controller.handleExportPdfReport}
      />
    </div>
  );
}

