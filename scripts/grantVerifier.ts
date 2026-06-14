/**
 * grantVerifier.ts
 * Grants VERIFIER_ROLE to a target address.
 * Must be run by the contract deployer (Account #0 = DEFAULT_ADMIN_ROLE).
 *
 * Usage:
 *   npx hardhat run scripts/grantVerifier.ts --network localhost
 */

import { network } from "hardhat";

// The deployed contract address — update this after each deployment
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Grant VERIFIER_ROLE to Account #1 (the default verifier test account)
const TARGET_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

async function main() {
  const conn   = await network.connect();
  const ethers = conn.ethers;

  // Account #0 is the deployer and holds DEFAULT_ADMIN_ROLE
  const [admin] = await ethers.getSigners();
  console.log("Admin (deployer):", admin.address);

  const IPProtection = await ethers.getContractAt("IPProtection", CONTRACT_ADDRESS, admin);

  const VERIFIER_ROLE = await IPProtection.VERIFIER_ROLE();
  console.log("VERIFIER_ROLE:   ", VERIFIER_ROLE);

  const alreadyGranted = await IPProtection.hasRole(VERIFIER_ROLE, TARGET_ADDRESS);
  if (alreadyGranted) {
    console.log(`${TARGET_ADDRESS} already has VERIFIER_ROLE — nothing to do.`);
    return;
  }

  console.log(`\nGranting VERIFIER_ROLE to: ${TARGET_ADDRESS} ...`);
  const tx = await IPProtection.grantRole(VERIFIER_ROLE, TARGET_ADDRESS);
  await tx.wait();

  console.log(`Done! Transaction hash: ${tx.hash}`);
  console.log(`   ${TARGET_ADDRESS} can now call verifyIPRecord().`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
