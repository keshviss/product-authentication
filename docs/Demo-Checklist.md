# Demo script and project-report screenshots

## Live demonstration (19 steps)

1. Start Ganache with `npm run chain` from `blockchain/` and keep it open.
2. Add/switch MetaMask to Ganache Local (RPC `http://127.0.0.1:8545`, chain ID `1337`).
3. Deploy the contract with `npm run deploy` from `blockchain/`.
4. Start Vite from `frontend/` with `npm run dev`, then open `http://localhost:5173`.
5. Connect the Manufacturer/admin account (Ganache account 0) in MetaMask.
6. Open Register and submit a new unique product. For a repeatable demo, do not reuse an ID already seeded.
7. Confirm the registration transaction in MetaMask.
8. Show the transaction hash, confirmed block number and success stage on the registration result.
9. Show the generated QR code and download or print it.
10. Open the QR verification URL in an Incognito window with no MetaMask account connected.
11. Enter or scan the Product ID.
12. Show that the product details came from the contract over the read-only provider.
13. Show the green “AUTHENTIC PRODUCT” result.
14. Show the on-chain supply-chain timeline; seeded `PROD1001` demonstrates the initial stage.
15. Switch MetaMask to the account allowed for the next stage and open product details.
16. Submit the next status update and show the new transaction hash / confirmation block.
17. Verify the same ID again and show the refreshed current status and timeline.
18. Enter an unused ID such as `FAKE9999`.
19. Show “PRODUCT NOT VERIFIED” and the exact not-found message.

## Screenshot checklist for the report

- [ ] Landing page with project title, lifecycle, live totals and no-wallet callout.
- [ ] Ganache terminal showing local chain ID 1337 (avoid including any private key text in the report).
- [ ] MetaMask confirmation for product registration, with sensitive account details cropped if the report is shared.
- [ ] Registration success showing product ID, transaction hash, block and QR.
- [ ] Dashboard status totals, distribution bar, search/filter and recent activity.
- [ ] Incognito verification showing “AUTHENTIC PRODUCT” and a visible history timeline.
- [ ] Product detail page showing the registration proof and status update panel.
- [ ] New status confirmation and updated history.
- [ ] Fake ID showing “PRODUCT NOT VERIFIED”.
- [ ] Blockchain Info event log.
- [ ] Printable certificate page before print preview.
- [ ] Responsive phone-width page and expanded mobile menu.

Keep screenshots focused on the application. Never publish real wallet secrets; Ganache private keys are public test credentials only and must not be used with real funds.
