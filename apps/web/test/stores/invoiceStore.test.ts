import { describe, it, expect, beforeEach } from 'vitest';
import { useInvoiceStore } from '../../stores/invoiceStore';
import { InvoiceStatus, type EVMInvoice, type Bytes32 } from '../../lib/types';

describe('invoiceStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useInvoiceStore.setState({
      invoices: {},
      invoiceIds: [],
      selectedInvoiceId: null,
      draft: {
        buyer: '',
        amount: '',
        dueDate: null,
        details: {
          invoiceNumber: '',
          lineItems: [],
          subtotal: 0,
          taxRate: 0,
          taxAmount: 0,
          total: 0,
          currency: 'ETH',
        },
        hasEscrow: false,
        hasDispute: false,
      },
      pendingTransactions: [],
      statusFilter: 'all',
      roleFilter: 'all',
      isLoading: false,
      isCreating: false,
      error: null,
    });
  });

  const createMockInvoice = (id: Bytes32, status: InvoiceStatus = InvoiceStatus.PENDING): EVMInvoice => ({
    id,
    seller: '0x1234567890123456789012345678901234567890' as const,
    buyer: '0x0987654321098765432109876543210987654321' as const,
    amount: BigInt('1000000000000000000'),
    invoiceHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Bytes32,
    dueDate: new Date('2024-12-31'),
    createdAt: new Date(),
    updatedAt: new Date(),
    status,
    hasEscrow: false,
    hasDispute: false,
  });

  describe('setInvoice', () => {
    it('should add a new invoice', () => {
      const invoice = createMockInvoice('0x0000000000000000000000000000000000000000000000000000000000000001' as Bytes32);

      useInvoiceStore.getState().setInvoice(invoice);

      const state = useInvoiceStore.getState();
      expect(state.invoices[invoice.id]).toEqual(invoice);
      expect(state.invoiceIds).toContain(invoice.id);
    });

    it('should update an existing invoice', () => {
      const invoiceId = '0x0000000000000000000000000000000000000000000000000000000000000001' as Bytes32;
      const invoice = createMockInvoice(invoiceId);
      useInvoiceStore.getState().setInvoice(invoice);

      const updatedInvoice = { ...invoice, status: InvoiceStatus.PAID };
      useInvoiceStore.getState().setInvoice(updatedInvoice);

      const state = useInvoiceStore.getState();
      expect(state.invoices[invoiceId].status).toBe(InvoiceStatus.PAID);
      expect(state.invoiceIds.filter((id) => id === invoiceId).length).toBe(1);
    });
  });

  describe('removeInvoice', () => {
    it('should remove an invoice', () => {
      const invoiceId = '0x0000000000000000000000000000000000000000000000000000000000000001' as Bytes32;
      const invoice = createMockInvoice(invoiceId);
      useInvoiceStore.getState().setInvoice(invoice);

      useInvoiceStore.getState().removeInvoice(invoiceId);

      const state = useInvoiceStore.getState();
      expect(state.invoices[invoiceId]).toBeUndefined();
      expect(state.invoiceIds).not.toContain(invoiceId);
    });

    it('should clear selection if selected invoice is removed', () => {
      const invoiceId = '0x0000000000000000000000000000000000000000000000000000000000000001' as Bytes32;
      const invoice = createMockInvoice(invoiceId);
      useInvoiceStore.getState().setInvoice(invoice);
      useInvoiceStore.getState().selectInvoice(invoiceId);

      useInvoiceStore.getState().removeInvoice(invoiceId);

      const state = useInvoiceStore.getState();
      expect(state.selectedInvoiceId).toBeNull();
    });
  });

  describe('selectInvoice', () => {
    it('should select an invoice', () => {
      const invoiceId = '0x0000000000000000000000000000000000000000000000000000000000000001' as Bytes32;

      useInvoiceStore.getState().selectInvoice(invoiceId);

      expect(useInvoiceStore.getState().selectedInvoiceId).toBe(invoiceId);
    });

    it('should clear selection', () => {
      const invoiceId = '0x0000000000000000000000000000000000000000000000000000000000000001' as Bytes32;
      useInvoiceStore.getState().selectInvoice(invoiceId);

      useInvoiceStore.getState().selectInvoice(null);

      expect(useInvoiceStore.getState().selectedInvoiceId).toBeNull();
    });
  });

  describe('updateDraft', () => {
    it('should update draft fields', () => {
      useInvoiceStore.getState().updateDraft({
        buyer: '0x1234567890123456789012345678901234567890',
        amount: '1.5',
      });

      const state = useInvoiceStore.getState();
      expect(state.draft.buyer).toBe('0x1234567890123456789012345678901234567890');
      expect(state.draft.amount).toBe('1.5');
    });

    it('should preserve other draft fields', () => {
      useInvoiceStore.getState().updateDraft({ buyer: '0x1234' });
      useInvoiceStore.getState().updateDraft({ amount: '2.0' });

      const state = useInvoiceStore.getState();
      expect(state.draft.buyer).toBe('0x1234');
      expect(state.draft.amount).toBe('2.0');
    });
  });

  describe('getFilteredInvoices', () => {
    it('should filter by status', () => {
      const pending = createMockInvoice('0x0000000000000000000000000000000000000000000000000000000000000001' as Bytes32, InvoiceStatus.PENDING);
      const paid = createMockInvoice('0x0000000000000000000000000000000000000000000000000000000000000002' as Bytes32, InvoiceStatus.PAID);

      useInvoiceStore.getState().setInvoice(pending);
      useInvoiceStore.getState().setInvoice(paid);
      useInvoiceStore.getState().setStatusFilter(InvoiceStatus.PENDING);

      const filtered = useInvoiceStore.getState().getFilteredInvoices();
      expect(filtered.length).toBe(1);
      expect(filtered[0].status).toBe(InvoiceStatus.PENDING);
    });

    it('should filter by role', () => {
      const sellerAddress = '0x1234567890123456789012345678901234567890';
      const invoice1 = createMockInvoice('0x0000000000000000000000000000000000000000000000000000000000000001' as Bytes32);
      const invoice2: EVMInvoice = {
        ...createMockInvoice('0x0000000000000000000000000000000000000000000000000000000000000002' as Bytes32),
        seller: '0xdifferentseller1234567890123456789012345' as const,
      };

      useInvoiceStore.getState().setInvoice(invoice1);
      useInvoiceStore.getState().setInvoice(invoice2);
      useInvoiceStore.getState().setRoleFilter('seller');

      const filtered = useInvoiceStore.getState().getFilteredInvoices(sellerAddress);
      expect(filtered.length).toBe(1);
      expect(filtered[0].seller.toLowerCase()).toBe(sellerAddress.toLowerCase());
    });
  });

  describe('pendingTransactions', () => {
    it('should add pending transaction', () => {
      useInvoiceStore.getState().addPendingTransaction({
        type: 'create',
        transactionHash: '0xabc',
        timestamp: Date.now(),
        status: 'pending',
      });

      const state = useInvoiceStore.getState();
      expect(state.pendingTransactions.length).toBe(1);
      expect(state.pendingTransactions[0].transactionHash).toBe('0xabc');
    });

    it('should update pending transaction status', () => {
      useInvoiceStore.getState().addPendingTransaction({
        type: 'create',
        transactionHash: '0xabc',
        timestamp: Date.now(),
        status: 'pending',
      });

      useInvoiceStore.getState().updatePendingTransaction('0xabc', 'confirmed');

      const state = useInvoiceStore.getState();
      expect(state.pendingTransactions[0].status).toBe('confirmed');
    });
  });
});
