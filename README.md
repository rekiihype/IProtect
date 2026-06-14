# IProtect — Blockchain IP Protection

A decentralised Intellectual Property registry built on Ethereum (Hardhat local network) with a React + Vite frontend and IPFS (Pinata) storage.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone the Repository](#2-clone-the-repository)
3. [Hardhat Setup](#3-hardhat-setup)
4. [Start the Local Blockchain & Deploy the Contract](#4-start-the-local-blockchain--deploy-the-contract)
5. [MetaMask Setup](#5-metamask-setup)
6. [Grant the Verifier Role](#6-grant-the-verifier-role-optional)
7. [Update the Contract Address in the Frontend](#7-update-the-contract-address-in-the-frontend)
8. [Pinata (IPFS) Setup](#8-pinata-ipfs-setup)
9. [Frontend Setup](#9-frontend-setup)
10. [Accounts & Roles Quick Reference](#10-accounts--roles-quick-reference)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

Make sure you have the following installed before starting.

| Tool | Minimum version | Download |
|---|---|---|
| Node.js | v18 or v20 | https://nodejs.org (choose LTS) |
| npm | comes with Node.js | — |
| MetaMask browser extension | any recent version | https://metamask.io |

Check your versions:

```bash
node -v
npm -v
```

---

## 2. Clone the Repository

```bash
git clone <YOUR_REPO_URL>
cd IProtect
```

---

## 3. Hardhat Setup

> **Note:** This project follows the Hardhat v3 setup. The steps below match the Lab 9 guide.

### 3.1 Install root dependencies

```bash
npm install
```

### 3.2 Verify `hardhat.config.ts`

Open `hardhat.config.ts` — it should already look like this. **No changes needed.**

```ts
import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  solidity: "0.8.28",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
});
```

The Hardhat Local runs on **port 8545** with **Chain ID 31337** by default.

### 3.3 Build (compile) the contract

```bash
npx hardhat build
```

You should see:
```
Compilation finished successfully
```

> ⚠️ **Hardhat v3 note:** The compile command is now `build`. Using `npx hardhat compile` will give an error.

---

## 4. Start the Local Blockchain & Deploy the Contract

You need **two terminal windows** open side-by-side. **Do not close Terminal 1.**

### Terminal 1 — Start the Hardhat node

```bash
npx hardhat node
```

You will see 20 test accounts with private keys printed. Leave this running.

```
Account #0: 0xf39Fd6e51aad88F6f4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
...
```

> 💡 Copy and save the private keys for Account #0 and Account #1 — you'll import them into MetaMask.

### Terminal 2 — Deploy the contract

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

You should see output like:

```
IPProtection deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**Copy this address.** You will need it in [Step 7](#7-update-the-contract-address-in-the-frontend).

---

## 5. MetaMask Setup

> ⚠️ Make sure `npx hardhat node` is running **before** clicking Save — MetaMask needs the node live to verify the Chain ID.

### 5.1 Add the Hardhat Local to MetaMask

1. Open MetaMask → click the network dropdown at the top → **Add a custom network** (or **Add network manually**).
2. Fill in the details below:

| Field | Value |
|---|---|
| Network Name | `Hardhat Local` |
| New RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency Symbol | `ETH` |
| Block Explorer URL | *(leave blank)* |

3. Click **Save** and switch to **Hardhat Local**.

### 5.2 Import test accounts

Import at least two accounts so you can test different roles (owner vs verifier).

1. MetaMask → click your avatar (top-right) → **Import account**.
2. Select **Private Key** and paste the key for **Account #0**.
3. Repeat for **Account #1**.

| Account | Address | Role |
|---|---|---|
| Account #0 | `0xf39Fd6e51aad88F6f4ce6aB8827279cffFb92266` | Deployer / Admin |
| Account #1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | Verifier (after Step 6) |

> ⚠️ These are **test private keys** that are publicly known. Never use them on a real network or send real funds to them.

### 5.3 Reset account nonce (if transactions fail after restarting the node)

Every time you restart `npx hardhat node`, the blockchain resets. MetaMask keeps the old nonce and transactions will fail. Fix it by:

MetaMask → Settings → Advanced → **Clear activity and nonce data** (for each imported account).

---

## 6. Grant the Verifier Role *(optional)*

By default, only **Account #0** (the deployer) has the admin role. To allow **Account #1** to verify IP records, run the grant script.

Open `scripts/grantVerifier.ts` and confirm the addresses match:

```ts
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // from Step 4
const TARGET_ADDRESS   = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Account #1
```

Then run in Terminal 2 (while Terminal 1 is still running):

```bash
npx hardhat run scripts/grantVerifier.ts --network localhost
```

Expected output:
```
Admin (deployer): 0xf39Fd6e51aad88F6f4ce6aB8827279cffFb92266
VERIFIER_ROLE:    0x...
Granting VERIFIER_ROLE to: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 ...
Done!
```

---

## 7. Update the Contract Address in the Frontend

After deploying, you **must** update the contract address in the frontend.

1. Open `frontend/src/contracts/contract.js`.
2. Replace the address on this line with the one you copied in Step 4:

```js
export const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
//                               ↑ paste your deployed address here
```

3. You also need to copy the compiled ABI. After running `npx hardhat build`, the file is at:
   ```
   artifacts/contracts/IPProtection.sol/IPProtection.json
   ```
   Copy it to:
   ```
   frontend/src/contracts/IPProtection.json
   ```

   ```bash
   # From the root of the project:
   copy artifacts\contracts\IPProtection.sol\IPProtection.json frontend\src\contracts\IPProtection.json
   ```
   *(On Mac/Linux use `cp` instead of `copy`)*

---

## 8. Pinata (IPFS) Setup

Pinata is used to upload your files to IPFS when registering an IP. You need a free API key.

### 8.1 Create a Pinata account

1. Go to https://app.pinata.cloud and sign up for a free account.

### 8.2 Generate an API key

1. After logging in, click **API Keys** in the left sidebar.
2. Click **New Key**.
3. Toggle **Admin** on (or at minimum enable `pinFileToIPFS`).
4. Give the key a name (e.g. `iprotect-local`).
5. Click **Generate API Key**.
6. You will see a **JWT** token. **Copy it now** — it is only shown once.

### 8.3 Create the `.env` file

Inside the `frontend/` folder, create a file called `.env`:

```bash
# From the root of the project:
cd frontend
```

Create `frontend/.env` with the following content:

```env
VITE_PINATA_JWT=paste_your_jwt_token_here
```

Replace `paste_your_jwt_token_here` with the JWT you copied.

> ⚠️ **Never commit `.env` to git.** It is already in `.gitignore`. Your friends must each create their own key.

---

## 9. Frontend Setup

With the Hardhat node running (Terminal 1), install and start the frontend:

```bash
cd frontend
npm install
npm run dev
```

You should see:

```
  VITE v6.x.x  ready in xxx ms

  ➞  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser. MetaMask will prompt you to connect when you first interact with the app.

---

## 10. Accounts & Roles Quick Reference

| Account | MetaMask Label | Role | Can do |
|---|---|---|---|
| Account #0 | (e.g. "Admin") | Deployer / Admin | Register IPs, grant roles, everything |
| Account #1 | (e.g. "Verifier") | Verifier | Verify IP records (after Step 6) |
| Any other account | — | Creator / Licensee | Register IPs, receive licences |

---

## 11. Troubleshooting

### "Transaction reverted without a reason"
- Ensure `npx hardhat node` is still running.
- Ensure MetaMask is set to **Hardhat Local** (Chain ID 31337).
- Ensure the contract address in `contract.js` matches the deployed address.

### Nonce mismatch / "nonce too high"
- Restart the Hardhat node, then reset the account activity in MetaMask:
  MetaMask → Settings → Advanced → **Clear activity and nonce data**.

### Frontend shows "Could not connect to contract"
- Confirm `npx hardhat node` is running.
- Confirm the contract is deployed and the address in `contract.js` is correct.
- Confirm `IPProtection.json` has been copied to `frontend/src/contracts/`.

### IPFS upload fails
- Check that `VITE_PINATA_JWT` in `frontend/.env` is set and correct.
- Restart the dev server after changing `.env` (`npm run dev`).

### MetaMask not prompting / wrong network
- Manually switch MetaMask to **Hardhat Local**.
- Refresh the page.
