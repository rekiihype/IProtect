import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contracts/contract";

// ─── contractUtils.js ──────────────────────────────────────────────────────
// Plain async utility functions — NOT React hooks.
// Placed in utils/ (not hooks/) to avoid confusion with React hook naming rules.
//
// All 7 contract functions are defined in:
//   • blockchain_phase2.md Section 6.4
//   • implementation_ipprotection.md Section 13
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a Web3Provider signer for WRITE operations.
 * Use for: registerIP, transferIPOwnership, verifyIPRecord, grantLicense
 */
export async function getSigner() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
  }
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
}

/**
 * Returns a Web3Provider for READ-ONLY operations.
 * Use for: getIPDetails, isHashRegistered, getTotalIPCount
 */
export async function getProvider() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask to use IProtect.");
  }
  return new ethers.providers.Web3Provider(window.ethereum);
}

/**
 * Returns a Contract instance bound to the given signer or provider.
 * @param {ethers.Signer | ethers.providers.Provider} signerOrProvider
 */
export function getContract(signerOrProvider) {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
}
