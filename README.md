# 🩸 BloodChain — Decentralized Blood Bank Management System

> **Final Year Project | Anna University | Blockchain + Healthcare**
> Built with Ethereum (Solidity), Node.js, Express, React 18, MySQL 8.0, and Socket.io

---

## 📸 Features & Modern Upgrades

| Feature | Description |
|---|---|
| 🦊 Client-Side MetaMask Signing | True decentralized execution — donors & hospitals sign on-chain txs using their browser wallet |
| 🔗 Smart Contracts | Solidity contract (`BloodBank.sol`) on Ethereum — tamper-proof records with 42-day expiry |
| 🛡 Encrypted Keystore & Auth | Private keys protected in Web3 keystore JSON files (`SECURITY.md`), JWT-protected admin API routes |
| ⛓ Event-Driven DB Sync | Node.js `ethers` listener (`eventSync.js`) keeps MySQL automatically reconciled with Ethereum events |
| 📱 QR Code Unit Traceability | Generate printable QR codes embedding unit ID and provenance chain-of-custody |
| 🚨 Real-Time Socket.io Alerts | Live broadcast alerts for `CRITICAL` urgency blood requests without page refresh |
| 🗺️ Geo-Matching Map View | Visual map showing hospital locations, supply density, and local donor pools |
| 🤖 AI Demand Forecasting | FastAPI Python microservice predicting 30-day shortage trends by blood group |
| 🧩 Compatibility Matching | Transfusion rules engine surfacing compatible donor groups for requested patient types |
| 📜 Digital Certificates & CSV Export | Downloadable donor certificates of honor and automated CSV analytics export |
| 📊 Real Chain Ledger | Live, paginated transaction log showing on-chain hashes, block numbers, gas, and status |

---

## 🛠 Tech Stack

```
Frontend  : React 18, React Router, Recharts, Axios, Ethers.js v6
Backend   : Node.js, Express.js, Socket.io, MySQL2, Winston Logger, JWT
Blockchain: Solidity 0.8.19, Hardhat, Ganache
Database  : MySQL 8.0
AI Service: Python 3.11, FastAPI, Uvicorn, Scikit-Learn
```

---

## ⚙️ Environment Variables Setup

### Backend `.env` (`backend/.env`)

```env
PORT=5000
NODE_ENV=development

# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=bloodchain

# Blockchain & Keystore
BLOCKCHAIN_RPC_URL=http://127.0.0.1:7545
CONTRACT_ADDRESS=0xYourDeployedAddress
KEYSTORE_PASSWORD=your_keystore_passphrase

# JWT Security
JWT_SECRET=bloodchain_super_secret_key_2025
JWT_EXPIRES_IN=7d
ADMIN_PASSWORD=admin123

# Forecasting Microservice
FORECAST_SERVICE_URL=http://localhost:8000
```

### Frontend `.env` (`frontend/.env`)

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_DEMO_MODE=false
```

---

## 🚀 Setup & Execution Guide

### Step 1 — Install Dependencies

```bash
npm run install:all
```

### Step 2 — Initialize Database

Execute `backend/database.sql` and `backend/migrations/002_sync_state.sql` in MySQL Workbench or terminal:

```sql
source backend/database.sql;
source backend/migrations/002_sync_state.sql;
```

### Step 3 — Generate Encrypted Keystore (Fix 1.5)

```bash
cd backend
node scripts/generate-keystore.js 0xYourPrivateKey your_keystore_passphrase
```

### Step 4 — Deploy Smart Contract

```bash
npm run node # Start Hardhat node in a terminal
npm run deploy:local # In a separate terminal
```

### Step 5 — Run Test Suites (Fix 1.7)

```bash
npx hardhat test # Smart contract tests
cd backend && npm test # API integration tests
```

### Step 6 — Start Services

```bash
# Terminal 1: Backend API & Socket Server
npm run backend

# Terminal 2: React Frontend
npm run frontend

# Terminal 3 (Optional): AI Demand Forecasting Microservice
cd forecasting
python -m uvicorn main:app --port 8000
```

Open **http://localhost:3000** in your browser 🎉

---

## 📝 License & Security

Academic & Startup Open Source License — LICET / Anna University.
For security policies and threat models, see [SECURITY.md](file:///Users/jothimani/blockchain-bbms/SECURITY.md) and [CHANGELOG.md](file:///Users/jothimani/blockchain-bbms/CHANGELOG.md).
