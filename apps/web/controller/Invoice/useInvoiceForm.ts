'use client';

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import type { Address, InvoiceDetails, LineItem, LineItemV3, Wei } from '@/lib/types';
import { InvoiceStatus } from '@/lib/types';
import { useWallet } from '@/services/useWallet';
import { useUserStore } from '@/stores/User/useUserStore';
import { persistInvoiceToStore } from '@/stores/Invoice/InvoiceState';
import { useInvoice } from '@/hooks/useInvoice';
import { useInvoiceFormAudit } from '@/controller/Invoice/useInvoiceFormAudit';
import type { JctPdfPreviewSummary } from '@/components/jct-pdf-preview';

export type JctTaxRate = '10' | '8' | '0';

export interface LineItemRow {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  jctTaxRate: JctTaxRate;
}

export interface JctPreviewData {
  lineItemsV3: LineItemV3[];
  summary: JctPdfPreviewSummary;
}

const EVM_ADDR_REGEX = /^0x[a-fA-F0-9]{40}$/;

function tomorrowDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0] ?? '';
}

function buildDetails(opts: {
  invoiceNumber: string;
  lineItems: LineItem[];
  lineItemsJctTax: JctTaxRate[];
  currency: string;
  orderId: string;
  notes: string;
  arbiter?: string;
}): InvoiceDetails {
  const subtotal = opts.lineItems.reduce((s, i) => s + i.amount, 0);
  const taxAmount = opts.lineItems.reduce((sum, item, i) => {
    const r = opts.lineItemsJctTax[i] ?? '10';
    const rate = r === '10' ? 0.1 : r === '8' ? 0.08 : 0;
    return sum + Math.round(item.amount * rate * 100) / 100;
  }, 0);
  const base: InvoiceDetails = {
    invoiceNumber: opts.invoiceNumber,
    lineItems: opts.lineItems.map(({ description, quantity, unitPrice, amount }) => ({
      description: description || 'Item',
      quantity,
      unitPrice,
      amount,
    })),
    subtotal,
    taxRate: 0,
    taxAmount,
    total: Math.round((subtotal + taxAmount) * 100) / 100,
    currency: opts.currency || 'CREDITS',
  };
  return {
    ...base,
    ...(opts.orderId ? { orderId: opts.orderId } : {}),
    ...(opts.notes ? { notes: opts.notes } : {}),
    ...(opts.arbiter ? { arbiter: opts.arbiter } : {}),
  };
}

export interface UseInvoiceFormReturn {
  tNumber: string;
  setTNumber: (v: string) => void;
  ntaCheck: 'idle' | 'checking' | 'ok' | 'unavailable';
  buyer: string;
  setBuyer: (v: string) => void;
  arbiter: string;
  setArbiter: (v: string) => void;
  lineItems: LineItemRow[];
  dueDate: string;
  setDueDate: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  orderId: string;
  setOrderId: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  parsedLineItems: LineItem[];
  parsedAmount: number;
  taxAmount: number;
  total: number;
  jctPreviewData: JctPreviewData;
  addLineItem: () => void;
  removeLineItem: (id: string) => void;
  updateLineItem: (id: string, field: keyof LineItemRow, value: string) => void;
  verifyTNumberWithNta: () => Promise<void>;
  audit: ReturnType<typeof useInvoiceFormAudit>;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isProcessing: boolean;
  currentProgress: number;
  currentLog: string;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  publicKey: string | null;
}

export function useInvoiceForm(): UseInvoiceFormReturn {
  const router = useRouter();
  const { createInvoice } = useInvoice();
  const { address, isConnected, isCorrectChain } = useWallet();
  const { publicKey } = useUserStore();
  const audit = useInvoiceFormAudit();

  const sellerAddress = (address ?? publicKey) as Address | null;

  const [tNumber, setTNumberRaw] = useState('');
  const [ntaCheck, setNtaCheck] = useState<'idle' | 'checking' | 'ok' | 'unavailable'>('idle');
  const [buyer, setBuyer] = useState('');
  const [arbiter, setArbiter] = useState('');
  const [lineItems, setLineItems] = useState<LineItemRow[]>(() => [
    { id: crypto.randomUUID(), description: 'Service fee', quantity: '1', unitPrice: '1', jctTaxRate: '10' },
  ]);
  const [dueDate, setDueDate] = useState(tomorrowDateStr);
  const [currency, setCurrency] = useState('CREDITS');
  const [orderId, setOrderId] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setTNumber = useCallback((v: string) => {
    setTNumberRaw(v.replace(/\D/g, '').slice(0, 13));
  }, []);

  const parsedLineItems = useMemo(
    () =>
      lineItems.map((row) => {
        const qty = parseFloat(row.quantity) || 0;
        const price = parseFloat(row.unitPrice) || 0;
        return {
          description: row.description || 'Item',
          quantity: qty,
          unitPrice: price,
          amount: Math.round(qty * price * 100) / 100,
        };
      }),
    [lineItems],
  );

  const parsedAmount = useMemo(() => parsedLineItems.reduce((sum, item) => sum + item.amount, 0), [parsedLineItems]);

  const taxAmount = useMemo(() => {
    return parsedLineItems.reduce((sum, item, i) => {
      const r = lineItems[i]?.jctTaxRate ?? '10';
      const rate = r === '10' ? 0.1 : r === '8' ? 0.08 : 0;
      return sum + Math.round(item.amount * rate * 100) / 100;
    }, 0);
  }, [parsedLineItems, lineItems]);

  const total = Math.round((parsedAmount + taxAmount) * 100) / 100;

  const jctPreviewData = useMemo<JctPreviewData>(() => {
    const items: LineItemV3[] = [];
    let net10 = 0,
      tax10 = 0,
      net8 = 0,
      tax8 = 0;
    lineItems.forEach((row) => {
      const qty = parseFloat(row.quantity) || 0;
      const unitPrice = parseFloat(row.unitPrice) || 0;
      const rate = row.jctTaxRate === '10' ? 10 : row.jctTaxRate === '8' ? 8 : 0;
      const inclTax = qty * unitPrice;
      const net = rate === 0 ? inclTax : Math.round((inclTax / (1 + rate / 100)) * 100) / 100;
      const tax = Math.round(net * (rate / 100) * 100) / 100;
      items.push({
        description: row.description || 'Item',
        quantity: qty,
        unitPrice,
        taxRate: rate as 0 | 8 | 10,
        taxAmount: tax,
        amount: net,
      });
      if (rate === 10) {
        net10 += net;
        tax10 += tax;
      } else if (rate === 8) {
        net8 += net;
        tax8 += tax;
      }
    });
    return {
      lineItemsV3: items,
      summary: {
        net10,
        tax10,
        net8,
        tax8,
        total: Math.round((net10 + tax10 + net8 + tax8) * 100) / 100,
      },
    };
  }, [lineItems]);

  const addLineItem = useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: 'Service fee', quantity: '1', unitPrice: '1', jctTaxRate: '10' },
    ]);
  }, []);

  const removeLineItem = useCallback((id: string) => {
    setLineItems((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  const updateLineItem = useCallback((id: string, field: keyof LineItemRow, value: string) => {
    setLineItems((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }, []);

  const verifyTNumberWithNta = useCallback(async () => {
    const digits = tNumber.replace(/\D/g, '');
    if (digits.length !== 13) return;
    const apiUrl = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_NTA_TNUMBER_API_URL;
    if (!apiUrl) {
      setNtaCheck('unavailable');
      return;
    }
    setNtaCheck('checking');
    try {
      const res = await fetch(apiUrl.replace(/\{t\}/g, digits));
      setNtaCheck(res.ok ? 'ok' : 'unavailable');
    } catch {
      setNtaCheck('unavailable');
    }
  }, [tNumber]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const buyerAddr = buyer.trim();

    if (!buyerAddr) {
      errs.buyer = 'Buyer address is required.';
    } else if (!EVM_ADDR_REGEX.test(buyerAddr)) {
      errs.buyer = 'Invalid EVM address (must be 0x + 40 hex).';
    } else if (sellerAddress && buyerAddr.toLowerCase() === sellerAddress.toLowerCase()) {
      errs.buyer = 'Buyer cannot be the same as seller.';
    }

    const arbiterAddr = arbiter.trim();
    if (arbiterAddr && !EVM_ADDR_REGEX.test(arbiterAddr)) {
      errs.arbiter = 'Invalid EVM address (must be 0x + 40 hex).';
    } else if (arbiterAddr && sellerAddress && arbiterAddr.toLowerCase() === sellerAddress.toLowerCase()) {
      errs.arbiter = 'Arbiter cannot be the seller.';
    } else if (arbiterAddr && arbiterAddr.toLowerCase() === buyerAddr.toLowerCase()) {
      errs.arbiter = 'Arbiter cannot be the buyer.';
    }

    if (parsedAmount <= 0) {
      errs.amount = 'Add at least one line item with a positive amount.';
    }

    if (parsedLineItems.some((item) => !item.description.trim() || item.amount <= 0)) {
      errs.lineItems = 'Each line item needs a description and a positive amount (quantity × unit price).';
    }

    const t = tNumber.replace(/\D/g, '');
    if (t.length !== 13) {
      errs.tNumber = 'T number must be exactly 13 digits.';
    }

    const dueDateSec = Math.floor(new Date(dueDate).getTime() / 1000) + 86399;
    if (dueDateSec < Math.floor(Date.now() / 1000)) {
      errs.dueDate = 'Due date must be today or in the future.';
    }

    if (!currency.trim()) {
      errs.currency = 'Currency is required.';
    }

    if (audit.enableAuditAuth && !audit.isAuditKeyValid()) {
      errs.auditKey = 'Click the icon to generate an audit key before creating.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      if (!isConnected || !sellerAddress) {
        toast.error('Connect your wallet before creating an invoice.');
        return;
      }
      if (!isCorrectChain) {
        toast.error('Please switch to the correct network.');
        return;
      }

      setIsSubmitting(true);

      const buyerAddress = buyer.trim() as Address;
      if (buyerAddress !== buyer) setBuyer(buyerAddress);
      const arbiterAddress = arbiter.trim() || undefined;

      const invoiceNumber = `INV-${Date.now()}`;
      const jctRates = lineItems.map((r) => r.jctTaxRate);
      const details = buildDetails({
        invoiceNumber,
        lineItems: parsedLineItems,
        lineItemsJctTax: jctRates,
        currency: currency.trim(),
        orderId: orderId.trim(),
        notes: notes.trim(),
        arbiter: arbiterAddress,
      });

      const amountWei = BigInt(Math.floor(total * 1_000_000)) as Wei;
      const dueDateObj = new Date(dueDate);
      dueDateObj.setHours(23, 59, 59, 0);

      const hasArbiter = Boolean(arbiterAddress);

      try {
        const result = await createInvoice({
          buyer: buyerAddress,
          amount: amountWei,
          dueDate: dueDateObj,
          details,
          hasEscrow: hasArbiter,
          hasDispute: hasArbiter,
        });

        if (!result.success) {
          toast.error(result.error.message);
          setIsSubmitting(false);
          return;
        }

        const { invoiceId, invoiceHash, transactionHash } = result.data;
        const now = new Date();

        persistInvoiceToStore({
          id: invoiceId,
          seller: sellerAddress,
          buyer: buyerAddress,
          amount: amountWei,
          invoiceHash,
          dueDate: dueDateObj,
          createdAt: now,
          updatedAt: now,
          status: InvoiceStatus.PENDING,
          hasEscrow: hasArbiter,
          hasDispute: hasArbiter,
          details,
          transactionHash,
          metadata: {
            confirmationStatus: 'CONFIRMED',
            lastUpdated: now,
            dataSource: 'local',
            action: 'create',
          },
        });

        if (audit.enableAuditAuth) {
          toast.message('Audit authorization', {
            description: 'On-chain audit authorization is not wired for this build; invoice was created.',
          });
        }

        router.push(`/invoices/${invoiceId}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create invoice');
        setIsSubmitting(false);
      }
    },
    [
      buyer,
      arbiter,
      lineItems,
      parsedLineItems,
      parsedAmount,
      total,
      dueDate,
      currency,
      orderId,
      notes,
      tNumber,
      audit,
      sellerAddress,
      isConnected,
      isCorrectChain,
      createInvoice,
      router,
    ],
  );

  return {
    publicKey: sellerAddress ?? null,
    tNumber,
    setTNumber,
    ntaCheck,
    buyer,
    setBuyer,
    arbiter,
    setArbiter,
    lineItems,
    dueDate,
    setDueDate,
    currency,
    setCurrency,
    orderId,
    setOrderId,
    notes,
    setNotes,
    parsedLineItems,
    parsedAmount,
    taxAmount,
    total,
    jctPreviewData,
    addLineItem,
    removeLineItem,
    updateLineItem,
    verifyTNumberWithNta,
    audit,
    errors,
    isSubmitting,
    isProcessing: isSubmitting,
    currentProgress: 0,
    currentLog: '',
    handleSubmit,
  };
}
