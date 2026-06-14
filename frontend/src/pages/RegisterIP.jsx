import { useState } from "react";
import TransactionStatus from "../components/TransactionStatus";
import { getSigner, getContract } from "../utils/contractUtils";

async function uploadToIPFS(file) {
  if (!import.meta.env.VITE_PINATA_JWT) {
    throw new Error(
      "Pinata JWT is not configured. Add VITE_PINATA_JWT=your_token to frontend/.env"
    );
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(`Pinata upload failed: ${response.status} ${errData?.error?.details ?? response.statusText}`);
  }

  const data = await response.json();
  return data.IpfsHash;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RegisterIP() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);

  const [ipfsHash, setIpfsHash] = useState(null);
  const [ipfsStatus, setIpfsStatus] = useState("idle");
  const [txStatus, setTxStatus] = useState("idle");

  const [registeredId, setRegisteredId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  async function handleIPFSUpload() {
    if (!file) return;
    setIpfsStatus("uploading");
    setErrorMsg(null);
    try {
      const hash = await uploadToIPFS(file);
      setIpfsHash(hash);
      setIpfsStatus("done");
    } catch (err) {
      console.error(err);
      setErrorMsg(`IPFS upload failed: ${err.message}`);
      setIpfsStatus("error");
    }
  }

  async function handleRegister() {
    if (!title.trim()) {
      setErrorMsg("Title cannot be empty.");
      return;
    }
    if (!ipfsHash) {
      setErrorMsg("Please upload the file to IPFS first.");
      return;
    }

    setTxStatus("pending");
    setErrorMsg(null);
    try {
      const signer = await getSigner();
      const contract = getContract(signer);
      const tx = await contract.registerIP(title.trim(), description.trim(), ipfsHash);
      const receipt = await tx.wait();

      const event = receipt.events?.find((e) => e.event === "IPRegistered");
      const ipId = event?.args?.ipId?.toNumber();
      setRegisteredId(ipId ?? "Confirmed");

      setTxStatus("confirmed");
    } catch (err) {
      console.error(err);
      const reason = err?.reason || err?.data?.message || err?.message || "Unknown error";
      setErrorMsg(`Registration failed: ${reason}`);
      setTxStatus("failed");
    }
  }

  function handleFileChange(e) {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setIpfsHash(null);
      setIpfsStatus("idle");
      setTxStatus("idle");
      setRegisteredId(null);
      setErrorMsg(null);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
      <div className="animate-fade-in-up">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 mb-4 shadow-sm">
            Creator Role
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Register IP Asset</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Upload your file to IPFS, then register its unique fingerprint on the Ethereum blockchain.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-6">

          <div>
            <label htmlFor="ip-title" className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="ip-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. My Digital Artwork Series"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition"
            />
          </div>

          <div>
            <label htmlFor="ip-description" className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="ip-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your work…"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File <span className="text-red-500">*</span>
            </label>
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-36 rounded-xl border-2 border-dashed border-gray-300 hover:border-black bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors group"
            >
              {file ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatFileSize(file.size)}</p>
                  <p className="text-xs text-blue-600 mt-2 font-medium">Click to change file</p>
                </div>
              ) : (
                <div className="text-center">
                  <svg className="mx-auto h-8 w-8 text-gray-400 mb-2 group-hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-600 font-medium">Click to select a file</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, image, audio, or any format</p>
                </div>
              )}
              <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          <button
            id="btn-upload-ipfs"
            onClick={handleIPFSUpload}
            disabled={!file || ipfsStatus === "uploading" || ipfsStatus === "done"}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 border border-gray-200 hover:border-black text-gray-900"
          >
            {ipfsStatus === "uploading" && "Uploading to IPFS..."}
            {ipfsStatus === "done" && `Uploaded — CID: ${ipfsHash?.slice(0, 12)}…`}
            {(ipfsStatus === "idle" || ipfsStatus === "error") && "Step 1 — Upload File to IPFS"}
          </button>

          <button
            id="btn-register-blockchain"
            onClick={handleRegister}
            disabled={!ipfsHash || txStatus === "pending" || txStatus === "confirmed"}
            className="w-full rounded-xl bg-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white transition-all duration-200"
          >
            {txStatus === "pending" ? "Registering..." : "Step 2 — Register on Blockchain"}
          </button>

          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMsg}
            </div>
          )}

          <TransactionStatus status={txStatus} />

          {txStatus === "confirmed" && registeredId !== null && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
              <h2 className="text-lg font-bold text-green-800 mb-1 tracking-tight">Registration Complete</h2>
              <p className="text-sm text-green-700 mb-4">
                Your IP has been assigned <strong className="font-semibold">ID #{registeredId}</strong>
              </p>
              {ipfsHash && (
                <div className="rounded-xl border border-green-200 bg-white px-4 py-3 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">IPFS CID</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(ipfsHash)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium transition"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="font-mono text-sm text-gray-900 break-all leading-relaxed">{ipfsHash}</p>
                  <a
                    href={`https://ipfs.io/ipfs/${ipfsHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    View file on IPFS
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
