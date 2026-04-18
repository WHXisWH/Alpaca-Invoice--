// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IInvoiceRegistryFHE} from "./interfaces/IInvoiceRegistryFHE.sol";

contract InvoiceRegistryFHE is IInvoiceRegistryFHE {
    mapping(bytes32 => InvoiceHeader) private _headers;
    address public relayer;

    constructor(address initialRelayer) {
        if (initialRelayer == address(0)) {
            revert InvalidRelayer();
        }

        relayer = initialRelayer;
        emit RelayerUpdated(address(0), initialRelayer);
    }

    modifier onlyRelayer() {
        if (msg.sender != relayer) {
            revert UnauthorizedRelayer();
        }

        _;
    }

    function getInvoice(bytes32 invoiceId) external view override returns (InvoiceHeader memory) {
        return _headers[invoiceId];
    }

    function createInvoice(
        address seller,
        address buyer,
        bytes32 invoiceId,
        bytes32 invoiceHash,
        uint64 dueDate,
        bool hasEscrow,
        bool hasDispute
    ) external override onlyRelayer {
        if (_headers[invoiceId].seller != address(0)) {
            revert InvoiceAlreadyExists(invoiceId);
        }

        _headers[invoiceId] = InvoiceHeader({
            seller: seller,
            buyer: buyer,
            invoiceId: invoiceId,
            invoiceHash: invoiceHash,
            dueDate: dueDate,
            status: 1,
            hasEscrow: hasEscrow,
            hasDispute: hasDispute
        });

        emit InvoiceCreated(invoiceId, seller, buyer, invoiceHash, dueDate);
    }

    function setRelayer(address newRelayer) external override onlyRelayer {
        if (newRelayer == address(0)) {
            revert InvalidRelayer();
        }

        address previousRelayer = relayer;
        relayer = newRelayer;
        emit RelayerUpdated(previousRelayer, newRelayer);
    }
}
