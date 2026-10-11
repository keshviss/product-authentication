const { ethers } = require("hardhat");

async function main() {
  const network = await ethers.provider.getNetwork();
  const blockNumber = await ethers.provider.getBlockNumber();
  const signers = await ethers.getSigners();

  console.log("Chain ID     :", network.chainId.toString());
  console.log("Latest block :", blockNumber);
  console.log("Accounts     :", signers.length);

  for (let i = 0; i < 3; i++) {
    const balance = await ethers.provider.getBalance(signers[i].address);
    console.log(`Account ${i}:`, signers[i].address, "-", ethers.formatEther(balance), "ETH");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });