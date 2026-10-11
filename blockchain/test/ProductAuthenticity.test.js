const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

// Numeric values of the Solidity enums (same order as in the contract)
const Role = { None: 0, Manufacturer: 1, Distributor: 2, Retailer: 3 };
const Status = { MANUFACTURED: 0, DISPATCHED: 1, IN_TRANSIT: 2, AT_DISTRIBUTOR: 3, AT_RETAILER: 4, SOLD: 5 };

describe("ProductAuthenticity", function () {

  // Fixture: deploys a fresh contract for every test, so tests never affect each other
  async function deployFixture() {
    const [admin, distributor, retailer, customer] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ProductAuthenticity");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    await contract.assignRole(distributor.address, Role.Distributor);
    await contract.assignRole(retailer.address, Role.Retailer);

    return { contract, admin, distributor, retailer, customer };
  }

  // Helper: registers a sample product
  function register(contract, id = "PROD1001") {
    return contract.registerProduct(
      id, "XYZ Smartphone", "XYZ", "X1 Pro", "B101",
      "2026-10-01", "Electronics", "Flagship smartphone"
    );
  }

  // TEST 1
  it("Test 1: registers a valid product", async function () {
    const { contract, admin } = await loadFixture(deployFixture);

    await expect(register(contract))
      .to.emit(contract, "ProductRegistered")
      .withArgs("PROD1001", admin.address, anyValue);

    const p = await contract.getProduct("PROD1001");
    expect(p.productName).to.equal("XYZ Smartphone");
    expect(p.manufacturer).to.equal(admin.address);
    expect(p.currentStatus).to.equal(Status.MANUFACTURED);
    expect(await contract.getTotalProducts()).to.equal(1);
  });

  // TEST 2
  it("Test 2: rejects a duplicate Product ID", async function () {
    const { contract } = await loadFixture(deployFixture);
    await register(contract);

    await expect(register(contract))
      .to.be.revertedWith("Product ID already registered");
  });

  // TEST 3
  it("Test 3: verifies an existing product as authentic", async function () {
    const { contract, customer } = await loadFixture(deployFixture);
    await register(contract);

    // A customer (no role, no gas) can read
    expect(await contract.connect(customer).verifyProduct("PROD1001")).to.equal(true);
  });

  // TEST 4
  it("Test 4: a nonexistent product is not verified", async function () {
    const { contract } = await loadFixture(deployFixture);

    expect(await contract.verifyProduct("FAKE9999")).to.equal(false);
    await expect(contract.getProduct("FAKE9999")).to.be.revertedWith("Product not found");
  });

  // TEST 5
  it("Test 5: rejects registration by an unauthorized user", async function () {
    const { contract, customer, retailer } = await loadFixture(deployFixture);

    await expect(
      contract.connect(customer).registerProduct("PROD2000", "Fake", "X", "X", "B1", "2026-10-01", "X", "X")
    ).to.be.revertedWith("Only a manufacturer can do this");

    await expect(
      contract.connect(retailer).registerProduct("PROD2001", "Fake", "X", "X", "B1", "2026-10-01", "X", "X")
    ).to.be.revertedWith("Only a manufacturer can do this");
  });

  // TEST 6
  it("Test 6: authorized users update status through the full lifecycle", async function () {
    const { contract, admin, distributor, retailer } = await loadFixture(deployFixture);
    await register(contract);

    await expect(contract.connect(admin).updateProductStatus("PROD1001", Status.DISPATCHED))
      .to.emit(contract, "ProductStatusUpdated")
      .withArgs("PROD1001", Status.DISPATCHED, admin.address, anyValue);

    await contract.connect(distributor).updateProductStatus("PROD1001", Status.IN_TRANSIT);
    await contract.connect(distributor).updateProductStatus("PROD1001", Status.AT_DISTRIBUTOR);
    await contract.connect(retailer).updateProductStatus("PROD1001", Status.AT_RETAILER);
    await contract.connect(retailer).updateProductStatus("PROD1001", Status.SOLD);

    const p = await contract.getProduct("PROD1001");
    expect(p.currentStatus).to.equal(Status.SOLD);

    // History: MANUFACTURED + 5 updates = 6 entries, in order
    const history = await contract.getProductHistory("PROD1001");
    expect(history.length).to.equal(6);
    expect(history[0].status).to.equal(Status.MANUFACTURED);
    expect(history[5].status).to.equal(Status.SOLD);
    expect(history[3].updatedBy).to.equal(distributor.address);
  });

  // TEST 7
  it("Test 7: rejects unauthorized or invalid status updates", async function () {
    const { contract, retailer, customer } = await loadFixture(deployFixture);
    await register(contract);

    // A customer cannot update status
    await expect(contract.connect(customer).updateProductStatus("PROD1001", Status.DISPATCHED))
      .to.be.revertedWith("Not authorized for this status update");

    // A retailer cannot do the manufacturer's step
    await expect(contract.connect(retailer).updateProductStatus("PROD1001", Status.DISPATCHED))
      .to.be.revertedWith("Not authorized for this status update");

    // Skipping steps is not allowed (MANUFACTURED -> SOLD)
    await expect(contract.updateProductStatus("PROD1001", Status.SOLD))
      .to.be.revertedWith("Invalid status transition");

    // Unknown product
    await expect(contract.updateProductStatus("FAKE9999", Status.DISPATCHED))
      .to.be.revertedWith("Product not found");
  });

  // EXTRA: only admin assigns roles
  it("Extra: only the admin can assign roles", async function () {
    const { contract, customer } = await loadFixture(deployFixture);

    await expect(contract.connect(customer).assignRole(customer.address, Role.Manufacturer))
      .to.be.revertedWith("Only admin can do this");
  });
});