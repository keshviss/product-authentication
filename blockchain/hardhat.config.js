require("@nomicfoundation/hardhat-toolbox");

// Default mnemonic produced by `ganache --wallet.deterministic`.
// It is public knowledge: use it ONLY for local testing, never with real money.
const GANACHE_MNEMONIC =
  "myth like bonus scare over problem client lizard pioneer submit female collect";

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "paris",              // avoids "invalid opcode" on Ganache
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    ganache: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
      accounts: { mnemonic: GANACHE_MNEMONIC },
    },
  },
};