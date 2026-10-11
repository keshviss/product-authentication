const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Hardhat gives us the 20 accounts. 0 = admin/manufacturer, 1 = distributor, 2 = retailer
  const [admin, distributor, retailer] = await hre.ethers.getSigners();

  // 1. Deploy the contract (this sends a real transaction to Ganache)
  const Factory = await hre.ethers.getContractFactory("ProductAuthenticity");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  // 2. Give roles. Enum Role: None=0, Manufacturer=1, Distributor=2, Retailer=3
  await (await contract.assignRole(distributor.address, 2)).wait();
  await (await contract.assignRole(retailer.address, 3)).wait();

  // 3. Save address + ABI where the React app will read them
  const artifact = await hre.artifacts.readArtifact("ProductAuthenticity");
  const outDir = path.join(__dirname, "..", "..", "frontend", "src", "utils");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "contractInfo.json"),
    JSON.stringify({ address, chainId: 1337, abi: artifact.abi }, null, 2)
  );

  console.log("Contract deployed to :", address);
  console.log("Admin / Manufacturer :", admin.address);
  console.log("Distributor          :", distributor.address);
  console.log("Retailer             :", retailer.address);
  console.log("Saved to frontend/src/utils/contractInfo.json");
}

main().catch((e) => { console.error(e); process.exit(1); });