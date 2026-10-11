/**
 * Converts low-level ethers.js / MetaMask RPC error objects into user-friendly messages.
 * @param {any} err - The caught error
 * @returns {string} - Human-readable explanation
 */
export function parseContractError(err) {
  if (!err) return "An unexpected error occurred.";

  // 1. User canceled in MetaMask
  if (err.code === 4001 || err.code === "ACTION_REJECTED") {
    return "Transaction was rejected in MetaMask by user.";
  }

  // 2. Pending request already open
  if (err.code === -32002) {
    return "A MetaMask request is already open. Please open your MetaMask popup to continue.";
  }

  const rawMsg = String(err.reason || err.shortMessage || err.message || "");

  // 3. Smart contract revert messages
  if (rawMsg.includes("Only a manufacturer can do this")) {
    return "Access Denied: Only accounts with the Manufacturer role can register products.";
  }
  if (rawMsg.includes("Product ID already registered")) {
    return "Duplicate Error: This Product ID already exists permanently on the blockchain.";
  }
  if (rawMsg.includes("Product ID is required")) {
    return "Validation Error: Product ID cannot be empty.";
  }
  if (rawMsg.includes("Product name is required")) {
    return "Validation Error: Product name cannot be empty.";
  }
  if (rawMsg.includes("Product not found")) {
    return "Not Found: No blockchain record exists for this Product ID.";
  }
  if (rawMsg.includes("Invalid status transition")) {
    return "State Machine Violation: You cannot skip stages or go backward. Only the next sequential status is allowed.";
  }
  if (rawMsg.includes("Not authorized for this status update")) {
    return "Access Denied: Your connected role is not authorized to move the product to this stage.";
  }
  if (rawMsg.includes("Only admin can do this")) {
    return "Access Denied: Only the smart contract deployer/admin can perform this action.";
  }
  if (rawMsg.includes("Admin role cannot be changed")) {
    return "Admin Error: The deployer admin role cannot be reassigned.";
  }

  // 4. Nonce mismatch (frequent when Ganache restarts)
  if (rawMsg.toLowerCase().includes("nonce")) {
    return "MetaMask Nonce Mismatch: Ganache was restarted. In MetaMask, open Settings > Advanced > Clear activity tab data.";
  }

  // 5. Gas / funds issues
  if (rawMsg.toLowerCase().includes("insufficient funds")) {
    return "Insufficient Funds: Your account does not have enough ETH to pay for transaction gas fees.";
  }

  // 6. Network issues
  if (rawMsg.toLowerCase().includes("network") || rawMsg.toLowerCase().includes("econnrefused")) {
    return "Connection Error: Cannot communicate with the Ganache blockchain on http://127.0.0.1:8545.";
  }

  // Return shortest clean explanation if available
  return err.reason || err.shortMessage || err.message || "Transaction failed.";
}
