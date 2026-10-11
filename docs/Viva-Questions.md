# Viva preparation

## Questions and short answers

**1. What problem does the project solve?**
It gives the supply chain a shared record of product registration and status history that a customer can query by ID or QR.

**2. Why use blockchain instead of an ordinary database?**
A conventional database is simpler and faster, but one operator controls its records. A blockchain contract shares state and records authorized changes in an append-only ledger. This demo shows that property; it does not mean blockchain is always the better choice.

**3. What is a smart contract?**
It is code deployed to an EVM chain. Here it stores product data and applies role and lifecycle rules whenever a transaction calls it.

**4. What role does Ganache play?**
Ganache runs a local Ethereum-compatible chain with deterministic funded test accounts. Its data is temporary and disappears when the node is restarted.

**5. What does MetaMask do?**
MetaMask holds the selected account's signing key and asks the user to approve a transaction. The private key does not go to the React app or contract.

**6. How are writes different from reads?**
Registration and status updates use ethers `BrowserProvider` with a MetaMask signer and create transactions. Verification and listing use `JsonRpcProvider` and contract view functions; they are read-only and do not need a wallet.

**7. What is a transaction hash?**
It identifies a submitted transaction. It is returned by the provider/receipt and can be compared with the emitted contract event. The contract itself does not know its transaction hash while executing.

**8. How is a Product ID verified?**
The UI calls `verifyProduct(id)`. If true, it reads the product and history from the same deployed contract. An absent ID produces a not-verified result; a node error produces a separate connection error.

**9. How does the QR code work?**
The generated image encodes the web route `/verify/<ProductID>`. Scanning opens the verification page, which then queries the contract. The QR contains a link, not a trusted product certificate.

**10. Where does the history come from?**
The contract appends status, updater address and timestamp to a per-product history array. The contract also emits events that the dashboard and Blockchain Info page query.

**11. How are duplicates prevented?**
Before writing, the UI checks `verifyProduct`. The contract also checks `products[id].exists`, so a modified UI cannot bypass uniqueness.

**12. How is access control enforced?**
The contract reads `msg.sender` from the signed transaction, checks the stored role, manufacturer ownership and next status. Frontend checks are only a usability aid; the contract is authoritative.

**13. What happens for a fake or unregistered ID?**
`verifyProduct` returns false and the UI shows “PRODUCT NOT VERIFIED”. This proves only that the ID was not found in this contract's records.

**14. Does a green result prove the physical item is genuine?**
No. It confirms that the ID matches a manufacturer-registered blockchain record. A QR can be copied, and false input at registration is still preserved. Inspection or tamper-resistant labels are separate controls.

**15. What happens if someone edits the frontend?**
They may change what the UI displays, but a write transaction still reaches the deployed contract and must pass its authorization and lifecycle checks. Users should still use a trusted app URL because a malicious UI can mislead them.

**16. Why use events?**
Events make contract actions searchable in transaction logs and provide a practical audit trail without using a large UI-side database. Product history is also explicitly stored in contract state for direct reads.

**17. What is on-chain and off-chain?**
Product records, roles, state and history are on-chain. The QR PNG and temporary UI state are browser-side. Transaction hashes, blocks and timestamps are recovered from events and block data.

**18. What if Ganache restarts?**
Ganache's in-memory chain is reset. Start it, redeploy, seed if needed, and update MetaMask's local account activity if a nonce mismatch appears.

**19. What are the limitations?**
This is one local node; it does not prove the product's physical authenticity or data truth. On-chain strings cost gas, QR codes can be copied, and role assignment needs real identity governance in production.

**20. What future improvements are possible?**
Testnet deployment, tamper-evident QR/NFC, IoT tracking, signed manufacturer documents, IPFS references, mobile support and stronger participant identity are reasonable future work.

## Suggested three-person presentation split

- **Member 1 — Contract:** roles, `require` rules, status sequence, events, and the eight Hardhat tests.
- **Member 2 — Frontend:** responsive pages, validation, dashboard, QR scan/generation, verification result and its honest disclaimer.
- **Member 3 — Integration/demo:** Ganache, deploy/seed, MetaMask signing, ethers read/write providers, event-derived transaction metadata and troubleshooting.

Each member should be ready to explain the difference between an on-chain write transaction and a no-wallet view call.
