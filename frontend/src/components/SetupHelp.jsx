import { useState } from "react";
import { hasMetaMask } from "../utils/blockchain";
import { useToast } from "../context/ToastContext";

const GANACHE_CHAIN_ID_HEX = "0x539";

export default function SetupHelp({ open, onClose }) {
  const [working, setWorking] = useState(false);
  const toast = useToast();
  if (!open) return null;

  async function addOrSwitchNetwork() {
    if (!hasMetaMask()) { toast("Install MetaMask, then use the network setup button again.", "error"); return; }
    setWorking(true);
    try {
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: GANACHE_CHAIN_ID_HEX }] });
      } catch (error) {
        if (error.code !== 4902) throw error;
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: GANACHE_CHAIN_ID_HEX,
            chainName: "Ganache Local",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["http://127.0.0.1:8545"],
          }],
        });
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: GANACHE_CHAIN_ID_HEX }] });
      }
      toast("MetaMask is connected to Ganache Local.", "success");
      onClose();
    } catch (error) {
      toast(error.code === 4001 ? "Network change was cancelled in MetaMask." : error.message || "Could not switch to Ganache Local.", "error");
    } finally { setWorking(false); }
  }

  return <div className="help-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="setup-help-title"><button type="button" className="help-modal-close" onClick={onClose} aria-label="Close setup help">×</button><span className="eyebrow">NETWORK SETUP</span><h2 id="setup-help-title">Connect MetaMask to Ganache</h2><p>Ganache must be running locally before MetaMask can connect to this development network.</p><ol><li>Start the Ganache workspace on port <code>8545</code>.</li><li>Use the button below to add or switch MetaMask to <strong>Ganache Local</strong>.</li><li>In MetaMask, import a Ganache test account using its private key, then choose the account you need for the next supply-chain step.</li></ol><div className="setup-network-details"><span>RPC URL <code>http://127.0.0.1:8545</code></span><span>Chain ID <code>1337</code></span><span>Currency <code>ETH</code></span></div><button type="button" className="btn btn-primary" onClick={addOrSwitchNetwork} disabled={working}>{working ? "Waiting for MetaMask…" : "Add / switch to Ganache"}</button><p className="form-help">This requests a local network change in MetaMask. Product reads remain available without a wallet.</p></section></div>;
}
