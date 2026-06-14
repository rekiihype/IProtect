import { useState, useEffect } from "react";

export function useWallet() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(null);

  // Supported chain IDs
  const SUPPORTED_CHAINS = {
    "0x7a69": "Hardhat Local (31337)",
    "0xaa36a7": "Sepolia Testnet",
  };

  function checkChainId(chainId) {
    setIsCorrectNetwork(chainId in SUPPORTED_CHAINS);
  }

  async function connectWallet() {
    if (!window.ethereum) {
      alert("MetaMask is not installed. Please install MetaMask to use IProtect.");
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setWalletAddress(accounts[0]);

      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      checkChainId(chainId);
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  }

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setWalletAddress(null);
        setIsCorrectNetwork(null);
      } else {
        setWalletAddress(accounts[0]);
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  function disconnectWallet() {
    setWalletAddress(null);
    setIsCorrectNetwork(null);
  }

  return { walletAddress, isCorrectNetwork, connectWallet, disconnectWallet };
}
