# 📜 BloodChain Changelog

All notable changes, fixes, and feature additions to the BloodChain project are documented in this file.

---

## [1.1.0] - Phase 1 Bug Fixes & Hardening

### 🚨 Critical Bug Fixes
- **Client-Side MetaMask Signing (Fix 1.1):** Replaced single-admin backend transaction relaying with native in-browser MetaMask signing (`WalletContext.js`, `WalletConnect.js`). User calls to `registerDonor`, `donateBlood`, `registerHospital`, and `requestBlood` now correctly execute with the user's `msg.sender` on Ethereum.
- **Real Blockchain Transaction Ledger (Fix 1.2):** Replaced hardcoded `DEMO_TXS` array in `Blockchain.js` with live, paginated database queries against `/api/transactions`. Backend now logs every confirmed transaction on-chain into the `transactions` MySQL table via `logTx()`.
- **Explicit Demo Mode & Error States (Fix 1.3):** Removed silent mock fallbacks. Created `ErrorBanner.js` component to visually alert users of backend failures. Introduced `REACT_APP_DEMO_MODE=true` environment flag for explicit demo toggling.
- **JWT Authentication & RBAC (Fix 1.4):** Implemented JWT authentication (`auth.js` middleware, `POST /api/auth/login`) protecting admin operations (`verifyHospital`, `approveRequest`, `rejectRequest`). Added `express-rate-limit` against DDoS and endpoint spam.
- **Encrypted Keystore Management (Fix 1.5):** Replaced raw `ADMIN_PRIVATE_KEY` `.env` storage with encrypted Web3 keystore file (`keystore.json`). Decrypted at server boot using `KEYSTORE_PASSWORD`. Created `SECURITY.md` and `scripts/generate-keystore.js`.
- **Event-Driven Database Sync (Fix 1.6):** Created `eventSync.js` service listening to `DonorRegistered`, `BloodDonated`, `HospitalRegistered`, `RequestApproved` contract events to ensure MySQL automatically self-heals and remains in sync with the Ethereum blockchain.
- **Automated Test Suites (Fix 1.7):** Added Hardhat contract unit test suite (`test/BloodBank.test.js`) and API integration tests (`backend/tests/api.test.js`).
- **Structured Logging & Error Handling (Fix 1.8):** Added `winston` file/console logger (`utils/logger.js`) and Express error-handling middleware.

---

## [1.2.0] - Phase 2 Feature Additions

### ✨ New Features
1. **MetaMask Wallet Onboarding:** Added wallet status indicator, network switch guard (Chain ID 1337), and auto-detecting account switch listeners in `WalletContext.js`.
2. **QR Code Blood Traceability:** Added unit QR code generation and provenance lookup (`GET /api/blood-units/:unitId/provenance`) with printable label modals in `Inventory.js`.
3. **Real-Time Critical Alerts (Socket.io):** Integrated Socket.io server broadcasting `critical_request` events when `CRITICAL` urgency requests are created.
4. **SMS/WhatsApp Notifications:** Added SMS notification API endpoints (`/api/notify/blood-needed`, `/api/notify/cooldown-over`).
5. **Geo-Matching Map View:** Added interactive map page (`Map.js`) visualizing hospital locations, donor pool density, and regional blood supply clusters in the Chennai region.
6. **AI Demand Forecasting Microservice:** Created FastAPI Python service (`forecasting/main.py`) predicting 30-day blood group demand/shortage trends using seasonal ML models.
7. **Decentralized Storage (IPFS):** Integrated IPFS upload endpoints (`/api/ipfs/upload`) for donor/hospital documents.
8. **Digital Donor Certificates:** Created digital certificate generator (`GET /api/donors/:wallet/certificate`) for downloadable donor certificates of honor.
9. **Compatibility Matching Engine:** Built blood compatibility rules engine (`COMPATIBILITY_RULES`) allowing hospitals to query compatible donor groups (`GET /api/inventory?compatible_for=O+`).
10. **Analytics Export (CSV & PDF):** Added CSV exporter (`GET /api/export/csv`) for exporting donation/inventory reports.
