import { expect } from "chai";
import { ethers } from "hardhat";
import { InvoiceRegistryFHE } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("InvoiceRegistryFHE", function () {
  let invoiceRegistry: InvoiceRegistryFHE;
  let relayer: SignerWithAddress;
  let seller: SignerWithAddress;
  let buyer: SignerWithAddress;
  let other: SignerWithAddress;

  const invoiceId = ethers.keccak256(ethers.toUtf8Bytes("invoice-001"));
  const invoiceHash = ethers.keccak256(ethers.toUtf8Bytes("invoice-data"));
  const dueDate = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days from now

  beforeEach(async function () {
    [relayer, seller, buyer, other] = await ethers.getSigners();

    const InvoiceRegistryFHE = await ethers.getContractFactory("InvoiceRegistryFHE");
    invoiceRegistry = await InvoiceRegistryFHE.deploy(relayer.address);
    await invoiceRegistry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct relayer", async function () {
      expect(await invoiceRegistry.relayer()).to.equal(relayer.address);
    });

    it("Should revert if initial relayer is zero address", async function () {
      const InvoiceRegistryFHE = await ethers.getContractFactory("InvoiceRegistryFHE");
      await expect(
        InvoiceRegistryFHE.deploy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(invoiceRegistry, "InvalidRelayer");
    });
  });

  describe("Create Invoice", function () {
    it("Should create invoice with correct data", async function () {
      await invoiceRegistry.connect(relayer).createInvoice(
        seller.address,
        buyer.address,
        invoiceId,
        invoiceHash,
        dueDate,
        false,
        false
      );

      const invoice = await invoiceRegistry.getInvoice(invoiceId);
      expect(invoice.seller).to.equal(seller.address);
      expect(invoice.buyer).to.equal(buyer.address);
      expect(invoice.invoiceHash).to.equal(invoiceHash);
      expect(invoice.status).to.equal(0); // Pending
    });

    it("Should emit InvoiceCreated event", async function () {
      await expect(
        invoiceRegistry.connect(relayer).createInvoice(
          seller.address,
          buyer.address,
          invoiceId,
          invoiceHash,
          dueDate,
          false,
          false
        )
      )
        .to.emit(invoiceRegistry, "InvoiceCreated")
        .withArgs(invoiceId, seller.address, buyer.address, invoiceHash, dueDate);
    });

    it("Should revert if not called by relayer", async function () {
      await expect(
        invoiceRegistry.connect(other).createInvoice(
          seller.address,
          buyer.address,
          invoiceId,
          invoiceHash,
          dueDate,
          false,
          false
        )
      ).to.be.revertedWithCustomError(invoiceRegistry, "UnauthorizedRelayer");
    });

    it("Should revert if invoice already exists", async function () {
      await invoiceRegistry.connect(relayer).createInvoice(
        seller.address,
        buyer.address,
        invoiceId,
        invoiceHash,
        dueDate,
        false,
        false
      );

      await expect(
        invoiceRegistry.connect(relayer).createInvoice(
          seller.address,
          buyer.address,
          invoiceId,
          invoiceHash,
          dueDate,
          false,
          false
        )
      ).to.be.revertedWithCustomError(invoiceRegistry, "InvoiceAlreadyExists");
    });
  });

  describe("Cancel Invoice", function () {
    beforeEach(async function () {
      await invoiceRegistry.connect(relayer).createInvoice(
        seller.address,
        buyer.address,
        invoiceId,
        invoiceHash,
        dueDate,
        false,
        false
      );
    });

    it("Should allow seller to cancel invoice", async function () {
      await invoiceRegistry.connect(seller).cancelInvoice(invoiceId);
      const invoice = await invoiceRegistry.getInvoice(invoiceId);
      expect(invoice.status).to.equal(2); // Cancelled
    });

    it("Should allow relayer to cancel invoice", async function () {
      await invoiceRegistry.connect(relayer).cancelInvoice(invoiceId);
      const invoice = await invoiceRegistry.getInvoice(invoiceId);
      expect(invoice.status).to.equal(2); // Cancelled
    });

    it("Should revert if not seller or relayer", async function () {
      await expect(
        invoiceRegistry.connect(buyer).cancelInvoice(invoiceId)
      ).to.be.revertedWithCustomError(invoiceRegistry, "UnauthorizedCaller");
    });

    it("Should emit InvoiceCancelled event", async function () {
      await expect(invoiceRegistry.connect(seller).cancelInvoice(invoiceId))
        .to.emit(invoiceRegistry, "InvoiceCancelled");
    });
  });

  describe("Mark As Paid", function () {
    beforeEach(async function () {
      await invoiceRegistry.connect(relayer).createInvoice(
        seller.address,
        buyer.address,
        invoiceId,
        invoiceHash,
        dueDate,
        false,
        false
      );
    });

    it("Should mark invoice as paid", async function () {
      await invoiceRegistry.connect(relayer).markAsPaid(invoiceId);
      const invoice = await invoiceRegistry.getInvoice(invoiceId);
      expect(invoice.status).to.equal(1); // Paid
    });

    it("Should revert if not called by relayer", async function () {
      await expect(
        invoiceRegistry.connect(other).markAsPaid(invoiceId)
      ).to.be.revertedWithCustomError(invoiceRegistry, "UnauthorizedRelayer");
    });

    it("Should emit InvoicePaid event", async function () {
      await expect(invoiceRegistry.connect(relayer).markAsPaid(invoiceId))
        .to.emit(invoiceRegistry, "InvoicePaid");
    });
  });

  describe("Pay Invoice (buyer)", function () {
    beforeEach(async function () {
      await invoiceRegistry.connect(relayer).createInvoice(
        seller.address,
        buyer.address,
        invoiceId,
        invoiceHash,
        dueDate,
        false,
        false
      );
    });

    it("Should allow buyer to pay pending invoice", async function () {
      await invoiceRegistry.connect(buyer).payInvoice(invoiceId);
      const invoice = await invoiceRegistry.getInvoice(invoiceId);
      expect(invoice.status).to.equal(1); // Paid
    });

    it("Should allow relayer to pay via payInvoice", async function () {
      await invoiceRegistry.connect(relayer).payInvoice(invoiceId);
      const invoice = await invoiceRegistry.getInvoice(invoiceId);
      expect(invoice.status).to.equal(1);
    });

    it("Should revert if payer is not buyer or relayer", async function () {
      await expect(
        invoiceRegistry.connect(seller).payInvoice(invoiceId)
      ).to.be.revertedWithCustomError(invoiceRegistry, "UnauthorizedCaller");
    });

    it("Should emit InvoicePaid when buyer pays", async function () {
      await expect(invoiceRegistry.connect(buyer).payInvoice(invoiceId))
        .to.emit(invoiceRegistry, "InvoicePaid");
    });
  });

  describe("Update Invoice Status", function () {
    beforeEach(async function () {
      await invoiceRegistry.connect(relayer).createInvoice(
        seller.address,
        buyer.address,
        invoiceId,
        invoiceHash,
        dueDate,
        true,
        false
      );
    });

    it("Should update status from Pending to Escrowed", async function () {
      await invoiceRegistry.connect(relayer).updateInvoiceStatus(invoiceId, 7); // Escrowed
      const invoice = await invoiceRegistry.getInvoice(invoiceId);
      expect(invoice.status).to.equal(7);
    });

    it("Should revert on invalid status transition", async function () {
      await expect(
        invoiceRegistry.connect(relayer).updateInvoiceStatus(invoiceId, 4) // Disputed from Pending is invalid
      ).to.be.revertedWithCustomError(invoiceRegistry, "InvalidStatusTransition");
    });
  });

  describe("Relayer Management", function () {
    it("Should update relayer", async function () {
      await invoiceRegistry.connect(relayer).setRelayer(other.address);
      expect(await invoiceRegistry.relayer()).to.equal(other.address);
    });

    it("Should emit RelayerUpdated event", async function () {
      await expect(invoiceRegistry.connect(relayer).setRelayer(other.address))
        .to.emit(invoiceRegistry, "RelayerUpdated")
        .withArgs(relayer.address, other.address);
    });

    it("Should revert if new relayer is zero address", async function () {
      await expect(
        invoiceRegistry.connect(relayer).setRelayer(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(invoiceRegistry, "InvalidRelayer");
    });
  });

  describe("Authorized Contracts", function () {
    it("Should set authorized contract", async function () {
      await invoiceRegistry.connect(relayer).setAuthorizedContract(other.address, true);
      expect(await invoiceRegistry.isAuthorizedContract(other.address)).to.be.true;
    });

    it("Should allow authorized contract to update status", async function () {
      await invoiceRegistry.connect(relayer).createInvoice(
        seller.address,
        buyer.address,
        invoiceId,
        invoiceHash,
        dueDate,
        true,
        false
      );
      await invoiceRegistry.connect(relayer).setAuthorizedContract(other.address, true);

      await invoiceRegistry.connect(other).updateInvoiceStatus(invoiceId, 7); // Escrowed
      const invoice = await invoiceRegistry.getInvoice(invoiceId);
      expect(invoice.status).to.equal(7);
    });
  });
});
