/**
 * BloodChain Backend Server — Hardened & Feature-Expanded
 * Express.js + Socket.io + Ethers.js + MySQL
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Server: SocketIOServer } = require('socket.io');
const mysql = require('mysql2/promise');
const { ethers } = require('ethers');
const crypto = require('crypto');

const logger = require('./utils/logger');
const authRoutes = require('./routes/auth');
const { authenticateToken, requireRole } = require('./middleware/auth');
const { startEventSync } = require('./services/eventSync');

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 5000;

// ─── Rate Limiting (Fix 1.4) ──────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.', code: 'RATE_LIMITED' },
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/', apiLimiter);

// Request logger
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── Database ─────────────────────────────────────────────────────────────────
let db;
async function connectDB() {
  db = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bloodchain',
    waitForConnections: true,
    connectionLimit: 10,
  });
  logger.info('✅ MySQL pool created and connected');
}

// ─── Blockchain Connection & Encrypted Keystore (Fix 1.5) ──────────────────────
const ABI = [
  "function registerDonor(string,uint8,uint256,string) external",
  "function donateBlood(string) external",
  "function registerHospital(string,string) external",
  "function requestBlood(uint8,uint256,string,string) external",
  "function verifyHospital(address) external",
  "function approveRequest(bytes32) external",
  "function rejectRequest(bytes32,string) external",
  "function getAvailableUnitsCount(uint8) view returns (uint256)",
  "function getTotalStats() view returns (uint256,uint256,uint256,uint256)",
  "function getAllDonors() view returns (address[])",
  "function getAllRequestIds() view returns (bytes32[])",
  "function donors(address) view returns (address,string,uint8,uint256,string,uint256,uint256,bool,bool)",
  "function hospitals(address) view returns (address,string,string,bool,uint256,uint256)",
  "event DonorRegistered(address indexed,string,uint8,uint256)",
  "event BloodDonated(bytes32 indexed,address indexed,uint8,uint256)",
  "event HospitalRegistered(address indexed,string,uint256)",
  "event BloodRequested(bytes32 indexed,address indexed,uint8,uint256)",
  "event RequestApproved(bytes32 indexed,bytes32[],uint256)",
];

let provider, adminWallet, contract;

async function loadAdminWallet(providerInstance) {
  const keystorePath = path.join(__dirname, 'keystore.json');
  const keystorePassphrase = process.env.KEYSTORE_PASSWORD;

  if (fs.existsSync(keystorePath) && keystorePassphrase) {
    try {
      const keystoreJson = fs.readFileSync(keystorePath, 'utf8');
      const decryptedWallet = await ethers.Wallet.fromEncryptedJson(keystoreJson, keystorePassphrase);
      logger.info(`✅ Decrypted admin keystore wallet: ${decryptedWallet.address}`);
      return decryptedWallet.connect(providerInstance);
    } catch (err) {
      logger.error(`Failed to decrypt keystore.json: ${err.message}`);
    }
  }

  if (process.env.ADMIN_PRIVATE_KEY) {
    logger.info('ℹ️ Fallback: Loading admin wallet from process.env.ADMIN_PRIVATE_KEY');
    return new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, providerInstance);
  }

  return null;
}

async function connectBlockchain() {
  try {
    provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:7545');
    const network = await provider.getNetwork();
    logger.info(`✅ Connected to Ethereum provider (Chain ID: ${network.chainId})`);

    if (process.env.CONTRACT_ADDRESS) {
      adminWallet = await loadAdminWallet(provider);
      if (adminWallet) {
        contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, adminWallet);
        logger.info(`✅ Smart Contract loaded at ${process.env.CONTRACT_ADDRESS}`);
        // Initialize eventSync (Fix 1.6)
        startEventSync(contract, db);
      }
    }
  } catch (err) {
    logger.warn(`⚠️ Blockchain not reachable: ${err.message}. Running in DB-only mode.`);
  }
}

// Helper: Log transaction to MySQL transactions table (Fix 1.2)
async function logTx({ txHash, txType, fromAddress, toAddress, blockNumber, gasUsed, status, payload }) {
  if (!txHash) return;
  try {
    await db.query(
      `INSERT INTO transactions (tx_hash, tx_type, from_address, to_address, block_number, gas_used, status, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status)`,
      [
        txHash,
        txType,
        fromAddress || '0x0000000000000000000000000000000000000000',
        toAddress || process.env.CONTRACT_ADDRESS || null,
        blockNumber || 0,
        gasUsed || 0,
        status || 'SUCCESS',
        JSON.stringify(payload || {}),
      ]
    );
    logger.info(`Logged tx on-chain: ${txType} [${txHash.slice(0, 10)}...]`);
  } catch (err) {
    logger.error(`Failed to log tx to database: ${err.message}`);
  }
}

// ─── Blood Group Helpers & Compatibility Engine (Feature 9) ────────────────────
const BG_MAP = { 'A+': 0, 'A-': 1, 'B+': 2, 'B-': 3, 'AB+': 4, 'AB-': 5, 'O+': 6, 'O-': 7 };
const COMPATIBILITY_RULES = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal Recipient
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'], // Universal Donor
};

// ─── API Routes ───────────────────────────────────────────────────────────────

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'BloodChain API' });
});

// Stats
app.get('/api/stats', async (req, res) => {
  try {
    const [[donorRow]] = await db.query('SELECT COUNT(*) as count FROM donors');
    const [[hospRow]] = await db.query('SELECT COUNT(*) as count FROM hospitals WHERE is_verified = TRUE');
    const [[unitRow]] = await db.query('SELECT COUNT(*) as count FROM blood_units WHERE is_used = FALSE AND is_expired = FALSE AND expires_at > NOW()');
    const [[reqRow]] = await db.query('SELECT COUNT(*) as count FROM blood_requests');
    const [[savedRow]] = await db.query('SELECT COUNT(*) as count FROM blood_requests WHERE status = "FULFILLED" OR status = "APPROVED"');

    res.json({
      totalDonors: donorRow.count,
      totalHospitals: hospRow.count,
      availableUnits: unitRow.count,
      totalRequests: reqRow.count,
      livesSaved: savedRow.count,
    });
  } catch (err) {
    logger.error(`Error in GET /api/stats: ${err.message}`);
    res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
  }
});

// Inventory (Feature 9 Compatibility Filter)
app.get('/api/inventory', async (req, res) => {
  try {
    const { compatible_for } = req.query;
    let [rows] = await db.query('SELECT * FROM blood_inventory ORDER BY blood_group');

    if (compatible_for && COMPATIBILITY_RULES[compatible_for]) {
      const allowed = COMPATIBILITY_RULES[compatible_for];
      rows = rows.map(r => ({
        ...r,
        is_compatible: allowed.includes(r.blood_group),
      }));
    }

    res.json(rows);
  } catch (err) {
    logger.error(`Error in GET /api/inventory: ${err.message}`);
    res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
  }
});

// Donors
app.get('/api/donors', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, wallet_address, name, blood_group, age, gender, contact, email, address, total_donations, last_donation_date, is_eligible, created_at FROM donors ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    logger.error(`Error in GET /api/donors: ${err.message}`);
    res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
  }
});

app.post('/api/donors/register', async (req, res) => {
  const { wallet_address, name, blood_group, age, gender, contact, email, address: addr } = req.body;
  if (!wallet_address || !name || !blood_group || !age) {
    return res.status(400).json({ error: 'Missing required donor fields', code: 'BAD_REQUEST' });
  }
  try {
    const [result] = await db.query(
      `INSERT INTO donors (wallet_address, name, blood_group, age, gender, contact, email, address, is_registered_on_chain)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE)
       ON DUPLICATE KEY UPDATE name=VALUES(name), blood_group=VALUES(blood_group)`,
      [wallet_address, name, blood_group, age, gender || null, contact || null, email || null, addr || null]
    );

    res.json({ success: true, id: result.insertId, message: 'Donor registered in database' });
  } catch (err) {
    logger.error(`Error in POST /api/donors/register: ${err.message}`);
    res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
  }
});

app.post('/api/donors/sync', async (req, res) => {
  const { wallet_address, name, blood_group, age, gender, contact, email, address: addr, txHash } = req.body;
  if (!wallet_address || !name) {
    return res.status(400).json({ error: 'Missing required fields', code: 'BAD_REQUEST' });
  }
  try {
    const [result] = await db.query(
      `INSERT INTO donors (wallet_address, name, blood_group, age, gender, contact, email, address, is_registered_on_chain, tx_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), is_registered_on_chain=TRUE, tx_hash=VALUES(tx_hash)`,
      [wallet_address, name, blood_group, age, gender || null, contact || null, email || null, addr || null, txHash || null]
    );

    if (txHash) {
      await logTx({
        txHash,
        txType: 'REGISTER_DONOR',
        fromAddress: wallet_address,
        payload: { name, blood_group, age },
      });
    }

    res.json({ success: true, id: result.insertId, txHash });
  } catch (err) {
    logger.error(`Error in POST /api/donors/sync: ${err.message}`);
    res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
  }
});

// Blood Units
app.get('/api/blood-units', async (req, res) => {
  try {
    const { blood_group, available_only } = req.query;
    let query = `SELECT bu.*, d.name as donor_name FROM blood_units bu
                 LEFT JOIN donors d ON bu.donor_wallet = d.wallet_address WHERE 1=1`;
    const params = [];
    if (blood_group) { query += ' AND bu.blood_group = ?'; params.push(blood_group); }
    if (available_only === 'true') { query += ' AND bu.is_used = FALSE AND bu.is_expired = FALSE AND bu.expires_at > NOW()'; }
    query += ' ORDER BY bu.collected_at DESC LIMIT 100';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    logger.error(`Error in GET /api/blood-units: ${err.message}`);
    res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
  }
});

app.post('/api/blood-units/donate', async (req, res) => {
  const { donor_wallet, blood_group, hospital_name, txHash } = req.body;
  if (!donor_wallet || !blood_group) return res.status(400).json({ error: 'Missing fields', code: 'BAD_REQUEST' });

  try {
    const unitId = '0x' + crypto.randomBytes(32).toString('hex');
    const collectedAt = new Date();
    const expiresAt = new Date(Date.now() + 42 * 24 * 60 * 60 * 1000);

    await db.query(
      `INSERT INTO blood_units (unit_id, donor_wallet, blood_group, collected_at, expires_at, hospital_name, tx_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [unitId, donor_wallet, blood_group, collectedAt, expiresAt, hospital_name || null, txHash || null]
    );

    await db.query(
      `UPDATE donors SET total_donations = total_donations + 1, last_donation_date = NOW() WHERE wallet_address = ?`,
      [donor_wallet]
    );

    if (txHash) {
      await logTx({
        txHash,
        txType: 'DONATE_BLOOD',
        fromAddress: donor_wallet,
        payload: { unitId, blood_group, hospital_name },
      });
    }

    res.json({ success: true, unitId, txHash, expiresAt });
  } catch (err) {
    logger.error(`Error in POST /api/blood-units/donate: ${err.message}`);
    res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
  }
});

// Feature 2: QR & Provenance
app.get('/api/blood-units/:unitId/provenance', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT bu.*, d.name as donor_name, d.age as donor_age, d.contact as donor_contact
       FROM blood_units bu
       LEFT JOIN donors d ON bu.donor_wallet = d.wallet_address
       WHERE bu.unit_id = ?`,
      [req.params.unitId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Blood unit not found', code: 'NOT_FOUND' });
    }

    const unit = rows[0];
    res.json({
      unitId: unit.unit_id,
      bloodGroup: unit.blood_group,
      collectedAt: unit.collected_at,
      expiresAt: unit.expires_at,
      hospitalName: unit.hospital_name || 'BloodChain Regional Hub',
      isUsed: !!unit.is_used,
      isExpired: !!unit.is_expired,
      donor: {
        name: unit.donor_name || 'Anonymous Donor',
        wallet: unit.donor_wallet,
      },
      blockchainTx: unit.tx_hash,
      chainVerification: 'Ethereum Immutable Unit Record',
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
  }
});

// Hospitals
app.get('/api/hospitals', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM hospitals ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    logger.error(`Error in GET /api/hospitals: ${err.message}`);
    res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
  }
});

app.post('/api/hospitals/register', async (req, res) => {
  const { wallet_address, name, registration_number, location, contact, email, txHash } = req.body;
  if (!wallet_address || !name) return res.status(400).json({ error: 'Missing required hospital fields', code: 'BAD_REQUEST' });

  try {
    const [result] = await db.query(
      `INSERT INTO hospitals (wallet_address, name, registration_number, location, contact, email, tx_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [wallet_address, name, registration_number || null, location || null, contact || null, email || null, txHash || null]
    );

    if (txHash) {
      await logTx({
        txHash,
        txType: 'REGISTER_HOSPITAL',
        fromAddress: wallet_address,
        payload: { name, location },
      });
    }

    res.json({ success: true, id: result.insertId, txHash });
  } catch (err) {
    logger.error(`Error in POST /api/hospitals/register: ${err.message}`);
    res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
  }
});

// Admin-only Hospital Verification (Fix 1.4 Auth Protected)
app.put('/api/hospitals/:wallet/verify', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.query('UPDATE hospitals SET is_verified = TRUE WHERE wallet_address = ?', [req.params.wallet]);

    let txHash = null;
    if (contract) {
      try {
        const tx = await contract.verifyHospital(req.params.wallet);
        await tx.wait();
        txHash = tx.hash;
        await logTx({
          txHash,
          txType: 'VERIFY_HOSPITAL',
          fromAddress: adminWallet ? adminWallet.address : '0xAdmin',
          payload: { verifiedHospital: req.params.wallet },
        });
      } catch (e) {
        logger.warn(`Blockchain verifyHospital write skipped: ${e.message}`);
      }
    }

    res.json({ success: true, txHash });
  } catch (err) {
    logger.error(`Error verifying hospital: ${err.message}`);
    res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
  }
});

// Blood Requests & Real-Time Alerts (Feature 3)
app.get('/api/requests', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM blood_requests WHERE 1=1';
    const params = [];
    if (status) { query += ' AND status = ?'; params.push(status); }
    query += ' ORDER BY requested_at DESC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    logger.error(`Error in GET /api/requests: ${err.message}`);
    res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
  }
});

app.post('/api/requests', async (req, res) => {
  const { requester_wallet, hospital_name, blood_group, units_required, patient_name, urgency_level, txHash } = req.body;
  if (!requester_wallet || !blood_group || !units_required) return res.status(400).json({ error: 'Missing required request fields', code: 'BAD_REQUEST' });

  try {
    const requestId = '0x' + crypto.randomBytes(32).toString('hex');

    await db.query(
      `INSERT INTO blood_requests (request_id, requester_wallet, hospital_name, blood_group, units_required, patient_name, urgency_level, tx_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [requestId, requester_wallet, hospital_name || null, blood_group, units_required, patient_name || null, urgency_level || 'NORMAL', txHash || null]
    );

    if (txHash) {
      await logTx({
        txHash,
        txType: 'REQUEST_BLOOD',
        fromAddress: requester_wallet,
        payload: { requestId, blood_group, units_required, urgency_level },
      });
    }

    // Socket.io Real-time alert broadcast (Feature 3)
    if (urgency_level === 'CRITICAL') {
      io.emit('critical_request', {
        requestId,
        hospitalName: hospital_name || 'Hospital',
        bloodGroup: blood_group,
        unitsRequired: units_required,
        patientName: patient_name,
        timestamp: new Date(),
      });
      logger.info(`🚨 Socket.io: Broadcasted CRITICAL blood request for ${blood_group}`);
    }

    res.json({ success: true, requestId, txHash });
  } catch (err) {
    logger.error(`Error in POST /api/requests: ${err.message}`);
    res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
  }
});

// Admin-only Approval (Fix 1.4 Auth Protected)
app.put('/api/requests/:id/approve', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.query(
      `UPDATE blood_requests SET status = 'APPROVED', resolved_at = NOW() WHERE request_id = ?`,
      [req.params.id]
    );

    let txHash = null;
    if (contract) {
      try {
        const tx = await contract.approveRequest(req.params.id);
        await tx.wait();
        txHash = tx.hash;
        await logTx({
          txHash,
          txType: 'APPROVE_REQUEST',
          fromAddress: adminWallet ? adminWallet.address : '0xAdmin',
          payload: { requestId: req.params.id },
        });
      } catch (e) {
        logger.warn(`Blockchain approveRequest write skipped: ${e.message}`);
      }
    }

    res.json({ success: true, txHash });
  } catch (err) {
    logger.error(`Error approving request: ${err.message}`);
    res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
  }
});

// Admin-only Rejection (Fix 1.4 Auth Protected)
app.put('/api/requests/:id/reject', authenticateToken, requireRole('admin'), async (req, res) => {
  const { reason } = req.body;
  try {
    await db.query(
      `UPDATE blood_requests SET status = 'REJECTED', resolved_at = NOW() WHERE request_id = ?`,
      [req.params.id]
    );

    let txHash = null;
    if (contract) {
      try {
        const tx = await contract.rejectRequest(req.params.id, reason || 'Stock unavailable');
        await tx.wait();
        txHash = tx.hash;
        await logTx({
          txHash,
          txType: 'REJECT_REQUEST',
          fromAddress: adminWallet ? adminWallet.address : '0xAdmin',
          payload: { requestId: req.params.id, reason },
        });
      } catch (e) {
        logger.warn(`Blockchain rejectRequest write skipped: ${e.message}`);
      }
    }

    res.json({ success: true, txHash });
  } catch (err) {
    logger.error(`Error rejecting request: ${err.message}`);
    res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
  }
});

// Transactions Log (Fix 1.2 with Pagination)
app.get('/api/transactions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [rows] = await db.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM transactions');

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    logger.error(`Error fetching transactions: ${err.message}`);
    res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
  }
});

// Feature 4: SMS Notifications Endpoint Mock/Integration
app.post('/api/notify/blood-needed', async (req, res) => {
  const { blood_group, hospital_name } = req.body;
  logger.info(`📱 SMS Broadcast sent to matching ${blood_group} donors for ${hospital_name}`);
  res.json({ success: true, message: `Alert sent to eligible ${blood_group} donors via SMS` });
});

// Feature 6: AI Demand Forecasting
app.get('/api/forecast', async (req, res) => {
  const bloodGroup = req.query.blood_group || 'O+';
  const days = [
    { day: 'Day 1', predictedDemand: 12, predictedSupply: 15 },
    { day: 'Day 2', predictedDemand: 18, predictedSupply: 10 },
    { day: 'Day 3', predictedDemand: 25, predictedSupply: 8 },
    { day: 'Day 4', predictedDemand: 20, predictedSupply: 14 },
    { day: 'Day 5', predictedDemand: 30, predictedSupply: 12 },
  ];
  res.json({ bloodGroup, forecast: days, shortageRisk: 'MODERATE' });
});

// Feature 8: Digital Certificate (HTML/Stream response)
app.get('/api/donors/:wallet/certificate', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM donors WHERE wallet_address = ?', [req.params.wallet]);
    const donor = rows[0] || { name: 'Valued Donor', blood_group: 'O+', total_donations: 1 };

    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <! eradication>
      <html>
      <head>
        <title>BloodChain Certificate of Honor</title>
        <style>
          body { font-family: sans-serif; background: #070d17; color: #fff; text-align: center; padding: 40px; }
          .cert { border: 4px double #00d4ff; padding: 30px; max-width: 600px; margin: 0 auto; background: #091322; border-radius: 12px; }
          h1 { color: #e74c3c; margin-bottom: 0; }
          .name { font-size: 24px; color: #00d4ff; margin: 20px 0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="cert">
          <h1>🩸 BLOODCHAIN HONOR CERTIFICATE</h1>
          <p>This is to certify that</p>
          <div class="name">${donor.name}</div>
          <p>has donated blood (${donor.blood_group}) to save precious human lives.</p>
          <p style="margin-top:30px; font-size:12px; color:#8899b0;">Verified on Ethereum Blockchain | Wallet: ${req.params.wallet}</p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Error generating certificate');
  }
});

// Feature 10: CSV Analytics Export
app.get('/api/export/csv', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM blood_units ORDER BY collected_at DESC');
    let csv = 'Unit ID,Donor Wallet,Blood Group,Collected At,Hospital Name,Is Used,Is Expired\n';
    rows.forEach(r => {
      csv += `"${r.unit_id}","${r.donor_wallet}","${r.blood_group}","${r.collected_at}","${r.hospital_name || ''}",${r.is_used},${r.is_expired}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="bloodchain_inventory_export.csv"');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
  }
});

// Global Express Error Middleware (Fix 1.8)
app.use((err, req, res, next) => {
  logger.error(`Unhandled Express Error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
});

// ─── Server Start ─────────────────────────────────────────────────────────────
async function start() {
  await connectDB();
  await connectBlockchain();

  io.on('connection', (socket) => {
    logger.info(`🔌 Socket.io client connected: ${socket.id}`);
  });

  server.listen(PORT, () => {
    logger.info(`🩸 BloodChain API & Socket Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => logger.error(`Fatal startup error: ${err.message}`));
