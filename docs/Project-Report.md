# Blockchain-Based Product Authenticity and Supply Chain Verification System

## 1. Abstract

This project is a local decentralized application for recording product identities and supply-chain lifecycle updates on an Ethereum-compatible blockchain. Manufacturers register product details through a Solidity smart contract. Authorized manufacturers, distributors and retailers advance the product through a fixed status sequence. Customers can query the record and its history using a Product ID or QR code without a wallet. MetaMask signs write transactions; ethers.js uses a read-only JSON-RPC provider for verification. The project demonstrates how a blockchain makes recorded history tamper-resistant while acknowledging that it cannot establish the physical item's genuineness or the truth of data at entry.

## 2. Problem statement

Customers and supply-chain participants often lack a shared, auditable history for product identity and custody stages. A counterfeit or unregistered Product ID is difficult to check when each participant has a separate record system.

## 3. Motivation

A shared ledger can give participants a common view of registration and status events. QR labels offer a convenient lookup path, while a no-wallet read path keeps customer verification simple.

## 4. Objectives

- Register a unique product identity and product details on-chain.
- Enforce roles and the next valid lifecycle transition in the contract.
- Let customers verify IDs and inspect history without MetaMask.
- Show event logs, transaction hashes, block numbers and timestamps.
- Provide a responsive, accessible interface suitable for a classroom demonstration.

## 5. Scope

The implementation runs locally using Ganache chain ID 1337, Hardhat 2, Solidity 0.8.24, React/Vite and ethers v6. It demonstrates a single contract and a fictional sample catalog. It is not a production identity service, real supply-chain network or public-chain deployment.

## 6. Existing approaches and proposed solution

Conventional centralized databases can provide useful access control but require one operator to control the shared record. This project places state transitions and product records in a contract with explicit authorization rules and exposes read-only lookup to all users. Blockchain is used for the shared audit trail, not as a replacement for physical inspection or trustworthy manufacturing controls.

## 7. System requirements

**Hardware:** A laptop capable of running Node.js, Ganache, a browser and MetaMask.

**Software:** macOS, Node/npm, Ganache CLI, MetaMask, Hardhat 2.x, Solidity 0.8.24, React, Vite, React Router, ethers v6, `qrcode.react`, and `html5-qrcode`.

## 8. High-level architecture

```text
Manufacturer / Distributor / Retailer
  React form → ethers BrowserProvider → MetaMask signature → ProductAuthenticity → Ganache

Customer / Dashboard
  React view → ethers JsonRpcProvider → contract view methods and event logs → Ganache
```

Writes and reads are separate. The write path needs an authorized signer; the read path needs no wallet.

## 9. Technology choices

- **Solidity:** contract state, role checks and lifecycle rules.
- **Hardhat:** compile, test, deploy and seed tasks.
- **Ganache:** deterministic local EVM and test accounts.
- **React + Vite:** interactive client application and development server.
- **ethers v6:** BrowserProvider signing and JsonRpcProvider reads.
- **MetaMask:** explicit transaction signing by the user's selected account.
- **QR libraries:** generate verification links and scan them through a browser camera.
- **Plain CSS:** shared variables, responsive layout and accessible UI without a component kit.

## 10. Smart contract design

`ProductAuthenticity` stores `Product` records keyed by unique string ID, the admin address, role mapping, product ID list and per-product history. It emits `RoleAssigned`, `ProductRegistered` and `ProductStatusUpdated`. `exists` distinguishes a missing record from a default-valued struct. `require` checks authorization, required input, uniqueness, existence and sequential status advancement. The contract is unchanged for this UI work.

## 11. Roles and access control

Role enum values are `None=0`, `Manufacturer=1`, `Distributor=2`, and `Retailer=3`. The contract deployer is the Manufacturer/admin. Only the admin assigns roles. A product's registering Manufacturer can dispatch it. Manufacturer or Distributor can record `IN_TRANSIT`; Distributor records `AT_DISTRIBUTOR`; Retailer records `AT_RETAILER` and `SOLD`. The contract rechecks authorization even if a user edits the frontend.

## 12. Product lifecycle

`MANUFACTURED → DISPATCHED → IN_TRANSIT → AT_DISTRIBUTOR → AT_RETAILER → SOLD`

The contract only accepts the immediate next enum value. A skipped, repeated or backward stage reverts.

## 13. Data model

Product record fields: Product ID, name, brand, model, batch, manufacturing date, category, description, manufacturer address, creation timestamp, current status and existence flag. A history entry stores status, updater address and timestamp. Role and lifecycle enums are represented as numbers in JavaScript and translated for display.

## 14. On-chain, event and browser data

Product data, roles, current status and lifecycle history are contract state. Events record searchable registration and status activity. A contract cannot store its own transaction hash; the UI gets hashes and block numbers from event logs and reads block timestamps from the provider. QR images and component state are browser-side. There is no database, backend or localStorage data store.

## 15. Product registration workflow

The Manufacturer enters eight fields. The frontend trims and validates the input, queries the contract for a duplicate ID, asks MetaMask to sign `registerProduct`, and waits for the receipt. The success view displays the Product ID, status, hash, block and QR link. A rejected or reverted transaction is reported with a friendly explanation. The contract remains the final authority.

## 16. Product verification workflow

The user types an ID or scans a QR that opens `/verify/<ID>`. The frontend calls `verifyProduct`; if present, it reads `getProduct` and `getProductHistory`. A green result means a record exists. A red result means the queried ID does not exist in this contract. An RPC/contract error is shown separately as a blockchain connection problem. These reads do not prompt for a wallet or send a transaction.

## 17. QR code and certificate

The QR encodes the app's `/verify/<ProductID>` route, not product data. Download and print controls are available. A certificate route reads product and registration event data, shows the QR, block, timestamp, contract and transaction hashes, and supports browser print or Save as PDF.

## 18. Dashboard and Blockchain Info

The dashboard reads the product index and status, calculates counts and a CSS-only status distribution, and offers search, filtering, pagination and table/card views. A recent activity list is derived from contract events; a timed read refreshes the displayed data. Blockchain Info shows contract/admin/network fields and emitted event records.

## 19. Security and integrity notes

The contract derives the sender from a signed transaction, checks permissions, rejects duplicate IDs and enforces the lifecycle. Read methods are public and do not need a private key. Ganache test keys are public and local-only. Contract rules protect contract state, not a modified browser UI, the physical label or false statements entered at registration.

## 20. Testing and validation

The Hardhat suite covers valid registration, duplicate rejection, existing/nonexistent verification, unauthorized registration, the authorized full lifecycle, invalid/unauthorized updates and admin-only role assignment (8 passing tests). The frontend production build was checked. Manual browser walkthroughs covered the populated dashboard, wallet-free sample verification/history, product details and print certificate route. Camera permission, a real MetaMask prompt and wallet-signed UI transactions should be manually exercised in Chrome with MetaMask installed.

## 21. Results and limitations

The local demo demonstrates transparent status history and on-chain reads/writes. It does not prove that a physical item is genuine, that the manufacturer entered true data, or that a QR was not copied. Ganache is one in-memory local node, not a decentralized production network. Public-chain deployment would incur gas; on-chain strings are costly; identity assignment requires stronger real-world governance.

## 22. Future scope

Possible future work includes a public testnet, Hyperledger Fabric for permissioned consortiums, tamper-evident QR/NFC labels, IoT tracking, signed manufacturing documents, IPFS references, mobile support, analytics, multiple manufacturers and stronger identity/authorization controls. Recall flags and custody handovers require contract changes, tests and redeployment and are not part of this version.

## 23. Team contribution and conclusion

- **Member 1:** Solidity contract, role authorization, events and Hardhat tests.
- **Member 2:** React pages, dashboard, forms, verification UI, timeline and QR presentation.
- **Member 3:** Ganache/MetaMask setup, ethers integration, deployment, seed flow and documentation.

The project illustrates a practical split between signed state changes and free read-only verification. It is a teaching demonstration of contract-enforced rules and event-based auditability, with clear limits around physical authenticity and data quality.
