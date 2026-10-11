import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { hasMetaMask, shortAddress } from "../utils/blockchain";
import SetupHelp from "./SetupHelp";
import {
  Link as LinkIcon,
  LayoutDashboard,
  PackagePlus,
  ShieldCheck,
  Info,
  Sun,
  Moon,
  Wallet,
  AlertTriangle,
  Menu,
  X,
  HelpCircle,
} from "lucide-react";

// Returns active/inactive class for nav links
function navClass({ isActive }) {
  return `nav-link${isActive ? " active" : ""}`;
}

export default function Navbar() {
  const { account, networkOk, connecting, error, connect, role, contractOk } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // Initialise dark-mode state from the OS preference
  const [dark, setDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
  );

  // Only Manufacturers may register products
  const canRegister = role === "Manufacturer";

  function toggleTheme() {
    const nextDark = !dark;
    setDark(nextDark);
    // data-theme on <html> activates the [data-theme="dark"] CSS variables
    document.documentElement.dataset.theme = nextDark ? "dark" : "light";
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  // ---------- wallet pill --------------------------------------------------
  let walletContent;
  if (!hasMetaMask()) {
    walletContent = (
      <span className="wallet-pill wallet-bad">
        <span className="connection-dot" />
        MetaMask not found
      </span>
    );
  } else if (account && !networkOk) {
    walletContent = (
      <span className="wallet-pill wallet-bad">
        <span className="connection-dot" />
        Wrong network
      </span>
    );
  } else if (account) {
    walletContent = (
      <span className="wallet-pill" title={account}>
        <span className="connection-dot" />
        <Wallet size={12} aria-hidden="true" />
        <code>{shortAddress(account)}</code>
        <span className="role-tag">{role || "Checking role…"}</span>
      </span>
    );
  } else {
    walletContent = (
      <button className="btn btn-primary wallet-btn" onClick={connect} disabled={connecting}>
        <Wallet size={14} aria-hidden="true" />
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  return (
    <>
      <header className="navbar">
        <div className={`navbar-inner${menuOpen ? " menu-open" : ""}`}>
          {/* Brand / Logo */}
          <NavLink to="/" className="brand" onClick={closeMenu} aria-label="ProductChain home">
            <LinkIcon size={20} className="brand-mark" aria-hidden="true" />
            ProductChain
          </NavLink>

          {/* Hamburger (mobile only) */}
          <button
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Primary nav links */}
          <nav
            id="primary-navigation"
            className={`nav-links${menuOpen ? " is-open" : ""}`}
            aria-label="Main navigation"
          >
            <NavLink to="/" end className={navClass} onClick={closeMenu}>
              <LayoutDashboard size={15} aria-hidden="true" /> Home
            </NavLink>
            <NavLink to="/dashboard" className={navClass} onClick={closeMenu}>
              <LayoutDashboard size={15} aria-hidden="true" /> Dashboard
            </NavLink>

            {/* Register is only clickable for Manufacturers */}
            {canRegister ? (
              <NavLink to="/register" className={navClass} onClick={closeMenu}>
                <PackagePlus size={15} aria-hidden="true" /> Register
              </NavLink>
            ) : (
              <span
                className="nav-link nav-link-disabled"
                title="Only a Manufacturer wallet can register products"
                aria-disabled="true"
              >
                <PackagePlus size={15} aria-hidden="true" /> Register{" "}
                <span aria-hidden="true" style={{ fontSize: "0.7em" }}>ⓘ</span>
              </span>
            )}

            {/* Verify is always highlighted for customers */}
            <NavLink
              to="/verify"
              className={({ isActive }) => `${navClass({ isActive })} nav-link-verify`}
              onClick={closeMenu}
            >
              <ShieldCheck size={15} aria-hidden="true" /> Verify
            </NavLink>

            <NavLink to="/blockchain" className={navClass} onClick={closeMenu}>
              <Info size={15} aria-hidden="true" /> Blockchain Info
            </NavLink>
          </nav>

          {/* Right-side actions: Setup help, theme toggle, wallet */}
          <div className="navbar-actions">
            <button
              className="help-trigger"
              type="button"
              onClick={() => setHelpOpen(true)}
              aria-label="Open Ganache setup help"
              title="Ganache setup help"
            >
              <HelpCircle size={16} aria-hidden="true" />
              <span className="help-trigger-label">Setup</span>
            </button>

            <button
              className="theme-toggle"
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
              title={`Switch to ${dark ? "light" : "dark"} theme`}
            >
              {dark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
              <span className="theme-toggle-label">{dark ? "Light" : "Dark"}</span>
            </button>

            {walletContent}
          </div>
        </div>
      </header>

      {/* Connection status strip – shown when Ganache or MetaMask has issues */}
      {(error || !networkOk || !contractOk) && (
        <div className={`connection-strip ${error ? "connection-error" : ""}`} role="status">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>
            {error ||
              (!networkOk
                ? "MetaMask is on the wrong network. Switch to Ganache Local (chain ID 1337)."
                : "Ganache or the smart contract is unreachable. Start Ganache, then run: cd blockchain && npx hardhat run scripts/deploy.js --network ganache")}
          </span>
        </div>
      )}

      <SetupHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
