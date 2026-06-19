# IProtect — Blockchain IP Protection

A decentralised Intellectual Property registry built on Ethereum with a React + Vite frontend and IPFS (Pinata) storage.

**Features:** Register IP on-chain · Verify ownership · Transfer IP · Grant licenses · Donate ETH to creators

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone the Repository](#2-clone-the-repository)
3. [Hardhat Setup](#3-hardhat-setup)
4. [Start the Blockchain & Deploy](#4-start-the-blockchain--deploy)
5. [MetaMask Setup](#5-metamask-setup)
6. [Grant the Verifier Role](#6-grant-the-verifier-role)
7. [Copy the ABI](#7-copy-the-abi)
8. [Pinata (IPFS) Setup](#8-pinata-ipfs-setup)
9. [Frontend Setup](#9-frontend-setup)
10. [Run Tests](#10-run-tests)
11. [Accounts & Roles](#11-accounts--roles)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

| Tool | Version | Download |
|---|---|---|
| Node.js | v18 or v20 LTS | https://nodejs.org |
| MetaMask | any recent | https://metamask.io |
| Ganache GUI | v2.x | https://trufflesuite.com/ganache |

---

## 2. Clone the Repository

```bash
git clone https://github.com/rekiihype/IProtect.git
cd IProtect
```

---

## 3. Hardhat Setup

### 3.1 Install dependencies

```bash
npm install
```

### 3.2 Build (compile) the contract

```bash
npx hardhat build
```

---

## 4. Start the Blockchain & Deploy

### Option A — Ganache GUI (recommended for demo)

1. Open Ganache → **Quickstart**
2. Click the gear icon → **Accounts & Keys** tab:
   - Mnemonic: `test test test test test test test test test test test junk`
   - Default Balance: `100`
3. **Server** tab → Port: `8545`
4. Click **Restart**

Deploy in a terminal:

```bash
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat run scripts/grantVerifier.ts --network localhost
```

### Option B — Hardhat local node

Terminal 1 (leave running):
```bash
npx hardhat node
```

Terminal 2:
```bash
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat run scripts/grantVerifier.ts --network localhost
```

---

The deploy script will print the contract address. If you used the mnemonic above **and Ganache was freshly restarted** (Account #0 has no prior transactions), it will always be:
```
IPProtection deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

> ⚠️ **If the address is different**, your Account #0 had prior transactions on this Ganache instance. You must update **both** files with the printed address:
>
> `frontend/src/contracts/contract.js` line 12:
> ```js
> export const CONTRACT_ADDRESS = "paste_your_deployed_address_here";
> ```
> `scripts/grantVerifier.ts` line 14:
> ```ts
> const CONTRACT_ADDRESS = "paste_your_deployed_address_here";
> ```
> To get the deterministic address back: restart Ganache (gear icon → Restart) to reset the blockchain, then redeploy.

---

## 5. MetaMask Setup

### 5.1 Add the network

**Ganache:**

| Field | Value |
|---|---|
| Network Name | `Ganache Local` |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `1337` |
| Currency Symbol | `ETH` |

**Hardhat (alternative):**

| Field | Value |
|---|---|
| Network Name | `Hardhat Local` |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency Symbol | `ETH` |

### 5.2 Import test accounts

Both options use the same accounts (same mnemonic):

| Account | Address | Private Key |
|---|---|---|
| #0 — Admin | `0xf39Fd6e51aad88F6f4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| #1 — Verifier | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |


### 5.3 Reset nonce after restarting the blockchain

MetaMask → Settings → Advanced → **Clear activity and nonce data** (for each account).

---

## 6. Grant the Verifier Role

Already handled by the deploy step above (`grantVerifier.ts` grants `VERIFIER_ROLE` to Account #1 automatically).

---

## 7. Copy the ABI

After `npx hardhat build`, copy the compiled ABI to the frontend:

```bash
# Windows
copy artifacts\contracts\IPProtection.sol\IPProtection.json frontend\src\contracts\IPProtection.json

# Mac / Linux
cp artifacts/contracts/IPProtection.sol/IPProtection.json frontend/src/contracts/IPProtection.json
```

---

## 8. Pinata (IPFS) Setup

1. Sign up at https://app.pinata.cloud (free tier is enough)
2. API Keys → **New Key** → enable `pinFileToIPFS` → **Generate**
3. Copy the JWT token (shown once only)
4. Create `frontend/.env`:

```env
VITE_PINATA_JWT=paste_your_jwt_token_here
```

---

## 9. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — connect MetaMask when prompted.

---

## 10. Run Tests

From the project root:

```bash
npx hardhat test
```

26 tests covering all contract functions. A gas cost table is printed after the run.

---

## 11. Accounts & Roles

| Account | Role | Permissions |
|---|---|---|
| #0 — Admin | Deployer | Register IPs, grant roles, all actions |
| #1 — Verifier | Verifier | Verify IP records |
| Any account | Creator | Register IPs, transfer, grant licenses, donate |

---

## 12. Troubleshooting

**`invalid opcode` on deploy**
- Make sure `hardhat.config.ts` has `evmVersion: "paris"` set (required for Ganache compatibility).

**Transactions fail with nonce error**
- Reset MetaMask account activity: Settings → Advanced → **Clear activity and nonce data**.

**"Could not connect to contract"**
- Confirm the blockchain (Ganache or Hardhat node) is running.
- Confirm `contract.js` has the correct deployed address.
- Confirm `IPProtection.json` has been copied to `frontend/src/contracts/`.

**IPFS upload fails**
- Check `VITE_PINATA_JWT` in `frontend/.env` is set correctly.
- Restart the dev server after changing `.env`.

**Ganache network not showing in MetaMask**
- Add it manually: Settings → Networks → Add network manually → Chain ID `1337`, RPC `http://127.0.0.1:8545`.
- Make sure Ganache is running before saving (MetaMask verifies the chain ID live).
