import { BrowserProvider } from "ethers";

export const GANACHE_CHAIN_ID = 1337;

// MetaMask injects window.ethereum into the page
export function hasMetaMask() {
  return typeof window !== "undefined" && typeof window.ethereum !== "undefined";
}

// Shortens 0x90F8bf6A...c9C1 for display
export function shortAddress(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
}

// True if MetaMask is currently on the Ganache network
export async function isCorrectNetwork() {
  const provider = new BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();
  return Number(network.chainId) === GANACHE_CHAIN_ID;
}

// Asks MetaMask to connect: this opens the MetaMask popup
export async function connectWallet() {
  if (!hasMetaMask()) {
    throw new Error("MetaMask is not installed. Please install the MetaMask extension.");
  }
  const provider = new BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  if (!(await isCorrectNetwork())) {
    throw new Error("Wrong network. Switch MetaMask to 'Ganache Local' (chain ID 1337).");
  }
  return accounts[0];
}

// Checks for an already-approved account WITHOUT opening a popup
export async function getConnectedAccount() {
  if (!hasMetaMask()) return null;
  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  return accounts.length ? accounts[0] : null;
}