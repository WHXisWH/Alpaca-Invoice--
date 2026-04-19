// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IInvoiceRegistryFHE} from "./interfaces/IInvoiceRegistryFHE.sol";

/**
 * @title InvoiceRegistryFHE
 * @notice FHE-enabled invoice registry for Alpaca Invoice
 * @dev Migrated from Aleo zk_invoice_v4_2
 *
 * Architecture notes:
 * - Invoice amounts are stored off-chain (encrypted via FHE on client side)
 * - On-chain we store: invoiceHash (commitment to encrypted data), status, parties
 * - FHE encryption/decryption happens at the SDK layer using fhenixjs
 * - This contract manages state transitions and authorization
 */
contract InvoiceRegistryFHE is IInvoiceRegistryFHE {
    // ========= State =========
    mapping(bytes32 => InvoiceHeader) private _invoices;
    mapping(address => bool) private _authorizedContracts;

    address public override relayer;

    // ========= Modifiers =========
    modifier onlyRelayer() {
        if (msg.sender != relayer) {
            revert UnauthorizedRelayer();
        }
        _;
    }

    modifier onlyAuthorized() {
        if (msg.sender != relayer && !_authorizedContracts[msg.sender]) {
            revert UnauthorizedCaller();
        }
        _;
    }

    modifier invoiceMustExist(bytes32 invoiceId) {
        if (_invoices[invoiceId].seller == address(0)) {
            revert InvoiceNotFound(invoiceId);
        }
        _;
    }

    // ========= Constructor =========
    constructor(address initialRelayer) {
        if (initialRelayer == address(0)) {
            revert InvalidRelayer();
        }
        relayer = initialRelayer;
        emit RelayerUpdated(address(0), initialRelayer);
    }

    // ========= External Functions =========

    /**
     * @inheritdoc IInvoiceRegistryFHE
     */
    function createInvoice(
        address seller,
        address buyer,
        bytes32 invoiceId,
        bytes32 invoiceHash,
        uint64 dueDate,
        bool hasEscrow,
        bool hasDispute
    ) external override onlyRelayer {
        if (_invoices[invoiceId].seller != address(0)) {
            revert InvoiceAlreadyExists(invoiceId);
        }

        _invoices[invoiceId] = InvoiceHeader({
            seller: seller,
            buyer: buyer,
            invoiceId: invoiceId,
            invoiceHash: invoiceHash,
            dueDate: dueDate,
            status: InvoiceStatus.Pending,
            hasEscrow: hasEscrow,
            hasDispute: hasDispute,
            createdAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp)
        });

        emit InvoiceCreated(invoiceId, seller, buyer, invoiceHash, dueDate);
    }

    /**
     * @inheritdoc IInvoiceRegistryFHE
     */
    function updateInvoiceStatus(
        bytes32 invoiceId,
        InvoiceStatus newStatus
    ) external override onlyAuthorized invoiceMustExist(invoiceId) {
        InvoiceHeader storage invoice = _invoices[invoiceId];
        InvoiceStatus currentStatus = invoice.status;

        // Validate status transition
        if (!_isValidTransition(currentStatus, newStatus)) {
            revert InvalidStatusTransition(uint8(currentStatus), uint8(newStatus));
        }

        invoice.status = newStatus;
        invoice.updatedAt = uint64(block.timestamp);

        emit InvoiceStatusUpdated(invoiceId, currentStatus, newStatus);
    }

    /**
     * @inheritdoc IInvoiceRegistryFHE
     */
    function cancelInvoice(
        bytes32 invoiceId
    ) external override invoiceMustExist(invoiceId) {
        InvoiceHeader storage invoice = _invoices[invoiceId];

        // Only seller can cancel
        if (msg.sender != invoice.seller && msg.sender != relayer) {
            revert UnauthorizedCaller();
        }

        // Can only cancel pending invoices
        if (invoice.status != InvoiceStatus.Pending) {
            revert InvalidStatusTransition(uint8(invoice.status), uint8(InvoiceStatus.Cancelled));
        }

        invoice.status = InvoiceStatus.Cancelled;
        invoice.updatedAt = uint64(block.timestamp);

        emit InvoiceCancelled(invoiceId, msg.sender, uint64(block.timestamp));
        emit InvoiceStatusUpdated(invoiceId, InvoiceStatus.Pending, InvoiceStatus.Cancelled);
    }

    /**
     * @inheritdoc IInvoiceRegistryFHE
     */
    function markAsPaid(
        bytes32 invoiceId
    ) external override onlyRelayer invoiceMustExist(invoiceId) {
        InvoiceHeader storage invoice = _invoices[invoiceId];

        // Can only mark pending invoices as paid
        if (invoice.status != InvoiceStatus.Pending) {
            revert InvalidStatusTransition(uint8(invoice.status), uint8(InvoiceStatus.Paid));
        }

        invoice.status = InvoiceStatus.Paid;
        invoice.updatedAt = uint64(block.timestamp);

        emit InvoicePaid(invoiceId, invoice.buyer, uint64(block.timestamp));
        emit InvoiceStatusUpdated(invoiceId, InvoiceStatus.Pending, InvoiceStatus.Paid);
    }

    /**
     * @inheritdoc IInvoiceRegistryFHE
     */
    function payInvoice(
        bytes32 invoiceId
    ) external override invoiceMustExist(invoiceId) {
        InvoiceHeader storage invoice = _invoices[invoiceId];

        if (msg.sender != invoice.buyer && msg.sender != relayer) {
            revert UnauthorizedCaller();
        }

        if (invoice.status != InvoiceStatus.Pending) {
            revert InvalidStatusTransition(uint8(invoice.status), uint8(InvoiceStatus.Paid));
        }

        invoice.status = InvoiceStatus.Paid;
        invoice.updatedAt = uint64(block.timestamp);

        emit InvoicePaid(invoiceId, invoice.buyer, uint64(block.timestamp));
        emit InvoiceStatusUpdated(invoiceId, InvoiceStatus.Pending, InvoiceStatus.Paid);
    }

    /**
     * @inheritdoc IInvoiceRegistryFHE
     */
    function getInvoice(
        bytes32 invoiceId
    ) external view override returns (InvoiceHeader memory) {
        return _invoices[invoiceId];
    }

    /**
     * @inheritdoc IInvoiceRegistryFHE
     */
    function getInvoiceStatus(
        bytes32 invoiceId
    ) external view override returns (InvoiceStatus) {
        return _invoices[invoiceId].status;
    }

    /**
     * @inheritdoc IInvoiceRegistryFHE
     */
    function invoiceExists(bytes32 invoiceId) external view override returns (bool) {
        return _invoices[invoiceId].seller != address(0);
    }

    /**
     * @inheritdoc IInvoiceRegistryFHE
     */
    function setRelayer(address newRelayer) external override onlyRelayer {
        if (newRelayer == address(0)) {
            revert InvalidRelayer();
        }

        address previousRelayer = relayer;
        relayer = newRelayer;
        emit RelayerUpdated(previousRelayer, newRelayer);
    }

    /**
     * @inheritdoc IInvoiceRegistryFHE
     */
    function setAuthorizedContract(
        address contractAddress,
        bool authorized
    ) external override onlyRelayer {
        _authorizedContracts[contractAddress] = authorized;
    }

    /**
     * @notice Check if an address is an authorized contract
     */
    function isAuthorizedContract(address contractAddress) external view returns (bool) {
        return _authorizedContracts[contractAddress];
    }

    // ========= Internal Functions =========

    /**
     * @notice Validate status transition
     * @dev Implements the state machine from Aleo contract
     */
    function _isValidTransition(
        InvoiceStatus current,
        InvoiceStatus next
    ) internal pure returns (bool) {
        // Pending can transition to: Paid, Cancelled, Expired, Escrowed
        if (current == InvoiceStatus.Pending) {
            return next == InvoiceStatus.Paid ||
                   next == InvoiceStatus.Cancelled ||
                   next == InvoiceStatus.Expired ||
                   next == InvoiceStatus.Escrowed;
        }

        // Escrowed can transition to: Paid, Refunded, Disputed
        if (current == InvoiceStatus.Escrowed) {
            return next == InvoiceStatus.Paid ||
                   next == InvoiceStatus.Refunded ||
                   next == InvoiceStatus.Disputed;
        }

        // Disputed can transition to: ResolvedPaid, ResolvedCancelled
        if (current == InvoiceStatus.Disputed) {
            return next == InvoiceStatus.ResolvedPaid ||
                   next == InvoiceStatus.ResolvedCancelled;
        }

        // Terminal states cannot transition
        return false;
    }
}
