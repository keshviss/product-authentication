// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Product Authenticity and Supply Chain Verification
/// @notice Manufacturers register products; supply-chain participants update
///         their status; anyone can verify a product and read its history.
contract ProductAuthenticity {

    // ---------------------------------------------------------------
    // 1. DATA TYPES
    // ---------------------------------------------------------------

    // Who is allowed to do what. 'None' (value 0) is the default for any
    // address that has never been given a role, e.g. a customer.
    enum Role { None, Manufacturer, Distributor, Retailer }

    // Product lifecycle. Solidity stores these as numbers 0..5 in this order.
    enum Status { MANUFACTURED, DISPATCHED, IN_TRANSIT, AT_DISTRIBUTOR, AT_RETAILER, SOLD }

    struct Product {
        string  productId;
        string  productName;
        string  brand;
        string  model;
        string  batchNumber;
        string  manufacturingDate;
        string  category;
        string  description;
        address manufacturer;    // wallet that registered the product
        uint256 createdAt;       // block timestamp (seconds since 1970)
        Status  currentStatus;
        bool    exists;          // lets us tell "not registered" from "empty"
    }

    // One entry per lifecycle change: what, who, when.
    struct ProductEvent {
        Status  status;
        address updatedBy;
        uint256 timestamp;
    }

    // ---------------------------------------------------------------
    // 2. STORAGE (this is what lives permanently on the blockchain)
    // ---------------------------------------------------------------

    address public admin;                                  // deployer of the contract
    mapping(address => Role) public roles;                 // wallet => role
    mapping(string => Product) public products;            // productId => product
    mapping(string => ProductEvent[]) private productHistory; // productId => history
    string[] private productIds;                           // list of all IDs (for dashboard)

    // ---------------------------------------------------------------
    // 3. EVENTS (logs written to the blockchain; cheap, readable by frontend)
    // ---------------------------------------------------------------

    event RoleAssigned(address indexed account, Role role);
    event ProductRegistered(string productId, address indexed manufacturer, uint256 timestamp);
    event ProductStatusUpdated(string productId, Status newStatus, address indexed updatedBy, uint256 timestamp);

    // ---------------------------------------------------------------
    // 4. MODIFIERS (reusable access-control checks)
    // ---------------------------------------------------------------

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can do this");
        _;
    }

    modifier onlyManufacturer() {
        require(roles[msg.sender] == Role.Manufacturer, "Only a manufacturer can do this");
        _;
    }

    // ---------------------------------------------------------------
    // 5. CONSTRUCTOR (runs once, at deployment)
    // ---------------------------------------------------------------

    constructor() {
        admin = msg.sender;                        // whoever deploys is the admin
        roles[msg.sender] = Role.Manufacturer;     // and can register products
        emit RoleAssigned(msg.sender, Role.Manufacturer);
    }

    // ---------------------------------------------------------------
    // 6. ROLE MANAGEMENT
    // ---------------------------------------------------------------

    /// @notice Admin gives a wallet a role (manufacturer, distributor, retailer).
    function assignRole(address account, Role role) public onlyAdmin {
        require(account != address(0), "Invalid address");
        require(account != admin, "Admin role cannot be changed");
        roles[account] = role;
        emit RoleAssigned(account, role);
    }

    // ---------------------------------------------------------------
    // 7. PRODUCT REGISTRATION
    // ---------------------------------------------------------------

    /// @notice Register a new genuine product. Only manufacturers can call this.
    function registerProduct(
        string memory _productId,
        string memory _productName,
        string memory _brand,
        string memory _model,
        string memory _batchNumber,
        string memory _manufacturingDate,
        string memory _category,
        string memory _description
    ) public onlyManufacturer {
        // Input checks
        require(bytes(_productId).length > 0, "Product ID is required");
        require(bytes(_productName).length > 0, "Product name is required");
        // Duplicate protection: the ID must not already exist
        require(!products[_productId].exists, "Product ID already registered");

        // Write the record field by field into blockchain storage
        Product storage p = products[_productId];
        p.productId = _productId;
        p.productName = _productName;
        p.brand = _brand;
        p.model = _model;
        p.batchNumber = _batchNumber;
        p.manufacturingDate = _manufacturingDate;
        p.category = _category;
        p.description = _description;
        p.manufacturer = msg.sender;
        p.createdAt = block.timestamp;
        p.currentStatus = Status.MANUFACTURED;
        p.exists = true;

        productIds.push(_productId);

        // First history entry
        productHistory[_productId].push(
            ProductEvent(Status.MANUFACTURED, msg.sender, block.timestamp)
        );

        emit ProductRegistered(_productId, msg.sender, block.timestamp);
    }

    // ---------------------------------------------------------------
    // 8. SUPPLY CHAIN STATUS UPDATE
    // ---------------------------------------------------------------

    /// @notice Move a product to its next lifecycle status.
    function updateProductStatus(string memory _productId, Status _newStatus) public {
        require(products[_productId].exists, "Product not found");

        Product storage p = products[_productId];

        // State machine: only the NEXT status is allowed (no skipping, no going back)
        require(uint8(_newStatus) == uint8(p.currentStatus) + 1, "Invalid status transition");

        // Access control: is THIS caller allowed to make THIS move?
        require(_isAuthorized(p, _newStatus), "Not authorized for this status update");

        p.currentStatus = _newStatus;
        productHistory[_productId].push(
            ProductEvent(_newStatus, msg.sender, block.timestamp)
        );

        emit ProductStatusUpdated(_productId, _newStatus, msg.sender, block.timestamp);
    }

    /// @dev Which role may move a product INTO each status.
    function _isAuthorized(Product storage p, Status newStatus) internal view returns (bool) {
        Role r = roles[msg.sender];
        bool isProductManufacturer = (r == Role.Manufacturer && msg.sender == p.manufacturer);

        if (newStatus == Status.DISPATCHED)     return isProductManufacturer;
        if (newStatus == Status.IN_TRANSIT)     return isProductManufacturer || r == Role.Distributor;
        if (newStatus == Status.AT_DISTRIBUTOR) return r == Role.Distributor;
        return r == Role.Retailer;              // AT_RETAILER and SOLD
    }

    // ---------------------------------------------------------------
    // 9. READ FUNCTIONS (free, no transaction, no wallet needed)
    // ---------------------------------------------------------------

    /// @notice Does a product with this ID exist in the manufacturer's records?
    function verifyProduct(string memory _productId) public view returns (bool) {
        return products[_productId].exists;
    }

    /// @notice Full product record. Reverts if the product does not exist.
    function getProduct(string memory _productId) public view returns (Product memory) {
        require(products[_productId].exists, "Product not found");
        return products[_productId];
    }

    /// @notice Complete supply-chain history of a product.
    function getProductHistory(string memory _productId) public view returns (ProductEvent[] memory) {
        require(products[_productId].exists, "Product not found");
        return productHistory[_productId];
    }

    function getTotalProducts() public view returns (uint256) {
        return productIds.length;
    }

    function getProductIdByIndex(uint256 index) public view returns (string memory) {
        require(index < productIds.length, "Index out of range");
        return productIds[index];
    }
}