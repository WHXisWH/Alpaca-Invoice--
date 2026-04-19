'use client';

import { useCallback, useMemo, useState } from 'react';
import { getFhenixProtocolService } from '@/services/FhenixProtocolService';
import { getContractAddresses } from '@/lib/contracts';
import { getCurrentChainId } from '@/lib/wagmi';
import type { Address, Bytes32 } from '@/lib/types';

type VerifyCheck = { key: string; ok: boolean; detail?: string };

export type VerifyPhaseResult = {
  ok: boolean;
  message: string;
  checks?: VerifyCheck[];
};

export type FhenixAuditPreviewResult =
  | { valid: true; parsed: unknown; invoiceSummary?: Record<string, unknown> }
  | { valid: false; reason: string };

export type FhenixAuditVerifyResult = {
  overallValid: boolean;
  phase1: VerifyPhaseResult;
  phase2: VerifyPhaseResult;
  phase3: VerifyPhaseResult;
  parsedPackage?: any;
};

function safeJsonParse(text: string): { ok: true; value: any } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: 'Invalid JSON' };
  }
}

function asBytes32(v: unknown): Bytes32 | null {
  if (typeof v !== 'string') return null;
  if (!/^0x[0-9a-fA-F]{64}$/.test(v)) return null;
  return v as Bytes32;
}

function asAddress(v: unknown): Address | null {
  if (typeof v !== 'string') return null;
  if (!/^0x[0-9a-fA-F]{40}$/.test(v)) return null;
  return v as Address;
}

export function useFhenixAuditPackageVerify() {
  const [envelopeText, setEnvelopeText] = useState('');
  const [auditKey, setAuditKey] = useState('');
  const [previewResult, setPreviewResult] = useState<FhenixAuditPreviewResult | null>(null);
  const [result, setResult] = useState<FhenixAuditVerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const protocol = useMemo(() => getFhenixProtocolService(), []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      setEnvelopeText(text);
      setPreviewResult(null);
      setResult(null);
      setError(null);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const handlePreview = useCallback(async () => {
    setError(null);
    setPreviewResult(null);
    setResult(null);
    const parsed = safeJsonParse(envelopeText);
    if (!parsed.ok) {
      setPreviewResult({ valid: false, reason: parsed.error });
      return;
    }

    const invoice = parsed.value?.invoice;
    const invoiceSummary =
      invoice && typeof invoice === 'object'
        ? ({
            id: invoice.id,
            invoiceHash: invoice.invoiceHash,
            seller: invoice.seller,
            buyer: invoice.buyer,
            status: invoice.status,
            dueDate: invoice.dueDate,
            createdAt: invoice.createdAt,
            updatedAt: invoice.updatedAt,
            hasEscrow: invoice.hasEscrow,
            hasDispute: invoice.hasDispute,
          } satisfies Record<string, unknown>)
        : null;

    setPreviewResult({
      valid: true,
      parsed: parsed.value,
      ...(invoiceSummary ? { invoiceSummary } : {}),
    });
  }, [envelopeText]);

  const handleVerify = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setPreviewResult(null);
      setResult(null);
      setLoading(true);
      try {
        const parsed = safeJsonParse(envelopeText);
        if (!parsed.ok) {
          setError(parsed.error);
          return;
        }

        const pkg = parsed.value;
        const checks1: VerifyCheck[] = [];

        const versionOk = pkg?.version === 'fhenix-audit-1.0';
        checks1.push({ key: 'Version', ok: versionOk, detail: String(pkg?.version ?? '') });

        const chainId = Number(pkg?.chainId);
        const currentChainId = getCurrentChainId();
        const chainOk = Number.isFinite(chainId) && chainId === currentChainId;
        checks1.push({ key: 'Chain ID', ok: chainOk, detail: `${chainId} (current: ${currentChainId})` });

        const invoiceRegistry = asAddress(pkg?.invoiceRegistry);
        const escrow = asAddress(pkg?.escrow);
        const dispute = asAddress(pkg?.dispute);
        const addrs = getContractAddresses();
        checks1.push({
          key: 'invoiceRegistry',
          ok: !!invoiceRegistry && invoiceRegistry.toLowerCase() === addrs.invoiceRegistry.toLowerCase(),
          detail: String(invoiceRegistry ?? ''),
        });
        checks1.push({
          key: 'escrow',
          ok: !!escrow && escrow.toLowerCase() === addrs.escrow.toLowerCase(),
          detail: String(escrow ?? ''),
        });
        checks1.push({
          key: 'dispute',
          ok: !!dispute && dispute.toLowerCase() === addrs.dispute.toLowerCase(),
          detail: String(dispute ?? ''),
        });

        const invoiceId = asBytes32(pkg?.invoice?.id);
        const invoiceHash = asBytes32(pkg?.invoice?.invoiceHash);
        const seller = asAddress(pkg?.invoice?.seller);
        const buyer = asAddress(pkg?.invoice?.buyer);
        checks1.push({ key: 'Invoice ID', ok: !!invoiceId, detail: String(pkg?.invoice?.id ?? '') });
        checks1.push({ key: 'Invoice Hash', ok: !!invoiceHash, detail: String(pkg?.invoice?.invoiceHash ?? '') });
        checks1.push({ key: 'Seller', ok: !!seller, detail: String(pkg?.invoice?.seller ?? '') });
        checks1.push({ key: 'Buyer', ok: !!buyer, detail: String(pkg?.invoice?.buyer ?? '') });

        const phase1Ok = checks1.every((c) => c.ok);
        const phase1: VerifyPhaseResult = {
          ok: phase1Ok,
          message: phase1Ok ? 'Package format looks valid' : 'Package format mismatch',
          checks: checks1,
        };

        // Phase 2: on-chain invoice header comparison
        let phase2: VerifyPhaseResult = { ok: false, message: 'Skipped', checks: [] };
        if (invoiceId) {
          const onChain = await protocol.getInvoice(invoiceId);
          const checks2: VerifyCheck[] = [];
          checks2.push({ key: 'Invoice exists', ok: !!onChain });
          if (onChain && invoiceHash && seller && buyer) {
            checks2.push({
              key: 'invoiceHash',
              ok: onChain.invoiceHash.toLowerCase() === invoiceHash.toLowerCase(),
              detail: `${onChain.invoiceHash} (chain)`,
            });
            checks2.push({
              key: 'seller',
              ok: onChain.seller.toLowerCase() === seller.toLowerCase(),
              detail: `${onChain.seller} (chain)`,
            });
            checks2.push({
              key: 'buyer',
              ok: onChain.buyer.toLowerCase() === buyer.toLowerCase(),
              detail: `${onChain.buyer} (chain)`,
            });
            const status = Number(pkg?.invoice?.status);
            checks2.push({
              key: 'status',
              ok: Number.isFinite(status) && onChain.status === status,
              detail: `${onChain.status} (chain)`,
            });
            const hasEscrow = !!pkg?.invoice?.hasEscrow;
            const hasDispute = !!pkg?.invoice?.hasDispute;
            checks2.push({
              key: 'hasEscrow',
              ok: onChain.hasEscrow === hasEscrow,
              detail: `${String(onChain.hasEscrow)} (chain)`,
            });
            checks2.push({
              key: 'hasDispute',
              ok: onChain.hasDispute === hasDispute,
              detail: `${String(onChain.hasDispute)} (chain)`,
            });
          }
          const ok = checks2.every((c) => c.ok);
          phase2 = { ok, message: ok ? 'On-chain header matches' : 'On-chain header mismatch', checks: checks2 };
        }

        // Phase 3: escrow/dispute anchors (best-effort)
        const checks3: VerifyCheck[] = [];
        let phase3Ok = true;
        if (invoiceId && pkg?.invoice?.hasEscrow) {
          const escrowId = await protocol.getEscrowByInvoice(invoiceId);
          const ok = !!escrowId;
          phase3Ok = phase3Ok && ok;
          checks3.push({ key: 'Escrow linked', ok, detail: String(escrowId ?? '') });
        } else {
          checks3.push({ key: 'Escrow linked', ok: true, detail: 'Not required' });
        }
        // Dispute contract doesn't provide direct lookup here; verify via invoice.hasDispute only.
        checks3.push({ key: 'Dispute flag', ok: true, detail: 'Verified in Phase 2' });

        const phase3: VerifyPhaseResult = {
          ok: phase3Ok,
          message: phase3Ok ? 'Anchors look consistent' : 'Anchor mismatch',
          checks: checks3,
        };

        const overallValid = phase1.ok && phase2.ok && phase3.ok;
        setResult({ overallValid, phase1, phase2, phase3, parsedPackage: pkg });
      } catch (err: any) {
        setError(err?.message ?? 'Verification failed');
      } finally {
        setLoading(false);
      }
    },
    [envelopeText, protocol]
  );

  const handleExportReport = useCallback(() => {
    if (!result) return;
    const report = {
      verifiedAt: new Date().toISOString(),
      overallValid: result.overallValid,
      phases: {
        phase1: result.phase1,
        phase2: result.phase2,
        phase3: result.phase3,
      },
      package: result.parsedPackage,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-verification-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const handleExportPdfReport = useCallback(() => {
    if (!result || !result.overallValid) return;
    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Compliance Report</title>
<style>
body{font-family:system-ui,sans-serif;max-width:720px;margin:2rem auto;padding:1rem;}
h1{font-size:1.25rem;} .ok{color:#059669;} .fail{color:#dc2626;}
table{width:100%;border-collapse:collapse;} td,th{border:1px solid #e5e7eb;padding:0.5rem;text-align:left;}
</style></head><body>
<h1>Audit Compliance Report</h1>
<p>Generated: ${new Date().toISOString()}</p>
<p><strong>Result:</strong> <span class="${result.overallValid ? 'ok' : 'fail'}">${result.overallValid ? 'Valid' : 'Invalid'}</span></p>
<h2>Verification steps</h2>
<table>
<tr><th>Step</th><th>Status</th><th>Message</th></tr>
<tr><td>${result.phase1.message}</td><td class="${result.phase1.ok ? 'ok' : 'fail'}">${result.phase1.ok ? 'Pass' : 'Fail'}</td><td>${result.phase1.message}</td></tr>
<tr><td>${result.phase2.message}</td><td class="${result.phase2.ok ? 'ok' : 'fail'}">${result.phase2.ok ? 'Pass' : 'Fail'}</td><td>${result.phase2.message}</td></tr>
<tr><td>${result.phase3.message}</td><td class="${result.phase3.ok ? 'ok' : 'fail'}">${result.phase3.ok ? 'Pass' : 'Fail'}</td><td>${result.phase3.message}</td></tr>
</table>
<p><small>Use your browser's Print dialog to save as PDF.</small></p>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 300);
    }
  }, [result]);

  return {
    envelopeText,
    setEnvelopeText,
    auditKey,
    setAuditKey,
    previewResult,
    result,
    loading,
    error,
    handleFileUpload,
    handlePreview,
    handleVerify,
    handleExportReport,
    handleExportPdfReport,
  };
}

