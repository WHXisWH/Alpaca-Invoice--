import { expect } from "chai";
import { ethers } from "hardhat";
import { InvoiceRegistryFHE, EscrowFHE } from "../typechain-types";

type SignerWithAddress = Awaited<ReturnType<typeof ethers.getSigners>>[number];

describe("EscrowFHE", function () {
  let invoiceRegistry: InvoiceRegistryFHE;
  let escrow: EscrowFHE;
  let relayer: SignerWithAddress;
  let seller: SignerWithAddress;
  let buyer: SignerWithAddress;
  let arbiter: SignerWithAddress;

  const invoiceId = ethers.keccak256(ethers.toUtf8Bytes("invoice-001"));
  const invoiceHash = ethers.keccak256(ethers.toUtf8Bytes("invoice-data"));
  const dueDate = Math.floor(Date.now() / 1000) + 86400 * 30;
  const escrowAmount = ethers.parseEther("1.0");

  beforeEach(async function () {
    [relayer, seller, buyer, arbiter] = await ethers.getSigners();

    // Deploy InvoiceRegistry
    const InvoiceRegistryFHE = await ethers.getContractFactory("InvoiceRegistryFHE");
    invoiceRegistry = await InvoiceRegistryFHE.deploy(relayer.address) as unknown as InvoiceRegistryFHE;
    await invoiceRegistry.waitForDeployment();

    // Deploy Escrow
    const EscrowFHE = await ethers.getContractFactory("EscrowFHE");
    escrow = await EscrowFHE.deploy(await invoiceRegistry.getAddress()) as unknown as EscrowFHE;
    await escrow.waitForDeployment();

    // Authorize escrow contract
    await invoiceRegistry.connect(relayer).setAuthorizedContract(await escrow.getAddress(), true);

    // Create invoice
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

  describe("Create Escrow", function () {
    it("Should create escrow with correct data", async function () {
      const deliveryDeadline = Math.floor(Date.now() / 1000) + 86400 * 7;

      const tx = await escrow.connect(buyer).createEscrow(
        invoiceId,
        seller.address,
        deliveryDeadline,
        arbiter.address,
        { value: escrowAmount }
      );

      const receipt = await tx.wait();
      const escrowAddress = await escrow.getAddress();
      const event = receipt?.logs.find((log) => log.address === escrowAddress);

      expect(event).to.not.be.undefined;

      // Get escrow ID from invoice
      const escrowId = await escrow.getEscrowByInvoice(invoiceId);
      expect(escrowId).to.not.equal(ethers.ZeroHash);

      // Check escrow data
      const escrowData = await escrow.getEscrow(escrowId);
      expect(escrowData.payer).to.equal(buyer.address);
      expect(escrowData.payee).to.equal(seller.address);
      expect(escrowData.amount).to.equal(escrowAmount);
      expect(escrowData.status).to.equal(0); // Locked
    });

    it("Should update invoice status to Escrowed", async function () {
      const deliveryDeadline = Math.floor(Date.now() / 1000) + 86400 * 7;

      await escrow.connect(buyer).createEscrow(
        invoiceId,
        seller.address,
        deliveryDeadline,
        arbiter.address,
        { value: escrowAmount }
      );

      const invoice = await invoiceRegistry.getInvoice(invoiceId);
      expect(invoice.status).to.equal(7); // Escrowed
    });

    it("Should revert if amount is zero", async function () {
      const deliveryDeadline = Math.floor(Date.now() / 1000) + 86400 * 7;

      await expect(
        escrow.connect(buyer).createEscrow(
          invoiceId,
          seller.address,
          deliveryDeadline,
          arbiter.address,
          { value: 0 }
        )
      ).to.be.revertedWithCustomError(escrow, "InvalidAmount");
    });

    it("Should revert if deadline is in the past", async function () {
      const pastDeadline = Math.floor(Date.now() / 1000) - 86400;

      await expect(
        escrow.connect(buyer).createEscrow(
          invoiceId,
          seller.address,
          pastDeadline,
          arbiter.address,
          { value: escrowAmount }
        )
      ).to.be.revertedWithCustomError(escrow, "InvalidDeadline");
    });

    it("Should revert if not called by buyer", async function () {
      const deliveryDeadline = Math.floor(Date.now() / 1000) + 86400 * 7;

      await expect(
        escrow.connect(seller).createEscrow(
          invoiceId,
          seller.address,
          deliveryDeadline,
          arbiter.address,
          { value: escrowAmount }
        )
      ).to.be.revertedWithCustomError(escrow, "UnauthorizedCaller");
    });
  });

  describe("Confirm Delivery", function () {
    let escrowId: string;

    beforeEach(async function () {
      const deliveryDeadline = Math.floor(Date.now() / 1000) + 86400 * 7;

      await escrow.connect(buyer).createEscrow(
        invoiceId,
        seller.address,
        deliveryDeadline,
        arbiter.address,
        { value: escrowAmount }
      );

      escrowId = await escrow.getEscrowByInvoice(invoiceId);
    });

    it("Should release funds to seller when buyer confirms", async function () {
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

      await escrow.connect(buyer).confirmDelivery(escrowId);

      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(escrowAmount);

      const escrowData = await escrow.getEscrow(escrowId);
      expect(escrowData.status).to.equal(1); // Released
    });

    it("Should release funds when arbiter confirms", async function () {
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

      await escrow.connect(arbiter).confirmDelivery(escrowId);

      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(escrowAmount);
    });

    it("Should update invoice status to Paid", async function () {
      await escrow.connect(buyer).confirmDelivery(escrowId);

      const invoice = await invoiceRegistry.getInvoice(invoiceId);
      expect(invoice.status).to.equal(1); // Paid
    });

    it("Should revert if not payer or arbiter", async function () {
      await expect(
        escrow.connect(seller).confirmDelivery(escrowId)
      ).to.be.revertedWithCustomError(escrow, "UnauthorizedCaller");
    });
  });

  describe("Timeout Refund", function () {
    let escrowId: string;

    beforeEach(async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deliveryDeadline = latestBlock!.timestamp + 3600;

      await escrow.connect(buyer).createEscrow(
        invoiceId,
        seller.address,
        deliveryDeadline,
        arbiter.address,
        { value: escrowAmount }
      );

      escrowId = await escrow.getEscrowByInvoice(invoiceId);
    });

    it("Should refund buyer after deadline", async function () {
      await ethers.provider.send("evm_increaseTime", [3605]);
      await ethers.provider.send("evm_mine", []);

      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);

      const tx = await escrow.connect(arbiter).timeoutRefund(escrowId);
      const receipt = await tx.wait();

      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      expect(buyerBalanceAfter - buyerBalanceBefore).to.equal(escrowAmount);

      const escrowData = await escrow.getEscrow(escrowId);
      expect(escrowData.status).to.equal(2); // Refunded
    });

    it("Should revert if deadline not passed", async function () {
      await expect(
        escrow.connect(buyer).timeoutRefund(escrowId)
      ).to.be.revertedWithCustomError(escrow, "DeadlineNotPassed");
    });
  });

  describe("Arbiter Resolve", function () {
    let escrowId: string;

    beforeEach(async function () {
      const deliveryDeadline = Math.floor(Date.now() / 1000) + 86400 * 7;

      await escrow.connect(buyer).createEscrow(
        invoiceId,
        seller.address,
        deliveryDeadline,
        arbiter.address,
        { value: escrowAmount }
      );

      escrowId = await escrow.getEscrowByInvoice(invoiceId);
    });

    it("Should release to seller when arbiter decides", async function () {
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

      await escrow.connect(arbiter).arbiterResolve(escrowId, true);

      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(escrowAmount);

      const escrowData = await escrow.getEscrow(escrowId);
      expect(escrowData.status).to.equal(1); // Released
    });

    it("Should refund to buyer when arbiter decides", async function () {
      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);

      await escrow.connect(arbiter).arbiterResolve(escrowId, false);

      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      expect(buyerBalanceAfter - buyerBalanceBefore).to.equal(escrowAmount);

      const escrowData = await escrow.getEscrow(escrowId);
      expect(escrowData.status).to.equal(2); // Refunded
    });

    it("Should revert if not arbiter", async function () {
      await expect(
        escrow.connect(buyer).arbiterResolve(escrowId, true)
      ).to.be.revertedWithCustomError(escrow, "UnauthorizedCaller");
    });
  });
});
