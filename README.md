# 🩸 BloodChain — Decentralized Blood Bank Management System

> **Final Year Project | Anna University | Blockchain + Healthcare**
> Built with Ethereum (Solidity), Node.js, React, MySQL

---

## 📸 Features

| Feature | Description |
|---|---|
| 🔗 Smart Contracts | Solidity contract on Ethereum — tamper-proof records |
| 👤 Donor Registry | Register donors with blood group, on-chain identity |
| 🩸 Blood Donations | Record each unit as an immutable blockchain entry |
| 🏥 Hospital Network | Admin-verified hospitals with wallet-based auth |
| 📋 Blood Requests | Hospital requests approved via smart contract |
| 📊 Live Inventory | Real-time blood availability by group |
| ⛓ Chain Ledger | Full transaction history on the blockchain |
| 🌑 Dark UI | Crimson + Cyber dark theme, fully responsive |

---

## 🛠 Tech Stack

```
Frontend  : React 18, React Router, Recharts, Axios
Backend   : Node.js, Express.js, MySQL2, Ethers.js v6
Blockchain: Solidity 0.8.19, Hardhat, Ganache
Database  : MySQL 8.0
```

---

## ⚙️ Prerequisites — Install These First

1. **Node.js 18+** → https://nodejs.org
2. **MySQL 8.0** → https://dev.mysql.com/downloads/
3. **Ganache** (GUI) → https://trufflesuite.com/ganache/ *(or use Hardhat node)*
4. **MetaMask** (browser) → https://metamask.io *(optional, for wallet interaction)*

---

## 🚀 Setup & Run — Step by Step

### Step 1 — Clone & Install Dependencies

```bash
# In the project root folder (bloodchain/)
npm run install:all
```

This installs: Hardhat (root) + Express packages (backend) + React packages (frontend)

---

### Step 2 — Setup MySQL Database

Open MySQL Workbench or terminal:

```bash
mysql -u root -p
```

Then run the schema file:

```sql
source /path/to/bloodchain/backend/database.sql
```

Or copy-paste the contents of `backend/database.sql` into MySQL Workbench and execute.

---

### Step 3 — Start Ganache (Local Blockchain)

**Option A — Ganache GUI:**
1. Open Ganache
2. Click "Quickstart Ethereum"
3. Note the RPC URL (default: `http://127.0.0.1:7545`) and any account's private key

**Option B — Hardhat Node (terminal):**
```bash
npm run node
# RPC will be at http://127.0.0.1:8545
```

---

### Step 4 — Deploy Smart Contract

```bash
# For Ganache GUI:
npm run deploy:ganache

# For Hardhat node:
npm run deploy:local
```

✅ This will:
- Compile `BloodBank.sol`
- Deploy to local chain
- Print the **CONTRACT_ADDRESS**
- Auto-save ABI to `frontend/src/utils/BloodBankABI.json`

---

### Step 5 — Configure Backend `.env`

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password   # ← change this
DB_NAME=bloodchain

BLOCKCHAIN_RPC_URL=http://127.0.0.1:7545   # or 8545 for hardhat
CONTRACT_ADDRESS=0xYourDeployedAddress      # ← from Step 4 output
ADMIN_PRIVATE_KEY=0xYourGanachePrivateKey   # ← first account in Ganache

JWT_SECRET=bloodchain_secret_2025
JWT_EXPIRES_IN=7d
```

---

### Step 6 — Start Backend

```bash
# Open a new terminal
npm run backend
# Server starts at http://localhost:5000
```

Test it:
```bash
curl http://localhost:5000/api/health
# → {"status":"ok","service":"BloodChain API"}
```

---

### Step 7 — Start Frontend

```bash
# Open another terminal
npm run frontend
# React app starts at http://localhost:3000
```

Open **http://localhost:3000** in your browser 🎉

---

## 📁 Project Structure

```
bloodchain/
├── contracts/
│   └── BloodBank.sol          ← Solidity smart contract
├── scripts/
│   └── deploy.js              ← Hardhat deploy script
├── artifacts/                 ← Auto-generated after compile
├── hardhat.config.js
├── package.json               ← Root (Hardhat + scripts)
│
├── backend/
│   ├── server.js              ← Express API server
│   ├── database.sql           ← MySQL schema + seed data
│   ├── .env.example           ← Environment template
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.js             ← Router + Layout
    │   ├── App.css            ← Dark design system
    │   ├── index.js
    │   ├── pages/
    │   │   ├── Dashboard.js   ← Stats + Charts
    │   │   ├── Donors.js      ← Donor registry
    │   │   ├── Hospitals.js   ← Hospital management
    │   │   ├── Inventory.js   ← Blood unit ledger
    │   │   ├── Requests.js    ← Blood request workflow
    │   │   └── Blockchain.js  ← Chain transaction log
    │   └── utils/
    │       └── api.js         ← Axios API helpers
    └── package.json
```

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Server health check |
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/inventory` | Blood inventory by group |
| GET | `/api/donors` | All registered donors |
| POST | `/api/donors/register` | Register a new donor |
| POST | `/api/blood-units/donate` | Record a blood donation |
| GET | `/api/hospitals` | All hospitals |
| POST | `/api/hospitals/register` | Register a hospital |
| PUT | `/api/hospitals/:wallet/verify` | Admin: verify hospital |
| GET | `/api/requests` | All blood requests |
| POST | `/api/requests` | Create blood request |
| PUT | `/api/requests/:id/approve` | Admin: approve request |
| PUT | `/api/requests/:id/reject` | Admin: reject request |

---

## 🧠 Smart Contract Functions

```solidity
// Donor
registerDonor(name, bloodGroup, age, contact)   // Gas: ~154k
donateBlood(hospitalName)                        // Gas: ~98k

// Hospital
registerHospital(name, location)                 // Gas: ~134k
requestBlood(bloodGroup, units, patient, urgency)// Gas: ~112k

// Admin
verifyHospital(address)                          // Gas: ~43k
approveRequest(requestId)                        // Gas: ~87k
rejectRequest(requestId, reason)                 // Gas: ~45k

// View (free)
getAvailableUnitsCount(bloodGroup)
getTotalStats()
getAllDonors()
```

---

## 🎯 Project Architecture

```
MetaMask Wallet
      ↓
React Frontend (localhost:3000)
      ↓ Axios HTTP
Express Backend (localhost:5000)
      ↓              ↓
   MySQL DB      Ethers.js
  (bloodchain)       ↓
               Smart Contract
               (BloodBank.sol)
                    ↓
             Ethereum Network
            (Ganache / Hardhat)
```

---

## 📊 Smart Contract — Data Flow

```
Donor Registration
  → registerDonor() on-chain
  → DonorRegistered event emitted
  → Stored in MySQL donors table

Blood Donation
  → donateBlood() on-chain
  → BloodUnit created with 42-day expiry
  → BloodDonated event emitted
  → Stored in MySQL blood_units table

Hospital Request
  → requestBlood() on-chain
  → BloodRequested event emitted
  → Admin reviews → approveRequest()
  → Units assigned and marked used
```

---

## 🏆 For Viva / Presentation

**Key Points to Highlight:**
1. **Decentralization** — No single point of failure for blood records
2. **Immutability** — Once donated, blood records cannot be altered
3. **Transparency** — All transactions visible on blockchain
4. **Smart Contracts** — Automated verification and allocation
5. **42-day Expiry** — Enforced by contract, not manual process
6. **Dual Storage** — MySQL for fast queries, Blockchain for trust

---

## 📝 License

Academic Project — LICET / Anna University
