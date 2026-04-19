import { expect } from "chai";
import { ethers } from "hardhat";
import { InvoiceRegistryFHE, EscrowFHE, DisputeFHE } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("DisputeFHE", function () {
  let invoiceRegistry: InvoiceRegistryFHE;
  let escrow: EscrowFHE;
  let dispute: DisputeFHE;
  let relayer: SignerWithAddress;
  let seller: SignerWithAddress;
  let buyer: SignerWithAddress;
  let arbiter: SignerWithAddress;

  const invoiceId = ethers.keccak256(ethers.toUtf8Bytes("invoice-001"));
  const invoiceHash = ethers.keccak256(ethers.toUtf8Bytes("invoice-data"));
  const dueDate = Math.floor(Date.now() / 1000) + 86400 * 30;
  const escrowAmount = ethers.parseEther("1.0");
  const reasonHash = ethers.keccak256(ethers.toUtf8Bytes("Product not delivered"));
  const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("Screenshot evidence"));

  beforeEach(async function () {
    [relayer, seller, buyer, arbiter] = await ethers.getSigners();

    // Deploy InvoiceRegistry
    const InvoiceRegistryFHE = await ethers.getContractFactory("InvoiceRegistryFHE");
    invoiceRegistry = await InvoiceRegistryFHE.deploy(relayer.address);
    await invoiceRegistry.waitForDeployment();

    // Deploy Escrow
    const EscrowFHE = await ethers.getContractFactory("EscrowFHE");
    escrow = await EscrowFHE.deploy(await invoiceRegistry.getAddress());
    await escrow.waitForDeployment();

    // Deploy Dispute
    const DisputeFHE = await ethers.getContractFactory("DisputeFHE");
    dispute = await DisputeFHE.deploy(
      await invoiceRegistry.getAddress(),
      await escrow.getAddress()
    );
    await dispute.waitForDeployment();

    // Authorize contracts
    await invoiceRegistry.connect(relayer).setAuthorizedContract(await escrow.getAddress(), true);
    await invoiceRegistry.connect(relayer).setAuthorizedContract(await dispute.getAddress(), true);

    // Create invoice
    await invoiceRegistry.connect(relayer).createInvoice(
      seller.address,
      buyer.address,
      invoiceId,
      invoiceHash,
      dueDate,
      true,
      true
    );

    // Create escrow
    const deliveryDeadline = Math.floor(Date.now() / 1000) + 86400 * 7;
    await escrow.connect(buyer).createEscrow(
      invoiceId,
      seller.address,
      deliveryDeadline,
      arbiter.address,
      { value: escrowAmount }
    );
  });

  describe("Raise Dispute", function () {
    it("Should create dispute with correct data", async function () {
      const resolutionDeadline = Math.floor(Date.now() / 1000) + 86400 * 14;

      const tx = await dispute.connect(buyer).raiseDispute(
        invoiceId,
        arbiter.address,
        reasonHash,
        evidenceHash,
        resolutionDeadline
      );

      const receipt = await tx.wait();
      expect(receipt).to.not.be.undefined;

      // Get dispute ID
      const disputeId = await dispute.getDisputeByInvoice(invoiceId);
      expect(disputeId).to.not.equal(ethers.ZeroHash);

      // Check dispute data
      const disputeData = await dispute.getDispute(disputeId);
      expect(disputeData.disputant).to.equal(buyer.address);
      expect(disputeData.arbiter).to.equal(arbiter.address);
      expect(disputeData.reasonHash).to.equal(reasonHash);
      expect(disputeData.status).to.equal(0); // Open
    });

    it("Should update invoice status to Disputed", async function () {
      const resolutionDeadline = Math.floor(Date.now() / 1000) + 86400 * 14;

      await dispute.connect(buyer).raiseDispute(
        invoiceId,
        arbiter.address,
        reasonHash,
        evidenceHash,
        resolutionDeadline
      );

      const invoice = await invoiceRegistry.getInvoice(invoiceId);
      expect(invoice.status).to.equal(4); // Disputed
    });

    it("Should emit DisputeRaised event", async function () {
      const resolutionDeadline = Math.floor(Date.now() / 1000) + 86400 * 14;

      await expect(
        dispute.connect(buyer).raiseDispute(
          invoiceId,
          arbiter.address,
          reasonHash,
          evidenceHash,
          resolutionDeadline
        )
      ).to.emit(dispute, "DisputeRaised");
    });

    it("Should revert if not called by buyer", async function () {
      const resolutionDeadline = Math.floor(Date.now() / 1000) + 86400 * 14;

      await expect(
        dispute.connect(seller).raiseDispute(
          invoiceId,
          arbiter.address,
          reasonHash,
          evidenceHash,
          resolutionDeadline
        )
      ).to.be.revertedWithCustomError(dispute, "UnauthorizedCaller");
    });

    it("Should revert if resolution deadline is in the past", async function () {
      const pastDeadline = Math.floor(Date.now() / 1000) - 86400;

      await expect(
        dispute.connect(buyer).raiseDispute(
          invoiceId,
          arbiter.address,
          reasonHash,
          evidenceHash,
          pastDeadline
        )
      ).to.be.revertedWithCustomError(dispute, "InvalidResolutionDeadline");
    });

    it("Should revert if dispute already exists", async function () {
      const resolutionDeadline = Math.floor(Date.now() / 1000) + 86400 * 14;

      await dispute.connect(buyer).raiseDispute(
        invoiceId,
        arbiter.address,
        reasonHash,
        evidenceHash,
        resolutionDeadline
      );

      await expect(
        dispute.connect(buyer).raiseDispute(
          invoiceId,
          arbiter.address,
          reasonHash,
          evidenceHash,
          resolutionDeadline
        )
      ).to.be.revertedWithCustomError(dispute, "DisputeAlreadyExists");
    });
  });

  describe("Resolve Dispute", function () {
    let disputeId: string;

    beforeEach(async function () {
      const resolutionDeadline = Math.floor(Date.now() / 1000) + 86400 * 14;

      await dispute.connect(buyer).raiseDispute(
        invoiceId,
        arbiter.address,
        reasonHash,
        evidenceHash,
        resolutionDeadline
      );

      disputeId = await dispute.getDisputeByInvoice(invoiceId);
    });

    it("Should resolve in favor of seller (ResolvedPay)", async function () {
      const resolutionHash = ethers.keccak256(ethers.toUtf8Bytes("Seller delivered"));
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

      await dispute.connect(arbiter).resolveDispute(disputeId, 2, resolutionHash); // ResolvedPay

      const disputeData = await dispute.getDispute(disputeId);
      expect(disputeData.status).to.equal(2); // ResolvedPay

      const invoice = await invoiceRegistry.getInvoice(invoiceId);
      expect(invoice.status).to.equal(6); // ResolvedPaid

      // Funds should be released to seller
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(escrowAmount);
    });

    it("Should resolve in favor of buyer (ResolvedCancel)", async function () {
      const resolutionHash = ethers.keccak256(ethers.toUtf8Bytes("Buyer is right"));
      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);

      await dispute.connect(arbiter).resolveDispute(disputeId, 1, resolutionHash); // ResolvedCancel

      const disputeData = await dispute.getDispute(disputeId);
      expect(disputeData.status).to.equal(1); // ResolvedCancel

      const invoice = await invoiceRegistry.getInvoice(invoiceId);
      expect(invoice.status).to.equal(5); // ResolvedCancelled

      // Funds should be refunded to buyer
      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      expect(buyerBalanceAfter - buyerBalanceBefore).to.equal(escrowAmount);
    });

    it("Should emit DisputeResolved event", async function () {
      const resolutionHash = ethers.keccak256(ethers.toUtf8Bytes("Resolution"));

      await expect(
        dispute.connect(arbiter).resolveDispute(disputeId, 2, resolutionHash)
      ).to.emit(dispute, "DisputeResolved");
    });

    it("Should revert if not arbiter", async function () {
      const resolutionHash = ethers.keccak256(ethers.toUtf8Bytes("Resolution"));

      await expect(
        dispute.connect(buyer).resolveDispute(disputeId, 2, resolutionHash)
      ).to.be.revertedWithCustomError(dispute, "UnauthorizedCaller");
    });

    it("Should revert with invalid resolution", async function () {
      const resolutionHash = ethers.keccak256(ethers.toUtf8Bytes("Resolution"));

      await expect(
        dispute.connect(arbiter).resolveDispute(disputeId, 0, resolutionHash) // Open is not valid
      ).to.be.revertedWithCustomError(dispute, "InvalidResolution");
    });
  });

  describe("Submit Evidence", function () {
    let disputeId: string;

    beforeEach(async function () {
      const resolutionDeadline = Math.floor(Date.now() / 1000) + 86400 * 14;

      await dispute.connect(buyer).raiseDispute(
        invoiceId,
        arbiter.address,
        reasonHash,
        evidenceHash,
        resolutionDeadline
      );

      disputeId = await dispute.getDisputeByInvoice(invoiceId);
    });

    it("Should allow disputant to submit evidence", async function () {
      const newEvidenceHash = ethers.keccak256(ethers.toUtf8Bytes("New evidence"));

      await dispute.connect(buyer).submitEvidence(disputeId, newEvidenceHash);

      const disputeData = await dispute.getDispute(disputeId);
      expect(disputeData.evidenceHash).to.equal(newEvidenceHash);
    });

    it("Should allow arbiter to submit evidence", async function () {
      const newEvidenceHash = ethers.keccak256(ethers.toUtf8Bytes("Arbiter evidence"));

      await dispute.connect(arbiter).submitEvidence(disputeId, newEvidenceHash);

      const disputeData = await dispute.getDispute(disputeId);
      expect(disputeData.evidenceHash).to.equal(newEvidenceHash);
    });

    it("Should emit EvidenceSubmitted event", async function () {
      const newEvidenceHash = ethers.keccak256(ethers.toUtf8Bytes("New evidence"));

      await expect(
        dispute.connect(buyer).submitEvidence(disputeId, newEvidenceHash)
      )
        .to.emit(dispute, "EvidenceSubmitted")
        .withArgs(disputeId, buyer.address, newEvidenceHash);
    });

    it("Should revert if not disputant or arbiter", async function () {
      const newEvidenceHash = ethers.keccak256(ethers.toUtf8Bytes("New evidence"));

      await expect(
        dispute.connect(seller).submitEvidence(disputeId, newEvidenceHash)
      ).to.be.revertedWithCustomError(dispute, "UnauthorizedCaller");
    });
  });
});
