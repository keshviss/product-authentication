# ProductChain — Product Authenticity and Supply Chain Verification

A beginner-friendly blockchain mini project. Manufacturers register product records on an Ethereum-compatible chain; authorized supply-chain roles advance the lifecycle; customers can verify the record and history by ID or QR code without connecting a wallet.

## Requirements

- macOS with Node.js and npm. Hardhat 2 is used; Node 20 LTS is recommended. Hardhat may warn on newer Node versions.
- MetaMask for transaction signing.
- Ganache CLI, included in `blockchain` dependencies.

## Start from a fresh local chain

Open three Terminal tabs. Commands must run from the folder shown.

**Terminal 1 — start the deterministic local chain**

```sh
cd ~/product-authentication/blockchain
npm install
npm run chain
```

Keep this terminal running. Ganache stores state in memory; stopping it erases this chain.

**Terminal 2 — deploy the contract and optionally seed demo records**

```sh
cd ~/product-authentication/blockchain
npm run check
npm run deploy
npm run seed
```

`npm run deploy` writes the deployed address and ABI to `frontend/src/utils/contractInfo.json` and assigns the deterministic Distributor and Retailer accounts. `npm run seed` registers fictional `PROD1001`–`PROD1005` and advances four of them through the lifecycle. It intentionally leaves `PROD1001` at `MANUFACTURED` for a live demo. Seed transactions use local Ganache signers, not MetaMask. To demonstrate registration in the UI, use a new product ID.

**Terminal 3 — start the UI**

```sh
cd ~/product-authentication/frontend
npm install
npm run dev
```

Open <http://localhost:5173>.

## MetaMask setup

Use the navbar's **Setup** help button, or add this local network manually:

- Network: Ganache Local
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `1337`
- Currency: `ETH`

For local demos only, import the deterministic Ganache accounts shown in the Ganache terminal. Ganache test private keys are public and must never be used with real funds. The admin/manufacturer is account 0, distributor account 1, and retailer account 2. The UI reads roles from the contract. A wallet is only needed for write actions; verification is read-only.

After every Ganache restart, repeat `npm run deploy` (and optionally `npm run seed`). If MetaMask reports a nonce error, open MetaMask **Settings → Advanced → Clear activity tab data** for the affected local account.

## Demo sequence

1. Start Ganache, deploy, and seed as above.
2. Open the dashboard to show live totals, product statuses, transaction hashes, and recent contract events.
3. In MetaMask, connect account 0 and register a new product. Confirm the transaction and show its hash, mined block, and generated QR code.
4. Open `/verify/<PRODUCT_ID>` in an Incognito window without MetaMask. Show **AUTHENTIC PRODUCT**, its status and history. This is a read-only query to Ganache.
5. Switch to the account authorized for the next lifecycle step. Update status and confirm the signed transaction. Verify again to show the refreshed history.
6. Verify an unused ID and show **PRODUCT NOT VERIFIED**. Stop Ganache or disconnect the RPC to show the distinct **Cannot reach blockchain** error.
7. Open product details for the CSV export and printable certificate.

## Project checks

```sh
cd ~/product-authentication/blockchain
npm test
npm run compile
```

The Hardhat tests use an in-memory test chain; Ganache does not need to be running for `npm test`.

```sh
cd ~/product-authentication/frontend
npm run build
```

## Data flow and honest claims

- **Write path:** React → ethers `BrowserProvider` signer → MetaMask confirmation → contract → Ganache. Registration and status updates are signed transactions.
- **Read path:** React → ethers `JsonRpcProvider` → contract view methods and event logs. It needs no wallet and submits no transaction.
- Product records, roles, status and history are on-chain. Registration transaction hashes, blocks and timestamps are reconstructed from `ProductRegistered` logs and block data. QR images and view state are generated in the browser. There is no application database or backend.
- Verification confirms that the Product ID matches a manufacturer-registered blockchain record. It does **not** prove the physical item is genuine. QR codes can be copied, and the chain cannot guarantee that the manufacturer originally entered truthful data; it prevents silent changes to the recorded data after registration.

## Common fixes

| Symptom | Fix |
| --- | --- |
| Smart contract unreachable | Keep Ganache running on port 8545, then deploy from `blockchain/`. |
| Contract address changed after restart | Re-run deploy; it updates `contractInfo.json`. |
| Wrong network in MetaMask | Switch to Ganache Local, chain ID 1337. |
| MetaMask nonce too high | Clear local activity data for that account after restarting Ganache. |
| `ENOENT package.json` / missing script | `cd` into `blockchain/` for chain/deploy/test, or `frontend/` for dev/build. |
| Vite says port 5173 is occupied | Use the already-running Vite server or stop the old process before starting another. |
| Camera QR scanning unavailable | Use HTTPS or localhost and allow camera permission in the browser. Manual ID verification still works. |
| Phone cannot scan a localhost QR | Use laptop LAN host with Vite `--host`; configure the RPC endpoint for a reachable LAN address too. Current default RPC URL is loopback, intended for same-machine demos. |

## Folders

- `blockchain/` — Solidity contract, Hardhat tests, deploy, and seed scripts.
- `frontend/` — React/Vite UI and ethers integration.
- `docs/` — report outline and viva notes.
