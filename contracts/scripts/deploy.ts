import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy InvoiceRegistryFHE
  console.log("\n1. Deploying InvoiceRegistryFHE...");
  const InvoiceRegistryFHE = await ethers.getContractFactory("InvoiceRegistryFHE");
  const invoiceRegistry = await InvoiceRegistryFHE.deploy(deployer.address);
  await invoiceRegistry.waitForDeployment();
  const invoiceRegistryAddress = await invoiceRegistry.getAddress();
  console.log("   InvoiceRegistryFHE deployed to:", invoiceRegistryAddress);

  // Deploy EscrowFHE
  console.log("\n2. Deploying EscrowFHE...");
  const EscrowFHE = await ethers.getContractFactory("EscrowFHE");
  const escrow = await EscrowFHE.deploy(invoiceRegistryAddress);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("   EscrowFHE deployed to:", escrowAddress);

  // Deploy DisputeFHE
  console.log("\n3. Deploying DisputeFHE...");
  const DisputeFHE = await ethers.getContractFactory("DisputeFHE");
  const dispute = await DisputeFHE.deploy(invoiceRegistryAddress, escrowAddress);
  await dispute.waitForDeployment();
  const disputeAddress = await dispute.getAddress();
  console.log("   DisputeFHE deployed to:", disputeAddress);

  // Authorize contracts
  console.log("\n4. Authorizing contracts...");
  await invoiceRegistry.setAuthorizedContract(escrowAddress, true);
  console.log("   Authorized EscrowFHE");
  await invoiceRegistry.setAuthorizedContract(disputeAddress, true);
  console.log("   Authorized DisputeFHE");

  // Summary
  console.log("\n========================================");
  console.log("Deployment Complete!");
  console.log("========================================");
  console.log("InvoiceRegistryFHE:", invoiceRegistryAddress);
  console.log("EscrowFHE:", escrowAddress);
  console.log("DisputeFHE:", disputeAddress);
  console.log("Relayer:", deployer.address);
  console.log("========================================");

  // Output for .env file
  console.log("\nAdd to your .env file:");
  console.log(`RELAYER_INVOICE_REGISTRY_ADDRESS=${invoiceRegistryAddress}`);
  console.log(`RELAYER_ESCROW_ADDRESS=${escrowAddress}`);
  console.log(`RELAYER_DISPUTE_ADDRESS=${disputeAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
