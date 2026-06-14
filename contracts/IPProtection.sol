// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

// A blockchain-based Intellectual Property (IP) registration and protection system.
// Allows anyone to register IP assets on-chain, verifiers to endorse them,
// and owners to transfer ownership or grant licenses.
// Inherits OpenZeppelin AccessControl for role-based permissions.
contract IPProtection is AccessControl {

    // ─────────────────────────────────────────────────────────────────────────
    // ROLES
    // ─────────────────────────────────────────────────────────────────────────

    // Role identifier for authorised verifiers. Must be granted by the Admin.
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // ─────────────────────────────────────────────────────────────────────────
    // DATA STRUCTURES
    // ─────────────────────────────────────────────────────────────────────────

    // Represents a single registered Intellectual Property record.
    struct IPRecord {
        uint256 ipId;               // Auto-incrementing unique identifier (starts at 1)
        string  title;              // Name of the IP asset
        string  description;        // Short description of the work
        string  ipfsHash;           // IPFS Content Identifier (CID) of the uploaded file
        address owner;              // Current owner's Ethereum wallet address
        uint256 registrationTime;   // Unix timestamp at time of registration (block.timestamp)
        bool    isRegistered;       // Existential flag — true once the record is created
        bool    isVerified;         // Endorsement flag — true only after a Verifier approves it
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────

    // Counter for IP IDs. Starts at 0; incremented BEFORE use so first IP = ID 1.
    uint256 private _ipIds;

    // Maps IP ID to IPRecord struct.
    mapping(uint256 => IPRecord) private _ipRecords;

    // Maps IPFS CID hash to a boolean. Blocks duplicate registrations.
    mapping(string => bool) private _registeredHashes;

    // ─────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────

    // Emitted when a new IP asset is successfully registered.
    event IPRegistered(
        uint256 indexed ipId,
        address indexed owner,
        string  ipfsHash,
        string  title
    );

    // Emitted when the ownership of an IP record is transferred.
    event IPOwnershipTransferred(
        uint256 indexed ipId,
        address indexed oldOwner,
        address indexed newOwner
    );

    // Emitted when an authorised verifier endorses an IP record.
    event IPVerified(
        uint256 indexed ipId,
        address indexed verifier
    );

    // Emitted when an IP owner grants a license to another address.
    event IPLicensed(
        uint256 indexed ipId,
        address indexed licensor,
        address indexed licensee,
        uint256 durationDays,
        uint256 timestamp
    );

    // ─────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────

    // Deploys the contract and grants the deployer the DEFAULT_ADMIN_ROLE.
    // VERIFIER_ROLE is NOT granted automatically; the admin must call grantRole() later.
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────

    // Restricts a function to the current owner of the specified IP record.
    modifier onlyIPOwner(uint256 ipId) {
        // SECURITY: Check the record exists before checking ownership to avoid misleading errors
        require(_ipRecords[ipId].isRegistered, "IP record does not exist");
        // SECURITY: Only the current owner of this IP may call this function
        require(_ipRecords[ipId].owner == msg.sender, "Caller is not the IP owner");
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────

    // Registers a new Intellectual Property asset on-chain.
    // Anyone may call this function. Duplicate IPFS hashes are rejected.
    function registerIP(
        string calldata title,
        string calldata description,
        string calldata ipfsHash
    ) external returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(!_registeredHashes[ipfsHash], "This file has already been registered");

        _ipIds++;
        uint256 newId = _ipIds;

        _ipRecords[newId] = IPRecord({
            ipId:             newId,
            title:            title,
            description:      description,
            ipfsHash:         ipfsHash,
            owner:            msg.sender,
            registrationTime: block.timestamp,
            isRegistered:     true,
            isVerified:       false
        });

        _registeredHashes[ipfsHash] = true;

        emit IPRegistered(newId, msg.sender, ipfsHash, title);

        return newId;
    }

    // Transfers ownership of an IP record to a new address.
    // Can only be called by the current IP owner.
    function transferIPOwnership(
        uint256 ipId,
        address newOwner
    ) external onlyIPOwner(ipId) {
        require(newOwner != address(0), "New owner cannot be the zero address");
        require(newOwner != msg.sender, "New owner cannot be the current owner");

        address oldOwner = _ipRecords[ipId].owner;
        _ipRecords[ipId].owner = newOwner;
        _ipRecords[ipId].isVerified = false; // IMPORTANT: ownership change resets verification

        emit IPOwnershipTransferred(ipId, oldOwner, newOwner);
    }

    // Marks an IP record as verified (endorsed) by an authorised verifier.
    // Only wallets granted VERIFIER_ROLE by the Admin can call this.
    function verifyIPRecord(uint256 ipId) external {
        // SECURITY: Only wallets granted VERIFIER_ROLE by the Admin can call this
        require(hasRole(VERIFIER_ROLE, msg.sender), "Caller is not an authorized verifier");
        require(_ipRecords[ipId].isRegistered, "IP record does not exist");
        require(!_ipRecords[ipId].isVerified, "IP record is already verified");

        _ipRecords[ipId].isVerified = true;

        emit IPVerified(ipId, msg.sender);
    }

    // Grants a license for an IP asset to another address.
    // Can only be called by the current IP owner.
    function grantLicense(
        uint256 ipId,
        address licensee,
        uint256 durationDays
    ) external onlyIPOwner(ipId) {
        require(licensee != address(0), "Licensee cannot be the zero address");
        require(durationDays > 0, "Duration must be greater than zero");

        emit IPLicensed(ipId, msg.sender, licensee, durationDays, block.timestamp);
    }

    // Retrieves all details of a registered IP record.
    function getIPDetails(uint256 ipId) external view returns (IPRecord memory) {
        require(_ipRecords[ipId].isRegistered, "IP record does not exist");
        return _ipRecords[ipId];
    }

    // Checks whether an IPFS hash has already been registered.
    function isHashRegistered(string calldata ipfsHash) external view returns (bool) {
        return _registeredHashes[ipfsHash];
    }

    // Returns the total number of IP records that have been registered.
    function getTotalIPCount() external view returns (uint256) {
        return _ipIds;
    }
}