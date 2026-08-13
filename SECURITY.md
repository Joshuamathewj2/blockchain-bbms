# 🛡️ BloodChain Security Posture & Documentation

## Security Architecture Overview

BloodChain implements defense-in-depth measures across smart contract execution, backend API authentication, private key management, and database syncing.

---

## 1. Private Key Protection (Encrypted Keystore)

- **Issue Addressed:** Storing raw Ethereum private keys in unencrypted `.env` files presents severe leakage risks in CI/CD pipelines and repositories.
- **Implementation:**
  - Administrative signer keys are stored in an encrypted JSON keystore (`backend/keystore.json`) adhering to Web3 Secret Storage Definition (PBKDF2 / Scrypt key derivation).
  - Keystores are decrypted only at runtime using the `KEYSTORE_PASSWORD` environment variable.
  - Production deployments should migrate from environment passphrases to a hardware security module (HSM) or secrets management vault (e.g. AWS KMS, HashiCorp Vault, Azure Key Vault).

---

## 2. Authentication & Role-Based Access Control (RBAC)

- **JWT Tokens:** Admin endpoints (`/api/hospitals/:wallet/verify`, `/api/requests/:id/approve`, `/api/requests/:id/reject`) are protected using JSON Web Tokens (JWT) signed with HS256 algorithm.
- **Roles:**
  - `admin`: Full authority to verify hospitals, mark expired units, update eligibility, and approve/reject blood allocation requests.
  - `hospital`: Authenticated institutions permitted to place blood requests.
  - `donor`: Verified individuals capable of scheduling blood unit donations.

---

## 3. Client-Side Wallet Signing (MetaMask Integration)

- **Decentralization:** User actions (`registerDonor`, `donateBlood`, `registerHospital`, `requestBlood`) are signed directly by the user's browser wallet via MetaMask (`window.ethereum`).
- **Access Control:** Smart contract access modifiers (`onlyRegisteredDonor`, `onlyVerifiedHospital`, `donorEligible`) directly verify `msg.sender`, eliminating single-relayer authorization bypass bugs.

---

## 4. Rate Limiting & Denial of Service Protection

- Public write endpoints (`/api/donors/register`, `/api/blood-units/donate`, `/api/requests`) enforce IP-based rate limiting (100 requests per 15-minute window) using Express middleware to prevent DoS attacks and spam.

---

## 5. Event-Driven Database Synchronization

- To prevent race conditions or partial failures from desynchronizing MySQL from Ethereum state, an on-chain event listener (`eventSync.js`) monitors `BloodBank.sol` contract events (`DonorRegistered`, `BloodDonated`, `RequestApproved`, `HospitalRegistered`).
- On-chain events serve as the ultimate single source of truth; MySQL automatically reconciles state if HTTP endpoints fail midway.
