'use client';

import { useTranslations } from 'next-intl';
import { useUserStore } from '@/stores/User/useUserStore';
import { useInvoiceStore } from '@/stores/Invoice/InvoiceState';
import { InvoiceStatus } from '@/lib/types';
import type { CreditGrade, CreditGradeLetter, CreditMetrics, CreditDimensionScores } from '@/lib/types';

import ZkValueBanner from '@/components/credit/zk-value-banner';
import CreditScoreRing from '@/components/credit/credit-score-ring';
import CreditRadarChart from '@/components/credit/credit-radar-chart';
import CreditDimensionCards from '@/components/credit/credit-dimension-cards';

function computeDimensionScores(m: CreditMetrics): CreditDimensionScores {
  const onTimeRate = Math.min(100, m.onTimeRate);

  let volume: number;
  if (m.totalInvoices === 0) volume = 0;
  else if (m.totalInvoices <= 5) volume = 40;
  else if (m.totalInvoices <= 20) volume = 70;
  else volume = 100;

  const paidCredits = Number(m.totalPaidAmount) / 1_000_000;
  let amount: number;
  if (paidCredits === 0) amount = 0;
  else if (paidCredits < 10) amount = 30;
  else if (paidCredits < 100) amount = 60;
  else if (paidCredits < 1000) amount = 85;
  else amount = 100;

  let accountAge: number;
  if (m.firstInvoiceDate === 0) {
    accountAge = 0;
  } else {
    const ageDays = (Date.now() / 1000 - m.firstInvoiceDate) / 86400;
    if (ageDays < 7) accountAge = 20;
    else if (ageDays < 30) accountAge = 50;
    else if (ageDays < 90) accountAge = 75;
    else accountAge = 100;
  }

  const disputeRate = m.totalInvoices > 0 ? (m.disputeCount / m.totalInvoices) * 100 : 0;
  const disputeResistance = Math.max(0, Math.min(100, 100 - disputeRate * 5));

  return { onTimeRate, volume, amount, accountAge, disputeResistance };
}

function computeGrade(metrics: CreditMetrics): CreditGrade {
  const dims = computeDimensionScores(metrics);
  const score = Math.round(
    dims.onTimeRate * 0.35 +
      dims.volume * 0.15 +
      dims.amount * 0.15 +
      dims.accountAge * 0.15 +
      dims.disputeResistance * 0.2
  );

  let letter: CreditGradeLetter;
  if (score >= 90) letter = 'A+';
  else if (score >= 75) letter = 'A';
  else if (score >= 60) letter = 'B';
  else if (score >= 40) letter = 'C';
  else letter = 'D';

  return { letter, score, dimensions: dims };
}

export default function CreditPage() {
  const t = useTranslations('credit');
  const publicKey = useUserStore((s) => s.publicKey);
  const invoices = useInvoiceStore((s) => s.invoices);

  const myInvoices = invoices.filter((inv) => inv.seller === publicKey || inv.buyer === publicKey);
  const relevantInvoices = myInvoices.filter(
    (inv) =>
      inv.status === InvoiceStatus.PAID ||
      inv.status === InvoiceStatus.CANCELLED ||
      inv.status === InvoiceStatus.PENDING
  );

  const paidInvoices = myInvoices.filter((inv) => inv.status === InvoiceStatus.PAID);
  const totalPaidAmount = paidInvoices.reduce((sum, inv) => sum + inv.amount, BigInt(0));

  let paidOnTime = 0;
  let firstInvoiceDate = Infinity;
  let disputeCount = 0;

  for (const inv of myInvoices) {
    const createdTs = inv.createdAt.getTime() / 1000;
    if (createdTs < firstInvoiceDate) firstInvoiceDate = createdTs;

    if (
      inv.status === InvoiceStatus.DISPUTED ||
      inv.status === InvoiceStatus.RESOLVED_CANCELLED ||
      inv.status === InvoiceStatus.RESOLVED_PAID
    ) {
      disputeCount++;
    }

    // Best-effort: if we don't have a paidAt timestamp, treat createdAt as paidAt.
    if (inv.status === InvoiceStatus.PAID && inv.createdAt <= inv.dueDate) {
      paidOnTime++;
    }
  }

  const metrics: CreditMetrics = {
    totalInvoices: relevantInvoices.length,
    paidOnTime,
    onTimeRate: relevantInvoices.length > 0 ? (paidOnTime / relevantInvoices.length) * 100 : 0,
    totalPaidAmount,
    firstInvoiceDate: firstInvoiceDate === Infinity ? 0 : Math.floor(firstInvoiceDate),
    disputeCount,
  };

  const grade = computeGrade(metrics);

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        <ZkValueBanner />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="surface-card flex flex-col items-center justify-center p-6">
            <h3 className="mb-4 text-sm font-semibold text-primary-600 uppercase tracking-wide">
              {t('overallGrade')}
            </h3>
            <CreditScoreRing score={grade.score} grade={grade.letter} size={200} />
            <p className="mt-4 max-w-[280px] text-center text-sm text-primary-500">
              {t('gradeExplain')}
            </p>
          </div>

          <div className="surface-card flex flex-col items-center justify-center p-6">
            <h3 className="mb-4 text-sm font-semibold text-primary-600 uppercase tracking-wide">
              {t('creditProfile')}
            </h3>
            <CreditRadarChart dimensions={grade.dimensions} size={260} />
          </div>
        </div>

        <CreditDimensionCards metrics={metrics} dimensions={grade.dimensions} />
      </div>
    </div>
  );
}
