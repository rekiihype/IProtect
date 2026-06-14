import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getProvider, getContract } from "../utils/contractUtils";

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-fade-in-up">
      <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
    </div>
  );
}

export default function Dashboard({ walletAddress }) {
  const [totalIPs, setTotalIPs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCount() {
      try {
        setLoading(true);
        const provider = await getProvider();
        const contract = getContract(provider);
        const count = await contract.getTotalIPCount();
        setTotalIPs(count.toNumber());
      } catch (err) {
        console.error("Failed to fetch IP count:", err);
        setError("Could not connect to contract. Ensure MetaMask is connected.");
      } finally {
        setLoading(false);
      }
    }

    fetchCount();
  }, []);

  function truncateAddress(address) {
    if (!address) return "Not connected";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">

      {/* Hero */}
      <div className="mb-16 text-center animate-fade-in-up">

        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-gray-900 mb-6">
          IProtect
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-500 leading-relaxed">
          Protect your creative works with tamper-proof blockchain records.
          Register your intellectual property permanently, publicly, and verifiably.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        <StatCard
          label="Total IPs Registered"
          value={loading ? "—" : error ? "N/A" : totalIPs}
        />
        <StatCard
          label="Connected Wallet"
          value={truncateAddress(walletAddress)}
        />
        <StatCard
          label="Network"
          value="Ethereum"
        />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-8 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {[
          {
            title: "Register IP",
            description: "Upload your file to IPFS and register its unique fingerprint on the blockchain. Immutable proof of ownership.",
            link: "/register",
            cta: "Register Now",
          },
          {
            title: "Verify & Search",
            description: "Look up any IP record by its ID or IPFS hash. View ownership history, timestamps, and verification status.",
            link: "/verify",
            cta: "Search Records",
          },
          {
            title: "Transfer & Manage",
            description: "Transfer ownership of your registered IPs or grant time-limited usage licences to other parties.",
            link: "/manage",
            cta: "Manage IPs",
          },
        ].map(({ title, description, link, cta }) => (
          <div
            key={title}
            className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in-up flex flex-col group"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-3 tracking-tight">{title}</h2>
            <p className="text-gray-500 leading-relaxed mb-6 flex-grow">{description}</p>
            <Link
              to={link}
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              {cta}
              <svg className="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-sm animate-fade-in-up">
        <h2 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Ready to protect your work?</h2>
        <p className="text-gray-500 mb-8 max-w-xl mx-auto text-lg">
          Connect your wallet and register your first IP record in under 2 minutes.
        </p>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 rounded-full bg-black hover:bg-gray-800 text-white font-semibold px-8 py-3.5 transition-all duration-200"
        >
          Register Your IP
        </Link>
      </div>

    </main>
  );
}
