// CONTRACT ABI
// Source: copied from artifacts/contracts/IPProtection.sol/IPProtection.json
// Import the full JSON file — ethers.js v5 reads the "abi" field automatically
// ⚠️ Run: npx hardhat build  then copy the file to this folder
import IPProtectionABI from "./IPProtection.json";

// CONTRACT ADDRESS
// Source: printed to console after running:
//   npx hardhat run scripts/deploy.ts --network localhost
// Example: "IPProtection deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3"
// Ask the contract developer for this address after they deploy.
export const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Export the ABI array from the JSON file
// The ABI defines all 7 functions (blockchain_phase2.md Section 6.4)
// and all 4 events (blockchain_phase2.md Section 6.5)
export const CONTRACT_ABI = IPProtectionABI.abi;
