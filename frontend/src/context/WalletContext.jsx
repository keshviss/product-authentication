import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  connectWallet, getConnectedAccount, hasMetaMask, isCorrectNetwork,
} from "../utils/blockchain";
import { getRole, isContractDeployed } from "../utils/contract";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [networkOk, setNetworkOk] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState(null);          // NEW: role read from the contract
  const [contractOk, setContractOk] = useState(true); // NEW: is the contract deployed?

  const connect = useCallback(async () => {
    setError("");
    setConnecting(true);
    try {
      const acc = await connectWallet();
      setAccount(acc);
      setNetworkOk(true);
    } catch (e) {
      if (e.code === 4001) setError("Connection rejected in MetaMask.");
      else if (e.code === -32002) setError("MetaMask request already open. Check the extension popup.");
      else setError(e.message || "Could not connect wallet.");
    } finally {
      setConnecting(false);
    }
  }, []);

  // Check once that the contract exists on the chain
  useEffect(() => {
    isContractDeployed().then(setContractOk).catch(() => setContractOk(false));
  }, []);

  // Read the role from the blockchain whenever the account changes
  useEffect(() => {
    let cancelled = false;
    if (!account || !contractOk) { setRole(null); return; }
    getRole(account)
      .then((r) => { if (!cancelled) setRole(r); })
      .catch(() => { if (!cancelled) setRole(null); });
    return () => { cancelled = true; };
  }, [account, contractOk]);

  useEffect(() => {
    if (!hasMetaMask()) return;

    getConnectedAccount().then(async (acc) => {
      setAccount(acc);
      if (acc) setNetworkOk(await isCorrectNetwork());
    });

    const onAccountsChanged = (accs) => setAccount(accs.length ? accs[0] : null);
    const onChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum.removeListener("chainChanged", onChainChanged);
    };
  }, []);

  return (
    <WalletContext.Provider
      value={{ account, networkOk, connecting, error, connect, role, contractOk }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);