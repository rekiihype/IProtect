// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

// A blockchain-based Intellectual Property (IP) registration and protection system.
// Allows anyone to register IP assets on-chain, verifiers to endorse them,
// and owners to transfer ownership, grant licenses, or receive ETH donations.
// SECURITY: Inherits OpenZeppelin AccessControl for role-based access control.
contract IPProtection is AccessControl {

    // ─────────────────────────────────────────────────────────────────────────
    // ROLES
    // ─────────────────────────────────────────────────────────────────────────

    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // ─────────────────────────────────────────────────────────────────────────
    // DATA STRUCTURES
    // ─────────────────────────────────────────────────────────────────────────

    // GAS: address (20 bytes) and two bools (1 byte each) are packed into a
    // single 32-byte storage slot, saving two slots vs. storing bools separately.
    struct IPRecord {
        uint256 ipId;
        uint256 registrationTime;
        address owner;
        bool    isRegistered;
        bool    isVerified;
        string  title;
        string  description;
        string  ipfsHash;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────

    uint256 private _ipIds;

    mapping(uint256 => IPRecord) private _ipRecords;
    mapping(string  => bool)     private _registeredHashes;

    // ─────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────

    event IPRegistered(uint256 indexed ipId, address indexed owner, string ipfsHash, string title);
    event IPOwnershipTransferred(uint256 indexed ipId, address indexed oldOwner, address indexed newOwner);
    event IPVerified(uint256 indexed ipId, address indexed verifier);
    // GAS: License data is emitted as an event rather than written to storage
    // because it is never read on-chain — saves a costly SSTORE per license grant.
    event IPLicensed(uint256 indexed ipId, address indexed licensor, address indexed licensee, uint256 durationDays, uint256 timestamp);
    event IPDonated(uint256 indexed ipId, address indexed donor, address indexed recipient, uint256 amount);

    // ─────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────

    modifier onlyIPOwner(uint256 ipId) {
        require(_ipRecords[ipId].isRegistered, "IP record does not exist");
        // SECURITY: Role-based ownership check — only the current IP owner may proceed.
        require(_ipRecords[ipId].owner == msg.sender, "Caller is not the IP owner");
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @dev Registers a new Intellectual Property asset on-chain.
     * Anyone may call this. Duplicate IPFS hashes are rejected.
     * @param title Human-readable name of the work.
     * @param description Short description of the IP asset.
     * @param ipfsHash IPFS Content Identifier (CID) of the uploaded file.
     * @return The newly assigned IP ID (starts at 1).
     */
    // GAS: String params use `calldata` — avoids copying arguments into memory.
    function registerIP(
        string calldata title,
        string calldata description,
        string calldata ipfsHash
    ) external returns (uint256) {
        require(bytes(title).length > 0,    "Title cannot be empty");
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(!_registeredHashes[ipfsHash], "This file has already been registered");

        _ipIds++;
        uint256 newId = _ipIds;

        _ipRecords[newId] = IPRecord({
            ipId:             newId,
            registrationTime: block.timestamp,
            owner:            msg.sender,
            isRegistered:     true,
            isVerified:       false,
            title:            title,
            description:      description,
            ipfsHash:         ipfsHash
        });

        _registeredHashes[ipfsHash] = true;
        emit IPRegistered(newId, msg.sender, ipfsHash, title);
        return newId;
    }

    /**
     * @dev Transfers ownership of an IP record to a new address.
     * Resets the verification status of the transferred record.
     * @param ipId The ID of the IP record to transfer.
     * @param newOwner The address of the new owner.
     */
    function transferIPOwnership(uint256 ipId, address newOwner) external onlyIPOwner(ipId) {
        require(newOwner != address(0),  "New owner cannot be the zero address");
        require(newOwner != msg.sender,  "New owner cannot be the current owner");

        address oldOwner = _ipRecords[ipId].owner;
        _ipRecords[ipId].owner      = newOwner;
        _ipRecords[ipId].isVerified = false;

        emit IPOwnershipTransferred(ipId, oldOwner, newOwner);
    }

    /**
     * @dev Marks an IP record as verified by an authorised verifier.
     * @param ipId The ID of the IP record to verify.
     */
    function verifyIPRecord(uint256 ipId) external {
        // SECURITY: Role-based access control — only wallets granted VERIFIER_ROLE by the Admin may verify.
        require(hasRole(VERIFIER_ROLE, msg.sender), "Caller is not an authorized verifier");
        require(_ipRecords[ipId].isRegistered, "IP record does not exist");
        require(!_ipRecords[ipId].isVerified,  "IP record is already verified");

        _ipRecords[ipId].isVerified = true;
        emit IPVerified(ipId, msg.sender);
    }

    /**
     * @dev Grants a time-limited license for an IP asset to another address.
     * License data is stored only as an emitted event, not in contract storage.
     * @param ipId The ID of the licensed IP.
     * @param licensee The address receiving the license.
     * @param durationDays Duration of the license in days.
     */
    function grantLicense(uint256 ipId, address licensee, uint256 durationDays) external onlyIPOwner(ipId) {
        require(licensee != address(0), "Licensee cannot be the zero address");
        require(durationDays > 0,       "Duration must be greater than zero");

        emit IPLicensed(ipId, msg.sender, licensee, durationDays, block.timestamp);
    }

    /**
     * @dev Sends ETH directly to the current owner of an IP record as a donation.
     * @param ipId The ID of the IP whose owner will receive the donation.
     */
    function donateToOwner(uint256 ipId) external payable {
        require(_ipRecords[ipId].isRegistered, "IP record does not exist");
        require(msg.value > 0, "Donation must be greater than zero");

        // SECURITY: Checks-Effects-Interactions — state is read and the event is
        // emitted BEFORE the external ETH transfer to prevent reentrancy attacks.
        address recipient = _ipRecords[ipId].owner;
        emit IPDonated(ipId, msg.sender, recipient, msg.value);

        (bool success, ) = recipient.call{value: msg.value}("");
        require(success, "Transfer failed");
    }

    /**
     * @dev Returns all fields of a registered IP record.
     * @param ipId The ID of the IP record to look up.
     */
    // GAS: `view` modifier — no state changes, so off-chain calls cost zero gas.
    function getIPDetails(uint256 ipId) external view returns (IPRecord memory) {
        require(_ipRecords[ipId].isRegistered, "IP record does not exist");
        return _ipRecords[ipId];
    }

    /**
     * @dev Returns whether an IPFS hash has already been registered.
     * @param ipfsHash The IPFS CID to check.
     */
    // GAS: `calldata` avoids copying the string argument into memory.
    function isHashRegistered(string calldata ipfsHash) external view returns (bool) {
        return _registeredHashes[ipfsHash];
    }

    /**
     * @dev Returns the total number of IP records registered so far.
     */
    function getTotalIPCount() external view returns (uint256) {
        return _ipIds;
    }
}
