const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Status enum values matching ProductAuthenticity.sol:
// 0: MANUFACTURED, 1: DISPATCHED, 2: IN_TRANSIT, 3: AT_DISTRIBUTOR, 4: AT_RETAILER, 5: SOLD
const STATUS_NAMES = [
  "MANUFACTURED",
  "DISPATCHED",
  "IN_TRANSIT",
  "AT_DISTRIBUTOR",
  "AT_RETAILER",
  "SOLD",
];

async function main() {
  console.log("🌱 Starting blockchain seed script...");

  // 1. Read deployed contract address from contractInfo.json
  const contractInfoPath = path.join(
    __dirname,
    "..",
    "..",
    "frontend",
    "src",
    "utils",
    "contractInfo.json"
  );
  if (!fs.existsSync(contractInfoPath)) {
    throw new Error(
      "contractInfo.json not found. Please run 'npm run deploy' first!"
    );
  }
  const { address } = JSON.parse(fs.readFileSync(contractInfoPath, "utf8"));

  // 2. Hardhat signers:
  // 0 = Manufacturer (admin), 1 = Distributor, 2 = Retailer
  const [manufacturer, distributor, retailer] = await hre.ethers.getSigners();
  const contract = await hre.ethers.getContractAt("ProductAuthenticity", address);

  console.log("Contract Address :", address);
  console.log("Manufacturer     :", manufacturer.address);
  console.log("Distributor      :", distributor.address);
  console.log("Retailer         :", retailer.address);

  // 3. Define the 5 sample products
  const productsToSeed = [
    {
      id: "PROD1001",
      name: "XYZ Smartphone",
      brand: "XYZ",
      model: "X1 Pro",
      batch: "B101",
      date: "2026-10-01",
      category: "Electronics",
      description: "Flagship 5G smartphone with AMOLED display and 128GB storage.",
      targetStatus: 0, // MANUFACTURED (left for live demo!)
    },
    {
      id: "PROD1002",
      name: "XYZ Laptop",
      brand: "XYZ",
      model: "X-Book 15",
      batch: "B102",
      date: "2026-10-02",
      category: "Electronics",
      description: "High-performance 15-inch laptop with 16GB RAM and 512GB SSD.",
      targetStatus: 3, // AT_DISTRIBUTOR
    },
    {
      id: "PROD1003",
      name: "ABC Headphones",
      brand: "ABC",
      model: "NoiseCancel 700",
      batch: "B103",
      date: "2026-10-03",
      category: "Accessories",
      description: "Wireless over-ear noise-cancelling headphones with 30h battery.",
      targetStatus: 2, // IN_TRANSIT
    },
    {
      id: "PROD1004",
      name: "ABC Smartwatch",
      brand: "ABC",
      model: "FitWatch 2",
      batch: "B104",
      date: "2026-10-04",
      category: "Electronics",
      description: "Fitness-tracking smartwatch with OLED display and heart sensor.",
      targetStatus: 5, // SOLD
    },
    {
      id: "PROD1005",
      name: "XYZ Tablet",
      brand: "XYZ",
      model: "Tab 10",
      batch: "B105",
      date: "2026-10-05",
      category: "Electronics",
      description: "10.1-inch multimedia tablet with stylus and stereo speakers.",
      targetStatus: 4, // AT_RETAILER
    },
  ];

  for (const item of productsToSeed) {
    const exists = await contract.verifyProduct(item.id);
    if (!exists) {
      console.log(`\n📦 Registering ${item.id} (${item.name})...`);
      const regTx = await contract.connect(manufacturer).registerProduct(
        item.id,
        item.name,
        item.brand,
        item.model,
        item.batch,
        item.date,
        item.category,
        item.description
      );
      await regTx.wait();
      console.log(`   ✓ Registered by manufacturer in tx: ${regTx.hash}`);
    } else {
      console.log(`\n📦 ${item.id} already registered.`);
    }

    // Check current status
    const product = await contract.getProduct(item.id);
    let currentStatus = Number(product.currentStatus);

    // Advance step-by-step to targetStatus using the authorized role for each step:
    // Step 1: DISPATCHED -> manufacturer
    if (item.targetStatus >= 1 && currentStatus < 1) {
      const tx = await contract.connect(manufacturer).updateProductStatus(item.id, 1);
      await tx.wait();
      currentStatus = 1;
      console.log(`   ✓ [DISPATCHED] updated by Manufacturer (${manufacturer.address})`);
    }

    // Step 2: IN_TRANSIT -> manufacturer or distributor
    if (item.targetStatus >= 2 && currentStatus < 2) {
      const tx = await contract.connect(distributor).updateProductStatus(item.id, 2);
      await tx.wait();
      currentStatus = 2;
      console.log(`   ✓ [IN_TRANSIT] updated by Distributor (${distributor.address})`);
    }

    // Step 3: AT_DISTRIBUTOR -> distributor
    if (item.targetStatus >= 3 && currentStatus < 3) {
      const tx = await contract.connect(distributor).updateProductStatus(item.id, 3);
      await tx.wait();
      currentStatus = 3;
      console.log(`   ✓ [AT_DISTRIBUTOR] updated by Distributor (${distributor.address})`);
    }

    // Step 4: AT_RETAILER -> retailer
    if (item.targetStatus >= 4 && currentStatus < 4) {
      const tx = await contract.connect(retailer).updateProductStatus(item.id, 4);
      await tx.wait();
      currentStatus = 4;
      console.log(`   ✓ [AT_RETAILER] updated by Retailer (${retailer.address})`);
    }

    // Step 5: SOLD -> retailer
    if (item.targetStatus >= 5 && currentStatus < 5) {
      const tx = await contract.connect(retailer).updateProductStatus(item.id, 5);
      await tx.wait();
      currentStatus = 5;
      console.log(`   ✓ [SOLD] updated by Retailer (${retailer.address})`);
    }

    console.log(`   Final Status: ${STATUS_NAMES[currentStatus]} (${currentStatus})`);
  }

  const total = await contract.getTotalProducts();
  console.log(`\n🎉 Seeding complete! Total products on-chain: ${total.toString()}`);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
