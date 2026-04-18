// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IInvoiceRegistryFHE {
    error UnauthorizedRelayer();
    error InvalidRelayer();
    error InvoiceAlreadyExists(bytes32 invoiceId);

    struct InvoiceHeader {
        address seller;
        address buyer;
        bytes32 invoiceId;
        bytes32 invoiceHash;
        uint64 dueDate;
        uint8 status;
        bool hasEscrow;
        bool hasDispute;
    }

    event InvoiceCreated(
        bytes32 indexed invoiceId,
        address indexed seller,
        address indexed buyer,
        bytes32 invoiceHash,
        uint64 dueDate
    );
    event RelayerUpdated(address indexed previousRelayer, address indexed newRelayer);

    function getInvoice(bytes32 invoiceId) external view returns (InvoiceHeader memory);
    function relayer() external view returns (address);
    function createInvoice(
        address seller,
        address buyer,
        bytes32 invoiceId,
        bytes32 invoiceHash,
        uint64 dueDate,
        bool hasEscrow,
        bool hasDispute
    ) external;
    function setRelayer(address newRelayer) external;
}
