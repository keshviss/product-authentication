import { JsonRpcProvider, BrowserProvider, Contract } from "ethers";
import contractInfo from "./contractInfo.json"; // written by blockchain/scripts/deploy.js
import { GANACHE_CHAIN_ID } from "./blockchain";

export const CONTRACT_ADDRESS = contractInfo.address;
export const RPC_URL = "http://127.0.0.1:8545";

// Same order as the Solidity enums
export const ROLE_NAMES = ["Customer", "Manufacturer", "Distributor", "Retailer"];
export const STATUS_NAMES = [
  "MANUFACTURED", "DISPATCHED", "IN_TRANSIT", "AT_DISTRIBUTOR", "AT_RETAILER", "SOLD",
];

// READ-ONLY provider: talks straight to Ganache, so customers need NO wallet
// Memoized to create once and reuse across calls
let readProvider = null;
export function getReadProvider() {
  if (!readProvider) {
    readProvider = new JsonRpcProvider(RPC_URL, GANACHE_CHAIN_ID, { staticNetwork: true });
  }
  return readProvider;
}

// Contract object for reading (verify, history, roles). Free, no signature.
// Memoized to avoid creating a new Contract instance on every read.
let readContract = null;
export function getReadContract() {
  if (!readContract) {
    readContract = new Contract(CONTRACT_ADDRESS, contractInfo.abi, getReadProvider());
  }
  return readContract;
}

// Contract object for writing (register, update status). MetaMask signs each call.
export async function getWriteContract() {
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new Contract(CONTRACT_ADDRESS, contractInfo.abi, signer);
}

// Is there really a contract at this address? (false after a Ganache restart)
export async function isContractDeployed() {
  const code = await getReadProvider().getCode(CONTRACT_ADDRESS);
  return code !== "0x";
}

// Reads the role mapping from the blockchain
export async function getRole(address) {
  const roleNumber = await getReadContract().roles(address);
  return ROLE_NAMES[Number(roleNumber)];
}