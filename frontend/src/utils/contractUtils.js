import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contracts/contract";

export async function getSigner() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
  }
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
}

export async function getProvider() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask to use IProtect.");
  }
  return new ethers.providers.Web3Provider(window.ethereum);
}

export function getContract(signerOrProvider) {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
}
