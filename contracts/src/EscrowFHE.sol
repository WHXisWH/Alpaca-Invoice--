// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IEscrowFHE} from "./interfaces/IEscrowFHE.sol";
import {IInvoiceRegistryFHE} from "./interfaces/IInvoiceRegistryFHE.sol";

/**
 * @title EscrowFHE
 * @notice FHE-enabled escrow for Alpaca Invoice
 * @dev Migrated from Aleo zk_invoice_v4_2 escrow module
 *
 * Flow:
 * 1. Buyer calls createEscrow() with ETH payment
 * 2. Invoice status changes to ESCROWED
 * 3. After delivery: payer/arbiter calls confirmDelivery() -> funds to seller
 * 4. If timeout: payer/arbiter calls timeoutRefund() -> funds back to buyer
 * 5. Arbiter can resolve at any time via arbiterResolve()
 */
contract EscrowFHE is IEscrowFHE {
    // ========= State =========
    IInvoiceRegistryFHE public immutable invoiceRegistry;

    mapping(bytes32 => EscrowData) private _escrows;
    mapping(bytes32 => bytes32) private _invoiceToEscrow;

    // ========= Constructor =========
    constructor(address _invoiceRegistry) {
        invoiceRegistry = IInvoiceRegistryFHE(_invoiceRegistry);
    }

    // ========= Modifiers =========
    modifier escrowMustExist(bytes32 escrowId) {
        if (_escrows[escrowId].payer == address(0)) {
            revert EscrowNotFound(escrowId);
        }
        _;
    }

    modifier escrowMustBeLocked(bytes32 escrowId) {
        if (_escrows[escrowId].status != EscrowStatus.Locked) {
            revert EscrowNotLocked(escrowId);
        }
        _;
    }

    // ========= External Functions =========

    /**
     * @inheritdoc IEscrowFHE
     */
    function createEscrow(
        bytes32 invoiceId,
        address payee,
        uint64 deliveryDeadline,
        address arbiter
    ) external payable override returns (bytes32 escrowId) {
        if (msg.value == 0) {
            revert InvalidAmount();
        }
        if (deliveryDeadline <= block.timestamp) {
            revert InvalidDeadline();
        }

        // Check invoice exists and is pending
        IInvoiceRegistryFHE.InvoiceHeader memory invoice = invoiceRegistry.getInvoice(invoiceId);
        if (invoice.seller == address(0)) {
            revert EscrowNotFound(invoiceId); // Reusing error for invoice not found
        }

        // Verify caller is the buyer
        if (msg.sender != invoice.buyer) {
            revert UnauthorizedCaller();
        }

        // Verify payee matches seller
        if (payee != invoice.seller) {
            revert UnauthorizedCaller();
        }

        // Check no escrow exists for this invoice
        if (_invoiceToEscrow[invoiceId] != bytes32(0)) {
            revert EscrowAlreadyExists(invoiceId);
        }

        // Generate escrow ID
        escrowId = keccak256(abi.encodePacked(
            invoiceId,
            msg.sender,
            payee,
            msg.value,
            deliveryDeadline,
            arbiter,
            block.timestamp
        ));

        // Store escrow data
        _escrows[escrowId] = EscrowData({
            escrowId: escrowId,
            invoiceId: invoiceId,
            payer: msg.sender,
            payee: payee,
            amount: uint128(msg.value),
            deliveryDeadline: deliveryDeadline,
            arbiter: arbiter,
            status: EscrowStatus.Locked,
            createdAt: uint64(block.timestamp)
        });

        _invoiceToEscrow[invoiceId] = escrowId;

        // Update invoice status to Escrowed
        invoiceRegistry.updateInvoiceStatus(invoiceId, IInvoiceRegistryFHE.InvoiceStatus.Escrowed);

        emit EscrowCreated(escrowId, invoiceId, msg.sender, payee, deliveryDeadline, arbiter);

        return escrowId;
    }

    /**
     * @inheritdoc IEscrowFHE
     */
    function confirmDelivery(
        bytes32 escrowId
    ) external override escrowMustExist(escrowId) escrowMustBeLocked(escrowId) {
        EscrowData storage escrow = _escrows[escrowId];

        // Only payer or arbiter can confirm delivery
        if (msg.sender != escrow.payer && msg.sender != escrow.arbiter) {
            revert UnauthorizedCaller();
        }

        // Update escrow status
        escrow.status = EscrowStatus.Released;

        // Update invoice status to Paid
        invoiceRegistry.updateInvoiceStatus(escrow.invoiceId, IInvoiceRegistryFHE.InvoiceStatus.Paid);

        // Transfer funds to seller
        (bool success, ) = escrow.payee.call{value: escrow.amount}("");
        require(success, "Transfer failed");

        emit EscrowReleased(escrowId, escrow.invoiceId, escrow.payee, uint64(block.timestamp));
    }

    /**
     * @inheritdoc IEscrowFHE
     */
    function timeoutRefund(
        bytes32 escrowId
    ) external override escrowMustExist(escrowId) escrowMustBeLocked(escrowId) {
        EscrowData storage escrow = _escrows[escrowId];

        // Only payer or arbiter can request timeout refund
        if (msg.sender != escrow.payer && msg.sender != escrow.arbiter) {
            revert UnauthorizedCaller();
        }

        // Check deadline has passed
        if (block.timestamp <= escrow.deliveryDeadline) {
            revert DeadlineNotPassed();
        }

        // Update escrow status
        escrow.status = EscrowStatus.Refunded;

        // Update invoice status to Refunded
        invoiceRegistry.updateInvoiceStatus(escrow.invoiceId, IInvoiceRegistryFHE.InvoiceStatus.Refunded);

        // Refund to buyer
        (bool success, ) = escrow.payer.call{value: escrow.amount}("");
        require(success, "Refund failed");

        emit EscrowRefunded(escrowId, escrow.invoiceId, escrow.payer, uint64(block.timestamp));
    }

    /**
     * @inheritdoc IEscrowFHE
     */
    function arbiterResolve(
        bytes32 escrowId,
        bool releaseToSeller
    ) external override escrowMustExist(escrowId) escrowMustBeLocked(escrowId) {
        EscrowData storage escrow = _escrows[escrowId];

        // Only arbiter can call this
        if (msg.sender != escrow.arbiter) {
            revert UnauthorizedCaller();
        }

        address recipient;
        IInvoiceRegistryFHE.InvoiceStatus newInvoiceStatus;

        if (releaseToSeller) {
            escrow.status = EscrowStatus.Released;
            recipient = escrow.payee;
            newInvoiceStatus = IInvoiceRegistryFHE.InvoiceStatus.Paid;
        } else {
            escrow.status = EscrowStatus.Refunded;
            recipient = escrow.payer;
            newInvoiceStatus = IInvoiceRegistryFHE.InvoiceStatus.Refunded;
        }

        // Update invoice status
        invoiceRegistry.updateInvoiceStatus(escrow.invoiceId, newInvoiceStatus);

        // Transfer funds
        (bool success, ) = recipient.call{value: escrow.amount}("");
        require(success, "Transfer failed");

        emit ArbiterResolved(escrowId, escrow.invoiceId, msg.sender, releaseToSeller);
    }

    /**
     * @inheritdoc IEscrowFHE
     */
    function getEscrow(bytes32 escrowId) external view override returns (EscrowData memory) {
        return _escrows[escrowId];
    }

    /**
     * @inheritdoc IEscrowFHE
     */
    function getEscrowByInvoice(bytes32 invoiceId) external view override returns (bytes32) {
        return _invoiceToEscrow[invoiceId];
    }

    /**
     * @notice Get escrow balance
     * @param escrowId The escrow ID
     */
    function getEscrowBalance(bytes32 escrowId) external view returns (uint128) {
        EscrowData storage escrow = _escrows[escrowId];
        if (escrow.status == EscrowStatus.Locked) {
            return escrow.amount;
        }
        return 0;
    }
}
