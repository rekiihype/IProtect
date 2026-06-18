import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TransactionStatus from "../components/TransactionStatus";
import { getProvider, getSigner, getContract } from "../utils/contractUtils";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function truncateAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimestamp(bigNumber) {
  return new Date(bigNumber.toNumber() * 1000).toLocaleString();
}

/**
 * Returns a human-readable string like "12 days 4 hrs left" or "Expired 2 days ago".
 * @param {number} grantedAt  - Unix timestamp (seconds) when the license was granted
 * @param {number} durationDays - License duration in days
 */
function formatTimeLeft(grantedAt, durationDays) {
  const expiryMs  = (grantedAt + durationDays * 86400) * 1000;
  const nowMs     = Date.now();
  const diffMs    = expiryMs - nowMs;
  const absDiffMs = Math.abs(diffMs);

  const days  = Math.floor(absDiffMs / 86400000);
  const hours = Math.floor((absDiffMs % 86400000) / 3600000);
  const mins  = Math.floor((absDiffMs % 3600000)  / 60000);

  if (diffMs <= 0) {
    // Expired
    if (days > 0)  return `Expired ${days}d ${hours}h ago`;
    if (hours > 0) return `Expired ${hours}h ${mins}m ago`;
    return `Expired ${mins}m ago`;
  }

  // Still active
  if (days > 0)  return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

// ─── OwnedIPCard ──────────────────────────────────────────────────────────────
function OwnedIPCard({ record }) {
  const id = record.ipId?.toNumber();
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">IP #{id}</p>
        <p className="font-bold text-gray-900 truncate text-lg">{record.title}</p>
        <p className="text-xs text-gray-500 mt-1">{formatTimestamp(record.registrationTime)}</p>
        {record.ipfsHash && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">CID:</span>
            <span className="font-mono text-xs text-blue-600 truncate max-w-[180px]" title={record.ipfsHash}>
              {record.ipfsHash}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(record.ipfsHash)}
              className="text-xs text-gray-400 hover:text-blue-600 transition shrink-0"
              title="Copy CID"
            >
              Copy
            </button>
            <a
              href={`https://ipfs.io/ipfs/${record.ipfsHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 transition shrink-0 inline-flex items-center gap-0.5"
              title="View on IPFS"
            >
              View <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          </div>
        )}
      </div>
      <span
        className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          record.isVerified
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-yellow-50 border border-yellow-200 text-yellow-700"
        }`}
      >
        {record.isVerified ? "Verified" : "Pending"}
      </span>
    </div>
  );
}


// ─── TransferManage Page ──────────────────────────────────────────────────────
export default function TransferManage({ walletAddress }) {
  const navigate = useNavigate();

  const [ownedIPs, setOwnedIPs] = useState([]);
  const [loadingIPs, setLoadingIPs] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Transfer form state
  const [transferIpId, setTransferIpId] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [transferStatus, setTransferStatus] = useState("idle");
  const [transferError, setTransferError] = useState(null);

  // License form state
  const [licenseIpId, setLicenseIpId] = useState("");
  const [licensee, setLicensee] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [licenseStatus, setLicenseStatus] = useState("idle");
  const [licenseError, setLicenseError] = useState(null);

  // My received licenses state
  const [myLicenses, setMyLicenses] = useState([]);
  const [loadingLicenses, setLoadingLicenses] = useState(false);

  // ── Redirect if no wallet ──
  useEffect(() => {
    if (walletAddress === null) {
      // Give the wallet hook time to initialise before redirecting
      const timer = setTimeout(() => {
        if (!walletAddress) navigate("/");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [walletAddress, navigate]);

  // ── Fetch owned IPs ──
  async function fetchOwnedIPs() {
    if (!walletAddress) return;
    setLoadingIPs(true);
    setLoadError(null);
    try {
      const provider = await getProvider();
      const contract = getContract(provider);

      const totalCount = await contract.getTotalIPCount();
      const total = totalCount.toNumber(); // ethers v5 BigNumber → number

      const owned = [];
      for (let id = 1; id <= total; id++) {
        const record = await contract.getIPDetails(id);
        // Filter: only IPs owned by the connected wallet
        if (record.owner.toLowerCase() === walletAddress.toLowerCase()) {
          owned.push(record);
        }
      }
      setOwnedIPs(owned);
    } catch (err) {
      console.error(err);
      setLoadError("Could not load your IPs. Is the contract deployed and MetaMask connected?");
    } finally {
      setLoadingIPs(false);
    }
  }

  useEffect(() => {
    if (walletAddress) {
      fetchOwnedIPs();
      fetchMyLicenses();
    }
  }, [walletAddress]);

  // ── Fetch licenses received by this wallet ──
  async function fetchMyLicenses() {
    if (!walletAddress) return;
    setLoadingLicenses(true);
    try {
      const provider = await getProvider();
      const contract = getContract(provider);

      // Query IPLicensed events where licensee = connected wallet
      const filter = contract.filters.IPLicensed(null, null, walletAddress);
      const logs = await contract.queryFilter(filter, 0, "latest");

      // Enrich each log with the IP title
      const enriched = await Promise.all(
        logs.map(async (log) => {
          const ipId = log.args.ipId.toNumber();
          let title = `IP #${ipId}`;
          try {
            const details = await contract.getIPDetails(ipId);
            title = details.title || title;
          } catch (_) {}
          return {
            ipId,
            title,
            licensor: log.args.licensor,
            durationDays: log.args.durationDays.toNumber(),
            timestamp: log.args.timestamp.toNumber(),
          };
        })
      );

      // Most recent first
      setMyLicenses(enriched.reverse());
    } catch (err) {
      console.error("Failed to fetch licenses:", err);
    } finally {
      setLoadingLicenses(false);
    }
  }

  // ── Transfer Ownership ──
  async function handleTransfer() {
    if (!transferIpId || !newOwner) {
      setTransferError("Please fill in both IP ID and new owner address.");
      return;
    }

    setTransferStatus("pending");
    setTransferError(null);
    try {
      const signer = await getSigner();
      const contract = getContract(signer);
      const tx = await contract.transferIPOwnership(parseInt(transferIpId, 10), newOwner.trim());
      await tx.wait();
      setTransferStatus("confirmed");
      // Refresh owned IPs — after transfer, this IP should disappear from the list
      await fetchOwnedIPs();
      setTransferIpId("");
      setNewOwner("");
    } catch (err) {
      setTransferStatus("failed");
      const reason = err?.reason || err?.data?.message || err?.message || "Unknown error";
      setTransferError(`Transfer failed: ${reason}`);
    }
  }

  // ── Grant License ──
  async function handleGrantLicense() {
    if (!licenseIpId || !licensee || !durationDays) {
      setLicenseError("Please fill in all three fields.");
      return;
    }
    const days = parseInt(durationDays, 10);
    if (isNaN(days) || days <= 0) {
      setLicenseError("Duration must be a positive number of days.");
      return;
    }

    setLicenseStatus("pending");
    setLicenseError(null);
    try {
      const signer = await getSigner();
      const contract = getContract(signer);
      const tx = await contract.grantLicense(parseInt(licenseIpId, 10), licensee.trim(), days);
      await tx.wait();
      setLicenseStatus("confirmed");
      setLicenseIpId("");
      setLicensee("");
      setDurationDays("");
    } catch (err) {
      setLicenseStatus("failed");
      const reason = err?.reason || err?.data?.message || err?.message || "Unknown error";
      setLicenseError(`License grant failed: ${reason}`);
    }
  }

  // ── No wallet ──
  if (!walletAddress) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 text-center">
        <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm animate-fade-in-up">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Wallet Required</h1>
          <p className="text-gray-500 text-sm">Connect your MetaMask wallet to manage your IPs.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-12 space-y-8">
      <div className="animate-fade-in-up">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 mb-4 shadow-sm">
            Owner Role Required
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Transfer & Manage</h1>
          <p className="text-gray-500 text-sm">
            Transfer ownership of your IPs or grant time-limited usage licences.
          </p>
        </div>

        {/* ── Section 1: My Registered IPs ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">My Registered IPs</h2>
            <button
              onClick={fetchOwnedIPs}
              disabled={loadingIPs}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 transition"
            >
              {loadingIPs ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loadError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 mb-4">
              {loadError}
            </div>
          )}

          {loadingIPs && (
            <p className="text-sm text-gray-500 animate-pulse">Loading your IPs...</p>
          )}

          {!loadingIPs && ownedIPs.length === 0 && !loadError && (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">No IPs registered under this wallet address.</p>
            </div>
          )}

          <div className="space-y-4">
            {ownedIPs.map((record) => (
              <OwnedIPCard key={record.ipId?.toNumber()} record={record} />
            ))}
          </div>
        </div>

        {/* ── Section 2: Transfer Ownership ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1 tracking-tight">Transfer Ownership</h2>
          <p className="text-xs text-gray-500 mb-5">
            After transfer, the IP's verification status resets to unverified automatically.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="transfer-ip-id" className="block text-sm font-medium text-gray-700 mb-2">
                Select IP <span className="text-red-500">*</span>
              </label>
              <select
                id="transfer-ip-id"
                value={transferIpId}
                onChange={(e) => setTransferIpId(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition appearance-none cursor-pointer"
              >
                <option value="" disabled className="text-gray-500">
                  {ownedIPs.length === 0 ? "— No IPs registered yet —" : "— Choose your IP —"}
                </option>
                {ownedIPs.map((record) => {
                  const id = record.ipId?.toNumber();
                  return (
                    <option key={id} value={id}>
                      IP #{id} — {record.title}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label htmlFor="transfer-new-owner" className="block text-sm font-medium text-gray-700 mb-2">
                New Owner Address <span className="text-red-500">*</span>
              </label>
              <input
                id="transfer-new-owner"
                type="text"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-mono text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition"
              />
            </div>

            <button
              id="btn-transfer"
              onClick={handleTransfer}
              disabled={transferStatus === "pending"}
              className="w-full rounded-xl bg-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white transition-all"
            >
              {transferStatus === "pending" ? "Transferring..." : "Transfer Ownership"}
            </button>

            {transferError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {transferError}
              </div>
            )}
            <TransactionStatus status={transferStatus} />
          </div>
        </div>

        {/* ── Section 3: Grant License ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1 tracking-tight">Grant Usage Licence</h2>
          <p className="text-xs text-gray-500 mb-5">
            Grant a time-limited licence to use your IP. This is recorded permanently on-chain.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="license-ip-id" className="block text-sm font-medium text-gray-700 mb-2">
                Select IP <span className="text-red-500">*</span>
              </label>
              <select
                id="license-ip-id"
                value={licenseIpId}
                onChange={(e) => setLicenseIpId(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition appearance-none cursor-pointer"
              >
                <option value="" disabled className="text-gray-500">
                  {ownedIPs.length === 0 ? "— No IPs registered yet —" : "— Choose your IP —"}
                </option>
                {ownedIPs.map((record) => {
                  const id = record.ipId?.toNumber();
                  return (
                    <option key={id} value={id}>
                      IP #{id} — {record.title}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label htmlFor="license-licensee" className="block text-sm font-medium text-gray-700 mb-2">
                Licensee Address <span className="text-red-500">*</span>
              </label>
              <input
                id="license-licensee"
                type="text"
                value={licensee}
                onChange={(e) => setLicensee(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-mono text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition"
              />
            </div>
            <div>
              <label htmlFor="license-duration" className="block text-sm font-medium text-gray-700 mb-2">
                Duration (days) <span className="text-red-500">*</span>
              </label>
              <input
                id="license-duration"
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="e.g. 30"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition"
              />
            </div>

            <button
              id="btn-grant-license"
              onClick={handleGrantLicense}
              disabled={licenseStatus === "pending"}
              className="w-full rounded-xl border border-gray-200 bg-white text-gray-900 hover:border-black disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold transition-all"
            >
              {licenseStatus === "pending" ? "Granting Licence..." : "Grant Licence"}
            </button>

            {licenseError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {licenseError}
              </div>
            )}
            <TransactionStatus status={licenseStatus} />
          </div>
        </div>

        {/* ── Section 4: My Received Licenses ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">My Received Licences</h2>
              <p className="text-xs text-gray-500 mt-0.5">Licences granted to you by IP owners.</p>
            </div>
            <button
              onClick={fetchMyLicenses}
              disabled={loadingLicenses}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 transition"
            >
              {loadingLicenses ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loadingLicenses && (
            <p className="text-sm text-gray-500 animate-pulse">Loading your licences...</p>
          )}

          {!loadingLicenses && myLicenses.length === 0 && (
            <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
              <p className="text-sm text-gray-500">No licences have been granted to this wallet yet.</p>
            </div>
          )}

          <div className="space-y-4">
            {myLicenses.map((lic, i) => {
              const expiryMs  = (lic.timestamp + lic.durationDays * 86400) * 1000;
              const isExpired = Date.now() > expiryMs;
              const timeLeft  = formatTimeLeft(lic.timestamp, lic.durationDays);
              return (
                <div
                  key={i}
                  className={`rounded-xl border p-5 ${
                    isExpired
                      ? "border-red-200 bg-red-50"
                      : "border-gray-200 bg-white shadow-sm"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">IP #{lic.ipId}</p>
                      <p className="font-bold text-gray-900 truncate text-lg">{lic.title}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Granted by{" "}
                        <span className="font-mono text-gray-900">
                          {lic.licensor.slice(0, 6)}...{lic.licensor.slice(-4)}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(lic.timestamp * 1000).toLocaleString()}
                      </p>
                      {/* Expiry row */}
                      <p className={`text-xs mt-3 font-medium flex items-center gap-1 ${
                        isExpired ? "text-red-700" : "text-green-700"
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${isExpired ? "bg-red-500" : "bg-green-500"}`}></span>
                        Expires {new Date(expiryMs).toLocaleDateString()} — {timeLeft}
                      </p>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-gray-100 border border-gray-200 text-gray-700">
                        {lic.durationDays} day{lic.durationDays !== 1 ? "s" : ""}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        isExpired
                          ? "bg-red-50 border border-red-200 text-red-700"
                          : "bg-green-50 border border-green-200 text-green-700"
                      }`}>
                        {isExpired ? "Expired" : timeLeft}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </main>
  );
}
