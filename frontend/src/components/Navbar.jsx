import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

function truncateAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const NAV_LINKS = [
  { to: "/", label: "Dashboard" },
  { to: "/register", label: "Register IP" },
  { to: "/verify", label: "Verify & Search" },
  { to: "/manage", label: "Manage" },
];

export default function Navbar({ walletAddress, connectWallet, disconnectWallet }) {
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black transition-colors">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight text-gray-900">IProtect</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {walletAddress ? (
            <div className="relative" ref={dropdownRef}>
              <button
                id="wallet-menu-btn"
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gray-100 border border-gray-200 text-gray-900 hover:bg-gray-200 transition-all duration-200"
              >
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {truncateAddress(walletAddress)}
                <svg
                  className={`h-3 w-3 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden animate-fade-in-up">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">Connected wallet</p>
                    <p className="font-mono text-xs text-gray-900 break-all">{walletAddress}</p>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(walletAddress);
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
                  >
                    Copy Address
                  </button>

                  <button
                    id="btn-disconnect"
                    onClick={() => {
                      disconnectWallet();
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition text-left border-t border-gray-100"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              id="btn-connect-wallet"
              onClick={connectWallet}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium bg-black hover:bg-gray-800 text-white transition-all duration-200"
            >
              Connect Wallet
            </button>
          )}

        </div>

        <div className="flex md:hidden gap-1 pb-2 overflow-x-auto">
          {NAV_LINKS.map(({ to, label }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
