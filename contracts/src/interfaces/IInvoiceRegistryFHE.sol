// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IInvoiceRegistryFHE
 * @notice Interface for FHE-enabled invoice registry
 * @dev Migrated from Aleo zk_invoice_v4_2
 *
 * Status transitions:
 *   PENDING -> PAID (direct payment)
 *   PENDING -> CANCELLED (seller cancels)
 *   PENDING -> EXPIRED (past due date)
 *   PENDING -> ESCROWED (escrow created)
 *   ESCROWED -> PAID (delivery confirmed)
 *   ESCROWED -> REFUNDED (timeout refund)
 *   ESCROWED -> DISPUTED (dispute raised)
 *   DISPUTED -> RESOLVED_PAID (arbiter decides for seller)
 *   DISPUTED -> RESOLVED_CANCELLED (arbiter decides for buyer)
 */
interface IInvoiceRegistryFHE {
    // ========= Errors =========
    error UnauthorizedRelayer();
    error UnauthorizedCaller();
    error InvalidRelayer();
    error InvalidStatus();
    error InvoiceAlreadyExists(bytes32 invoiceId);
    error InvoiceNotFound(bytes32 invoiceId);
    error InvalidStatusTransition(uint8 currentStatus, uint8 newStatus);

    // ========= Enums =========
    enum InvoiceStatus {
        Pending,            // 0: Invoice created, awaiting payment
        Paid,               // 1: Payment completed
        Cancelled,          // 2: Cancelled by seller
        Expired,            // 3: Past due date without payment
        Disputed,           // 4: Under dispute
        ResolvedCancelled,  // 5: Dispute resolved - refund to buyer
        ResolvedPaid,       // 6: Dispute resolved - payment to seller
        Escrowed,           // 7: Funds locked in escrow
        Refunded            // 8: Escrow refunded to buyer
    }

    // ========= Structs =========
    struct InvoiceHeader {
        address seller;
        address buyer;
        bytes32 invoiceId;
        bytes32 invoiceHash;    // Hash of encrypted invoice details
        uint64 dueDate;
        InvoiceStatus status;
        bool hasEscrow;
        bool hasDispute;
        uint64 createdAt;
        uint64 updatedAt;
    }

    // ========= Events =========
    event InvoiceCreated(
        bytes32 indexed invoiceId,
        address indexed seller,
        address indexed buyer,
        bytes32 invoiceHash,
        uint64 dueDate
    );

    event InvoiceStatusUpdated(
        bytes32 indexed invoiceId,
        InvoiceStatus previousStatus,
        InvoiceStatus newStatus
    );

    event InvoicePaid(
        bytes32 indexed invoiceId,
        address indexed payer,
        uint64 paidAt
    );

    event InvoiceCancelled(
        bytes32 indexed invoiceId,
        address indexed cancelledBy,
        uint64 cancelledAt
    );

    event RelayerUpdated(
        address indexed previousRelayer,
        address indexed newRelayer
    );

    // ========= Functions =========

    /**
     * @notice Create a new invoice
     * @dev Only relayer can call this
     */
    function createInvoice(
        address seller,
        address buyer,
        bytes32 invoiceId,
        bytes32 invoiceHash,
        uint64 dueDate,
        bool hasEscrow,
        bool hasDispute
    ) external;

    /**
     * @notice Update invoice status
     * @dev Only authorized contracts (escrow, dispute) or relayer can call
     */
    function updateInvoiceStatus(bytes32 invoiceId, InvoiceStatus newStatus) external;

    /**
     * @notice Cancel an invoice
     * @dev Only seller can cancel a pending invoice
     */
    function cancelInvoice(bytes32 invoiceId) external;

    /**
     * @notice Mark invoice as paid (direct payment without escrow)
     * @dev Only relayer can call
     */
    function markAsPaid(bytes32 invoiceId) external;

    /**
     * @notice Buyer (or relayer) marks a pending invoice as paid on-chain
     * @dev Used for wallet-initiated settlement; relayer path remains markAsPaid
     */
    function payInvoice(bytes32 invoiceId) external;

    /**
     * @notice Get invoice data
     */
    function getInvoice(bytes32 invoiceId) external view returns (InvoiceHeader memory);

    /**
     * @notice Get invoice status
     */
    function getInvoiceStatus(bytes32 invoiceId) external view returns (InvoiceStatus);

    /**
     * @notice Check if invoice exists
     */
    function invoiceExists(bytes32 invoiceId) external view returns (bool);

    /**
     * @notice Get relayer address
     */
    function relayer() external view returns (address);

    /**
     * @notice Set new relayer
     * @dev Only current relayer can call
     */
    function setRelayer(address newRelayer) external;

    /**
     * @notice Set authorized contract (escrow or dispute)
     * @dev Only relayer can call
     */
    function setAuthorizedContract(address contractAddress, bool authorized) external;
}
