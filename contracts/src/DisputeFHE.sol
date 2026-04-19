// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IDisputeFHE} from "./interfaces/IDisputeFHE.sol";
import {IInvoiceRegistryFHE} from "./interfaces/IInvoiceRegistryFHE.sol";
import {IEscrowFHE} from "./interfaces/IEscrowFHE.sol";

/**
 * @title DisputeFHE
 * @notice FHE-enabled dispute resolution for Alpaca Invoice
 * @dev Migrated from Aleo zk_invoice_v4_2 dispute module
 *
 * Flow:
 * 1. Buyer raises dispute on ESCROWED invoice via raiseDispute()
 * 2. Invoice status changes to DISPUTED
 * 3. Parties can submit evidence via submitEvidence()
 * 4. Arbiter resolves via resolveDispute()
 * 5. Escrow funds are released/refunded based on resolution
 */
contract DisputeFHE is IDisputeFHE {
    // ========= State =========
    IInvoiceRegistryFHE public immutable invoiceRegistry;
    IEscrowFHE public immutable escrowContract;

    mapping(bytes32 => DisputeData) private _disputes;
    mapping(bytes32 => bytes32) private _invoiceToDispute;
    mapping(bytes32 => bytes32) private _disputeResolutions;

    // ========= Constructor =========
    constructor(address _invoiceRegistry, address _escrowContract) {
        invoiceRegistry = IInvoiceRegistryFHE(_invoiceRegistry);
        escrowContract = IEscrowFHE(_escrowContract);
    }

    // ========= Modifiers =========
    modifier disputeMustExist(bytes32 disputeId) {
        if (_disputes[disputeId].disputant == address(0)) {
            revert DisputeNotFound(disputeId);
        }
        _;
    }

    modifier disputeMustBeOpen(bytes32 disputeId) {
        if (_disputes[disputeId].status != DisputeStatus.Open) {
            revert DisputeNotOpen(disputeId);
        }
        _;
    }

    // ========= External Functions =========

    /**
     * @inheritdoc IDisputeFHE
     */
    function raiseDispute(
        bytes32 invoiceId,
        address arbiter,
        bytes32 reasonHash,
        bytes32 evidenceHash,
        uint64 resolutionDeadline
    ) external override returns (bytes32 disputeId) {
        // Check resolution deadline is in the future
        if (resolutionDeadline <= block.timestamp) {
            revert InvalidResolutionDeadline();
        }

        // Get invoice data
        IInvoiceRegistryFHE.InvoiceHeader memory invoice = invoiceRegistry.getInvoice(invoiceId);

        // Only buyer can raise dispute
        if (msg.sender != invoice.buyer) {
            revert UnauthorizedCaller();
        }

        // Invoice must be escrowed
        if (invoice.status != IInvoiceRegistryFHE.InvoiceStatus.Escrowed) {
            revert InvoiceNotEscrowed(invoiceId);
        }

        // Check no dispute exists for this invoice
        if (_invoiceToDispute[invoiceId] != bytes32(0)) {
            revert DisputeAlreadyExists(invoiceId);
        }

        // Generate dispute ID
        disputeId = keccak256(abi.encodePacked(
            invoiceId,
            msg.sender,
            arbiter,
            reasonHash,
            block.timestamp
        ));

        // Store dispute data
        _disputes[disputeId] = DisputeData({
            disputeId: disputeId,
            invoiceId: invoiceId,
            disputant: msg.sender,
            arbiter: arbiter,
            reasonHash: reasonHash,
            evidenceHash: evidenceHash,
            status: DisputeStatus.Open,
            createdAt: uint64(block.timestamp),
            resolutionDeadline: resolutionDeadline
        });

        _invoiceToDispute[invoiceId] = disputeId;

        // Update invoice status to Disputed
        invoiceRegistry.updateInvoiceStatus(invoiceId, IInvoiceRegistryFHE.InvoiceStatus.Disputed);

        emit DisputeRaised(disputeId, invoiceId, msg.sender, arbiter, reasonHash, resolutionDeadline);

        return disputeId;
    }

    /**
     * @inheritdoc IDisputeFHE
     */
    function resolveDispute(
        bytes32 disputeId,
        DisputeStatus resolution,
        bytes32 resolutionHash
    ) external override disputeMustExist(disputeId) disputeMustBeOpen(disputeId) {
        DisputeData storage dispute = _disputes[disputeId];

        // Only arbiter can resolve
        if (msg.sender != dispute.arbiter) {
            revert UnauthorizedCaller();
        }

        // Resolution must be ResolvedCancel or ResolvedPay
        if (resolution != DisputeStatus.ResolvedCancel && resolution != DisputeStatus.ResolvedPay) {
            revert InvalidResolution();
        }

        // Update dispute status
        dispute.status = resolution;
        _disputeResolutions[disputeId] = resolutionHash;

        // Update invoice status
        IInvoiceRegistryFHE.InvoiceStatus newInvoiceStatus;
        if (resolution == DisputeStatus.ResolvedPay) {
            newInvoiceStatus = IInvoiceRegistryFHE.InvoiceStatus.ResolvedPaid;
        } else {
            newInvoiceStatus = IInvoiceRegistryFHE.InvoiceStatus.ResolvedCancelled;
        }
        invoiceRegistry.updateInvoiceStatus(dispute.invoiceId, newInvoiceStatus);

        // Resolve escrow based on decision
        bytes32 escrowId = escrowContract.getEscrowByInvoice(dispute.invoiceId);
        if (escrowId != bytes32(0)) {
            bool releaseToSeller = (resolution == DisputeStatus.ResolvedPay);
            escrowContract.arbiterResolve(escrowId, releaseToSeller);
        }

        emit DisputeResolved(disputeId, dispute.invoiceId, msg.sender, resolution, resolutionHash);
    }

    /**
     * @inheritdoc IDisputeFHE
     */
    function submitEvidence(
        bytes32 disputeId,
        bytes32 newEvidenceHash
    ) external override disputeMustExist(disputeId) disputeMustBeOpen(disputeId) {
        DisputeData storage dispute = _disputes[disputeId];

        // Only disputant or arbiter can submit evidence
        if (msg.sender != dispute.disputant && msg.sender != dispute.arbiter) {
            revert UnauthorizedCaller();
        }

        dispute.evidenceHash = newEvidenceHash;

        emit EvidenceSubmitted(disputeId, msg.sender, newEvidenceHash);
    }

    /**
     * @inheritdoc IDisputeFHE
     */
    function getDispute(bytes32 disputeId) external view override returns (DisputeData memory) {
        return _disputes[disputeId];
    }

    /**
     * @inheritdoc IDisputeFHE
     */
    function getDisputeByInvoice(bytes32 invoiceId) external view override returns (bytes32) {
        return _invoiceToDispute[invoiceId];
    }

    /**
     * @notice Get dispute resolution hash
     * @param disputeId The dispute ID
     */
    function getResolutionHash(bytes32 disputeId) external view returns (bytes32) {
        return _disputeResolutions[disputeId];
    }

    /**
     * @notice Check if dispute is resolved
     * @param disputeId The dispute ID
     */
    function isResolved(bytes32 disputeId) external view returns (bool) {
        DisputeStatus status = _disputes[disputeId].status;
        return status == DisputeStatus.ResolvedCancel || status == DisputeStatus.ResolvedPay;
    }
}
