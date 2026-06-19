# IProtect — Test Report

**Framework:** Hardhat (Mocha/Chai) — `@nomicfoundation/hardhat-toolbox-mocha-ethers`  
**Contract:** `IPProtection.sol`  
**Total Tests:** 26 | **Passed:** 26 | **Failed:** 0  
**Execution Time:** ~240ms  
**Command:** `npx hardhat test`

---

## 1. Test Case Table

| # | Function | Input | Expected Output | Actual Output | Pass/Fail |
|---|---|---|---|---|---|
| 1 | `registerIP` | title="My Work", desc="A description", hash="QmHash1" | Emits `IPRegistered(1, owner, hash, title)`, returns ID 1 | Event emitted, ID 1 returned | Pass |
| 2 | `registerIP` | Two sequential registrations with different hashes | IDs 1 and 2 assigned in order | `getTotalIPCount()` returns 2 | Pass |
| 3 | `registerIP` | title="" (empty) | Reverts: "Title cannot be empty" | Reverted with correct message | Pass |
| 4 | `registerIP` | ipfsHash="" (empty) | Reverts: "IPFS hash cannot be empty" | Reverted with correct message | Pass |
| 5 | `registerIP` | Same hash registered twice by different wallets | Reverts: "This file has already been registered" | Reverted with correct message | Pass |
| 6 | `getIPDetails` | Valid IP ID 1 | Returns full `IPRecord` struct with correct fields | All fields match registration input | Pass |
| 7 | `getIPDetails` | ID 99 (does not exist) | Reverts: "IP record does not exist" | Reverted with correct message | Pass |
| 8 | `isHashRegistered` | Hash not yet registered | Returns `false` | `false` | Pass |
| 9 | `isHashRegistered` | Hash after registration | Returns `true` | `true` | Pass |
| 10 | `verifyIPRecord` | Valid IP ID, caller has VERIFIER_ROLE | Emits `IPVerified(1, verifier)`, sets `isVerified = true` | Event emitted, flag updated | Pass |
| 11 | `verifyIPRecord` | Caller does not have VERIFIER_ROLE | Reverts: "Caller is not an authorized verifier" | Reverted with correct message | Pass |
| 12 | `verifyIPRecord` | ID 99 (does not exist) | Reverts: "IP record does not exist" | Reverted with correct message | Pass |
| 13 | `verifyIPRecord` | IP already verified | Reverts: "IP record is already verified" | Reverted with correct message | Pass |
| 14 | `transferIPOwnership` | Valid IP ID, new owner address | Emits `IPOwnershipTransferred`, updates owner, resets `isVerified` to false | Owner updated, flag reset, event emitted | Pass |
| 15 | `transferIPOwnership` | Caller is not the IP owner | Reverts: "Caller is not the IP owner" | Reverted with correct message | Pass |
| 16 | `transferIPOwnership` | newOwner = zero address | Reverts: "New owner cannot be the zero address" | Reverted with correct message | Pass |
| 17 | `transferIPOwnership` | newOwner = current owner | Reverts: "New owner cannot be the current owner" | Reverted with correct message | Pass |
| 18 | `transferIPOwnership` | ID 99 (does not exist) | Reverts: "IP record does not exist" | Reverted with correct message | Pass |
| 19 | `donateToOwner` | Valid IP ID, msg.value = 0.1 ETH | Transfers 0.1 ETH to IP owner | Owner balance increased by 0.1 ETH | Pass |
| 20 | `donateToOwner` | Valid IP ID, msg.value = 0.1 ETH | Emits `IPDonated(1, donor, owner, amount)` | Event emitted with correct args | Pass |
| 21 | `donateToOwner` | ID 99 (does not exist) | Reverts: "IP record does not exist" | Reverted with correct message | Pass |
| 22 | `donateToOwner` | msg.value = 0 | Reverts: "Donation must be greater than zero" | Reverted with correct message | Pass |
| 23 | `grantLicense` | Valid IP ID, licensee address, 30 days | Emits `IPLicensed(1, owner, licensee, 30, timestamp)` | Event emitted with correct args | Pass |
| 24 | `grantLicense` | Caller is not the IP owner | Reverts: "Caller is not the IP owner" | Reverted with correct message | Pass |
| 25 | `grantLicense` | licensee = zero address | Reverts: "Licensee cannot be the zero address" | Reverted with correct message | Pass |
| 26 | `grantLicense` | durationDays = 0 | Reverts: "Duration must be greater than zero" | Reverted with correct message | Pass |

---

## 2. Gas Consumption Table

| Function | Gas Used | Notes |
|---|---|---|
| `registerIP` | 209,148 | Writes full IP record to storage; varies with string length (171,781 for shorter input) |
| `verifyIPRecord` | 31,389 | Updates one boolean field |
| `transferIPOwnership` | 30,546 | Updates owner address and resets boolean field |
| `donateToOwner` | 36,096 | ETH transfer + event emit; no storage write |
| `grantLicense` | 27,884 | Event emit only — no storage write |
| View functions | 0 | `getIPDetails`, `isHashRegistered`, `getTotalIPCount` — free off-chain |

---

## 3. Console Output

All 26 tests passed with zero failures. Screenshot of terminal output included in Appendix Figure A.3 of the research report.

```
  IPProtection
    registerIP
      ✔ should register an IP, emit IPRegistered, and return ID 1
      ✔ should assign sequential IDs for multiple registrations
      ✔ should revert on empty title
      ✔ should revert on empty IPFS hash
      ✔ should revert on duplicate IPFS hash
    getIPDetails
      ✔ should return correct record details
      ✔ should revert for non-existent IP
    isHashRegistered
      ✔ should return false before registration
      ✔ should return true after registration
    verifyIPRecord
      ✔ should verify an IP and emit IPVerified
      ✔ should revert if caller lacks VERIFIER_ROLE
      ✔ should revert for non-existent IP
      ✔ should revert if already verified
    transferIPOwnership
      ✔ should transfer ownership, reset isVerified, and emit event
      ✔ should revert if caller is not the IP owner
      ✔ should revert if newOwner is zero address
      ✔ should revert if newOwner is the current owner
      ✔ should revert for non-existent IP
    donateToOwner
      ✔ should transfer ETH to the IP owner
      ✔ should emit IPDonated event
      ✔ should revert for non-existent IP
      ✔ should revert if msg.value is 0
    grantLicense
      ✔ should emit IPLicensed event with correct args
      ✔ should revert if caller is not the IP owner
      ✔ should revert if licensee is zero address
      ✔ should revert if durationDays is 0

  26 passing (240ms)
```

---

## 4. Known Failed Tests

None. All 26 tests pass.
