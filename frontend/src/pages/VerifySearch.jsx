import { useState } from "react";
import TransactionStatus from "../components/TransactionStatus";
import { getProvider, getSigner, getContract } from "../utils/contractUtils";

function truncateAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimestamp(bigNumber) {
  return new Date(bigNumber.toNumber() * 1000).toLocaleString();
}

function IPRecordCard({ record, walletAddress, onVerify, verifyStatus }) {
  const isVerified = record.isVerified;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-fade-in-up space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">IP #{record.ipId?.toNumber()}</p>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">{record.title}</h2>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            isVerified
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-yellow-50 border border-yellow-200 text-yellow-700"
          }`}
        >
          {isVerified ? "Verified" : "Not Verified"}
        </span>
      </div>

      {record.description && (
        <p className="text-sm text-gray-600 leading-relaxed">{record.description}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Owner</p>
          <p className="font-mono text-gray-900">{truncateAddress(record.owner)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Registered</p>
          <p className="text-gray-900">{formatTimestamp(record.registrationTime)}</p>
        </div>
        <div className="col-span-full">
          <p className="text-xs font-medium text-gray-500 mb-1">IPFS Hash</p>
          <a
            href={`https://ipfs.io/ipfs/${record.ipfsHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-blue-600 hover:text-blue-700 underline break-all inline-flex items-center gap-1"
          >
            {record.ipfsHash}
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {!isVerified && walletAddress && (
        <div className="border-t border-gray-100 pt-5 mt-2">
          <p className="text-xs text-gray-500 mb-3">
            <strong className="text-gray-700 font-semibold">Verifier Action:</strong> If you hold the VERIFIER_ROLE, you can endorse this record.
          </p>
          <button
            id="btn-verify-record"
            onClick={onVerify}
            disabled={verifyStatus === "pending" || verifyStatus === "confirmed"}
            className="rounded-xl border border-gray-200 bg-white hover:border-black text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-medium transition-all"
          >
            {verifyStatus === "pending" ? "Verifying..." : "Verify this Record"}
          </button>
          <TransactionStatus status={verifyStatus} />
        </div>
      )}
    </div>
  );
}

export default function VerifySearch({ walletAddress }) {
  const [mode, setMode] = useState("id");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [record, setRecord] = useState(null);
  const [hashResult, setHashResult] = useState(null);
  const [searchError, setSearchError] = useState(null);

  const [verifyStatus, setVerifyStatus] = useState("idle");
  const [verifyError, setVerifyError] = useState(null);

  async function handleSearchById() {
    const id = parseInt(input.trim(), 10);
    if (!input.trim() || isNaN(id) || id <= 0) {
      setSearchError("Please enter a valid IP ID (a positive number).");
      return;
    }
    setLoading(true);
    setRecord(null);
    setSearchError(null);
    setVerifyStatus("idle");
    setVerifyError(null);
    try {
      const provider = await getProvider();
      const contract = getContract(provider);
      const result = await contract.getIPDetails(id);
      setRecord(result);
    } catch (err) {
      const reason = err?.reason || err?.data?.message || "Record not found or contract not deployed.";
      setSearchError(`Search failed: ${reason}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearchByHash() {
    const hash = input.trim();
    if (!hash) {
      setSearchError("Please enter an IPFS hash (CID).");
      return;
    }
    setLoading(true);
    setHashResult(null);
    setRecord(null);
    setSearchError(null);
    setVerifyStatus("idle");
    setVerifyError(null);
    try {
      const provider = await getProvider();
      const contract = getContract(provider);
      const isRegistered = await contract.isHashRegistered(hash);
      setHashResult(isRegistered);
      if (isRegistered) {
        const totalCount = await contract.getTotalIPCount();
        const total = totalCount.toNumber();
        for (let id = 1; id <= total; id++) {
          const r = await contract.getIPDetails(id);
          if (r.ipfsHash === hash) {
            setRecord(r);
            break;
          }
        }
      }
    } catch (err) {
      const reason = err?.reason || err?.data?.message || "Could not check hash. Is the contract deployed?";
      setSearchError(`Search failed: ${reason}`);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    if (mode === "id") handleSearchById();
    else handleSearchByHash();
  }

  async function handleVerify() {
    if (!record) return;
    const ipId = record.ipId?.toNumber();
    setVerifyStatus("pending");
    setVerifyError(null);
    try {
      const signer = await getSigner();
      const contract = getContract(signer);
      const tx = await contract.verifyIPRecord(ipId);
      await tx.wait();
      setVerifyStatus("confirmed");
      const provider = await getProvider();
      const readContract = getContract(provider);
      const updated = await readContract.getIPDetails(ipId);
      setRecord(updated);
    } catch (err) {
      setVerifyStatus("failed");
      const reason = err?.reason || err?.data?.message || err?.message || "";
      if (reason.toLowerCase().includes("access") || reason.toLowerCase().includes("role")) {
        setVerifyError("You do not have the Verifier role. Contact the contract admin.");
      } else {
        setVerifyError(`Verification failed: ${reason}`);
      }
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <div className="animate-fade-in-up">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 mb-4 shadow-sm">
            Public Access
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Verify & Search</h1>
          <p className="text-gray-500 text-sm">Look up any IP record by its ID or IPFS CID. No wallet required to search.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm mb-6">
          <div className="flex gap-2 mb-6">
            {[
              { key: "id", label: "Search by IP ID" },
              { key: "hash", label: "Search by IPFS Hash" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setMode(key); setInput(""); setRecord(null); setHashResult(null); setSearchError(null); }}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  mode === key ? "bg-black text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="search-input"
              type={mode === "id" ? "number" : "text"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={mode === "id" ? "Enter IP ID (e.g. 1)" : "Enter IPFS CID (e.g. QmXoyp…)"}
              className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition"
            />
            <button
              id="btn-search"
              onClick={handleSearch}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 text-sm font-semibold text-white transition-all flex items-center justify-center min-w-[120px]"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          {searchError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {searchError}
            </div>
          )}
        </div>

        {hashResult !== null && (
          <div className={`bg-white rounded-2xl p-6 mb-4 animate-fade-in-up border shadow-sm ${
            hashResult ? "border-green-200" : "border-red-200"
          }`}>
            <p className={`font-bold tracking-tight mb-1 ${hashResult ? "text-green-800" : "text-red-800"}`}>
              {hashResult ? "Hash is registered on-chain" : "Hash is NOT registered"}
            </p>
            <p className="text-xs text-gray-500 font-mono break-all">{input}</p>
          </div>
        )}

        {record && (
          <div className="space-y-4">
            <IPRecordCard
              record={record}
              walletAddress={walletAddress}
              onVerify={handleVerify}
              verifyStatus={verifyStatus}
            />
            {verifyError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {verifyError}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
