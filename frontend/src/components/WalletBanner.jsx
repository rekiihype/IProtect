// ─── WalletBanner ──────────────────────────────────────────────────────────
// Three distinct states (see implementation_frontend.md Section 6.2):
//
//  walletAddress = null,  isCorrectNetwork = null  → Gray: "Please connect"
//  walletAddress = exists, isCorrectNetwork = false → Red: "Wrong network"
//  walletAddress = exists, isCorrectNetwork = true  → null (no banner)
//
// isCorrectNetwork defaults to null in useWallet (not false) so the red banner
// does NOT flash on page load before the user has clicked Connect.
// ─────────────────────────────────────────────────────────────────────────────

export default function WalletBanner({ walletAddress, isCorrectNetwork }) {
  if (!walletAddress) {
    return (
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
        <div className="mx-auto max-w-7xl flex items-center justify-center gap-2 text-sm text-gray-600">
          <span>Please connect your wallet to use this app.</span>
        </div>
      </div>
    );
  }

  if (isCorrectNetwork === false) {
    return (
      <div className="border-b border-red-200 bg-red-50 px-4 py-2.5">
        <div className="mx-auto max-w-7xl flex items-center justify-center gap-2 text-sm text-red-600">
          <span>
            Wrong network. Please switch to <strong className="font-semibold">Hardhat Network (31337)</strong> or <strong className="font-semibold">Sepolia</strong>.
          </span>
        </div>
      </div>
    );
  }

  return null;
}
