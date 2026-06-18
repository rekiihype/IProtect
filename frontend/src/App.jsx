import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import WalletBanner from "./components/WalletBanner";
import Dashboard from "./pages/Dashboard";
import RegisterIP from "./pages/RegisterIP";
import VerifySearch from "./pages/VerifySearch";
import TransferManage from "./pages/TransferManage";
import { useWallet } from "./hooks/useWallet";

function App() {
  // useWallet is called at App level so wallet state is shared across all pages
  const { walletAddress, isCorrectNetwork, connectWallet, disconnectWallet } = useWallet();

  return (
    <BrowserRouter>
      {/* Navbar and WalletBanner appear on every page */}
      <Navbar walletAddress={walletAddress} connectWallet={connectWallet} disconnectWallet={disconnectWallet} />
      <WalletBanner walletAddress={walletAddress} isCorrectNetwork={isCorrectNetwork} />

      <Routes>
        <Route path="/" element={<Dashboard walletAddress={walletAddress} />} />
        <Route path="/register" element={<RegisterIP />} />
        {/* VerifySearch gets walletAddress to show/hide the Verify button */}
        <Route path="/verify" element={<VerifySearch walletAddress={walletAddress} />} />
        {/* TransferManage gets walletAddress to fetch owned IPs and redirect if not connected */}
        <Route path="/manage" element={<TransferManage walletAddress={walletAddress} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
