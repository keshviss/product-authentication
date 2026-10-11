import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import RegisterProduct from "./pages/RegisterProduct";
import VerifyProduct from "./pages/VerifyProduct";
import ProductDetails from "./pages/ProductDetails";
import BlockchainInfo from "./pages/BlockchainInfo";
import Certificate from "./pages/Certificate";
import { CONTRACT_ADDRESS } from "./utils/contract";
import AddressChip from "./components/AddressChip";

export default function App() {
  const { pathname } = useLocation();
  const isCertificatePage = pathname.startsWith("/certificate/");
  return (
    <>
      <Navbar />
      <main className={`container${isCertificatePage ? " certificate-route-container" : ""}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/register" element={<RegisterProduct />} />
          {/* Same page handles manual entry (/verify) and QR links (/verify/PROD1001) */}
          <Route path="/verify" element={<VerifyProduct />} />
          <Route path="/verify/:productId" element={<VerifyProduct />} />
          <Route path="/product/:productId" element={<ProductDetails />} />
          <Route path="/certificate/:productId" element={<Certificate />} />
          <Route path="/blockchain" element={<BlockchainInfo />} />
          <Route
            path="*"
            element={
              <div className="card" style={{ textAlign: "center", padding: "40px" }}>
                <h2>404 - Page Not Found</h2>
                <p style={{ color: "var(--muted)" }}>The requested page does not exist.</p>
              </div>
            }
          />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <strong>ProductChain</strong>
            <span className="footer-caption">Blockchain-Based Product Authenticity and Supply Chain Verification</span>
          </div>
          <div className="footer-network"><span className="connection-dot" /> Ganache local network</div>
          <div className="footer-contract">
            <span>Contract</span>
            <AddressChip address={CONTRACT_ADDRESS} />
          </div>
        </div>
      </footer>
    </>
  );
}
