// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IEscrowFHE
 * @notice Interface for FHE-enabled escrow functionality
 * @dev Migrated from Aleo zk_invoice_v4_2 escrow module
 */
interface IEscrowFHE {
    // ========= Errors =========
    error InvalidAmount();
    error InvalidDeadline();
    error EscrowNotFound(bytes32 escrowId);
    error EscrowNotLocked(bytes32 escrowId);
    error EscrowAlreadyExists(bytes32 escrowId);
    error UnauthorizedCaller();
    error DeadlineNotPassed();
    error DeadlinePassed();

    // ========= Enums =========
    enum EscrowStatus {
        Locked,     // 0: Funds locked in escrow
        Released,   // 1: Funds released to seller
        Refunded    // 2: Funds refunded to buyer
    }

    // ========= Structs =========
    struct EscrowData {
        bytes32 escrowId;
        bytes32 invoiceId;
        address payer;          // buyer
        address payee;          // seller
        uint128 amount;         // encrypted in storage via euint128
        uint64 deliveryDeadline;
        address arbiter;
        EscrowStatus status;
        uint64 createdAt;
    }

    // ========= Events =========
    event EscrowCreated(
        bytes32 indexed escrowId,
        bytes32 indexed invoiceId,
        address indexed payer,
        address payee,
        uint64 deliveryDeadline,
        address arbiter
    );

    event EscrowReleased(
        bytes32 indexed escrowId,
        bytes32 indexed invoiceId,
        address indexed payee,
        uint64 releasedAt
    );

    event EscrowRefunded(
        bytes32 indexed escrowId,
        bytes32 indexed invoiceId,
        address indexed payer,
        uint64 refundedAt
    );

    event ArbiterResolved(
        bytes32 indexed escrowId,
        bytes32 indexed invoiceId,
        address indexed arbiter,
        bool releasedToSeller
    );

    event AuthorizedResolverUpdated(address indexed resolver, bool authorized);

    // ========= Functions =========

    /**
     * @notice Create escrow and lock funds
     * @param invoiceId The invoice ID this escrow is for
     * @param payee The seller address
     * @param deliveryDeadline Timestamp for delivery deadline
     * @param arbiter The arbiter address for dispute resolution
     */
    function createEscrow(
        bytes32 invoiceId,
        address payee,
        uint64 deliveryDeadline,
        address arbiter
    ) external payable returns (bytes32 escrowId);

    /**
     * @notice Confirm delivery and release funds to seller
     * @dev Can be called by payer (buyer) or arbiter
     * @param escrowId The escrow ID
     */
    function confirmDelivery(bytes32 escrowId) external;

    /**
     * @notice Refund after deadline passed
     * @dev Can be called by payer (buyer) or arbiter after deadline
     * @param escrowId The escrow ID
     */
    function timeoutRefund(bytes32 escrowId) external;

    /**
     * @notice Arbiter resolves escrow (release or refund)
     * @dev Only arbiter can call, no timeout restriction
     * @param escrowId The escrow ID
     * @param releaseToSeller True to release to seller, false to refund buyer
     */
    function arbiterResolve(bytes32 escrowId, bool releaseToSeller) external;

    /**
     * @notice Authorize a contract to resolve escrow on behalf of the arbiter flow
     * @dev Only the current relayer may call this function
     */
    function setAuthorizedResolver(address resolver, bool authorized) external;

    /**
     * @notice Get escrow data
     * @param escrowId The escrow ID
     */
    function getEscrow(bytes32 escrowId) external view returns (EscrowData memory);

    /**
     * @notice Get escrow ID by invoice ID
     * @param invoiceId The invoice ID
     */
    function getEscrowByInvoice(bytes32 invoiceId) external view returns (bytes32);

    /**
     * @notice Check whether a resolver address is authorized
     */
    function isAuthorizedResolver(address resolver) external view returns (bool);
}
