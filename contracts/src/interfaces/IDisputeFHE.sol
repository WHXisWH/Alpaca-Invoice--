// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IDisputeFHE
 * @notice Interface for FHE-enabled dispute resolution
 * @dev Migrated from Aleo zk_invoice_v4_2 dispute module
 */
interface IDisputeFHE {
    // ========= Errors =========
    error DisputeNotFound(bytes32 disputeId);
    error DisputeAlreadyExists(bytes32 invoiceId);
    error DisputeNotOpen(bytes32 disputeId);
    error DisputeAlreadyResolved(bytes32 disputeId);
    error InvalidResolutionDeadline();
    error InvoiceNotEscrowed(bytes32 invoiceId);
    error UnauthorizedCaller();
    error InvalidResolution();

    // ========= Enums =========
    enum DisputeStatus {
        Open,               // 0: Dispute is open
        ResolvedCancel,     // 1: Resolved in favor of buyer (refund)
        ResolvedPay         // 2: Resolved in favor of seller (release)
    }

    // ========= Structs =========
    struct DisputeData {
        bytes32 disputeId;
        bytes32 invoiceId;
        address disputant;      // The one who raised dispute (usually buyer)
        address arbiter;
        bytes32 reasonHash;     // Hash of dispute reason
        bytes32 evidenceHash;   // Hash of evidence
        DisputeStatus status;
        uint64 createdAt;
        uint64 resolutionDeadline;
    }

    // ========= Events =========
    event DisputeRaised(
        bytes32 indexed disputeId,
        bytes32 indexed invoiceId,
        address indexed disputant,
        address arbiter,
        bytes32 reasonHash,
        uint64 resolutionDeadline
    );

    event DisputeResolved(
        bytes32 indexed disputeId,
        bytes32 indexed invoiceId,
        address indexed arbiter,
        DisputeStatus resolution,
        bytes32 resolutionHash
    );

    event EvidenceSubmitted(
        bytes32 indexed disputeId,
        address indexed submitter,
        bytes32 newEvidenceHash
    );

    // ========= Functions =========

    /**
     * @notice Raise a dispute for an escrowed invoice
     * @dev Only buyer can raise dispute, invoice must be in ESCROWED status
     * @param invoiceId The invoice ID
     * @param arbiter The arbiter address
     * @param reasonHash Hash of the dispute reason
     * @param evidenceHash Hash of initial evidence
     * @param resolutionDeadline Deadline for resolution
     */
    function raiseDispute(
        bytes32 invoiceId,
        address arbiter,
        bytes32 reasonHash,
        bytes32 evidenceHash,
        uint64 resolutionDeadline
    ) external returns (bytes32 disputeId);

    /**
     * @notice Resolve a dispute
     * @dev Only arbiter can resolve
     * @param disputeId The dispute ID
     * @param resolution The resolution (ResolvedCancel or ResolvedPay)
     * @param resolutionHash Hash of resolution details
     */
    function resolveDispute(
        bytes32 disputeId,
        DisputeStatus resolution,
        bytes32 resolutionHash
    ) external;

    /**
     * @notice Submit additional evidence
     * @dev Can be called by disputant or arbiter while dispute is open
     * @param disputeId The dispute ID
     * @param newEvidenceHash Hash of new evidence
     */
    function submitEvidence(bytes32 disputeId, bytes32 newEvidenceHash) external;

    /**
     * @notice Get dispute data
     * @param disputeId The dispute ID
     */
    function getDispute(bytes32 disputeId) external view returns (DisputeData memory);

    /**
     * @notice Get dispute ID by invoice ID
     * @param invoiceId The invoice ID
     */
    function getDisputeByInvoice(bytes32 invoiceId) external view returns (bytes32);
}
