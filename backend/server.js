/**
 * BloodChain Backend Server
 * Express.js API with Blockchain + MySQL integration
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── Database ─────────────────────────────────────────────────────────────────
const mysql = require('mysql2/promise');

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
  console.log('✅ MySQL connected');
}

// ─── Blockchain Connection ─────────────────────────────────────────────────────
const { ethers } = require('ethers');

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
  "event BloodRequested(bytes32 indexed,address indexed,uint8,uint256)",
  "event RequestApproved(bytes32 indexed,bytes32[],uint256)",
];

let provider, adminWallet, contract;
async function connectBlockchain() {
  try {
    provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:7545');
    const network = await provider.getNetwork();
    console.log(`✅ Blockchain connected: Chain ID ${network.chainId}`);

    if (process.env.ADMIN_PRIVATE_KEY && process.env.CONTRACT_ADDRESS) {
      adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
      contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, adminWallet);
      console.log('✅ Smart contract loaded');
    } else {
      console.log('⚠️  CONTRACT_ADDRESS or ADMIN_PRIVATE_KEY not set — blockchain ops disabled');
    }
  } catch (err) {
    console.log('⚠️  Blockchain not reachable — running in DB-only mode');
  }
}

// ─── Blood Group Helpers ──────────────────────────────────────────────────────
const BG_MAP = { 'A+': 0, 'A-': 1, 'B+': 2, 'B-': 3, 'AB+': 4, 'AB-': 5, 'O+': 6, 'O-': 7 };
const BG_REVERSE = Object.fromEntries(Object.entries(BG_MAP).map(([k, v]) => [v, k]));

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'BloodChain API' });
});

// ── STATS ─────────────────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const [[donorRow]] = await db.query('SELECT COUNT(*) as count FROM donors WHERE is_registered_on_chain = TRUE');
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
    res.status(500).json({ error: err.message });
  }
});

// ── INVENTORY ─────────────────────────────────────────────────────────────────
app.get('/api/inventory', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM blood_inventory ORDER BY blood_group');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DONORS ────────────────────────────────────────────────────────────────────
app.get('/api/donors', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, wallet_address, name, blood_group, age, gender, total_donations, last_donation_date, is_eligible, created_at FROM donors ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/donors/register', async (req, res) => {
  const { wallet_address, name, blood_group, age, gender, contact, email, address: addr } = req.body;
  if (!wallet_address || !name || !blood_group || !age) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    let txHash = null;
    // Try blockchain registration
    if (contract) {
      try {
        const tx = await contract.registerDonor(name, BG_MAP[blood_group], age, contact || '');
        await tx.wait();
        txHash = tx.hash;
        console.log(`Blockchain TX: ${txHash}`);
      } catch (bcErr) {
        console.log('Blockchain write failed, saving to DB only:', bcErr.message);
      }
    }

    const [result] = await db.query(
      `INSERT INTO donors (wallet_address, name, blood_group, age, gender, contact, email, address, is_registered_on_chain, tx_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), blood_group=VALUES(blood_group)`,
      [wallet_address, name, blood_group, age, gender || null, contact || null, email || null, addr || null, !!txHash, txHash]
    );

    res.json({ success: true, id: result.insertId, txHash, message: 'Donor registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── BLOOD UNITS / DONATIONS ───────────────────────────────────────────────────
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
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/blood-units/donate', async (req, res) => {
  const { donor_wallet, blood_group, hospital_name } = req.body;
  if (!donor_wallet || !blood_group) return res.status(400).json({ error: 'Missing fields' });

  try {
    const unitId = '0x' + require('crypto').randomBytes(32).toString('hex');
    const collectedAt = new Date();
    const expiresAt = new Date(Date.now() + 42 * 24 * 60 * 60 * 1000);

    let txHash = null;
    if (contract) {
      try {
        const donorWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
        const donorContract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, donorWallet);
        const tx = await donorContract.donateBlood(hospital_name || 'BloodChain Center');
        await tx.wait();
        txHash = tx.hash;
      } catch (e) { console.log('BC write skipped:', e.message); }
    }

    await db.query(
      `INSERT INTO blood_units (unit_id, donor_wallet, blood_group, collected_at, expires_at, hospital_name, tx_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [unitId, donor_wallet, blood_group, collectedAt, expiresAt, hospital_name || null, txHash]
    );

    await db.query(
      `UPDATE donors SET total_donations = total_donations + 1, last_donation_date = NOW() WHERE wallet_address = ?`,
      [donor_wallet]
    );

    res.json({ success: true, unitId, txHash, expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── HOSPITALS ─────────────────────────────────────────────────────────────────
app.get('/api/hospitals', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM hospitals ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/hospitals/register', async (req, res) => {
  const { wallet_address, name, registration_number, location, contact, email } = req.body;
  if (!wallet_address || !name) return res.status(400).json({ error: 'Missing fields' });
  try {
    let txHash = null;
    if (contract) {
      try {
        const tx = await contract.registerHospital(name, location || '');
        await tx.wait();
        txHash = tx.hash;
      } catch (e) { console.log('BC write skipped:', e.message); }
    }

    const [result] = await db.query(
      `INSERT INTO hospitals (wallet_address, name, registration_number, location, contact, email, tx_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [wallet_address, name, registration_number || null, location || null, contact || null, email || null, txHash]
    );
    res.json({ success: true, id: result.insertId, txHash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/hospitals/:wallet/verify', async (req, res) => {
  try {
    await db.query('UPDATE hospitals SET is_verified = TRUE WHERE wallet_address = ?', [req.params.wallet]);
    if (contract) {
      try {
        const tx = await contract.verifyHospital(req.params.wallet);
        await tx.wait();
      } catch (e) {}
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── BLOOD REQUESTS ────────────────────────────────────────────────────────────
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
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/requests', async (req, res) => {
  const { requester_wallet, hospital_name, blood_group, units_required, patient_name, urgency_level } = req.body;
  if (!requester_wallet || !blood_group || !units_required) return res.status(400).json({ error: 'Missing fields' });

  try {
    const requestId = '0x' + require('crypto').randomBytes(32).toString('hex');
    let txHash = null;
    if (contract) {
      try {
        const tx = await contract.requestBlood(BG_MAP[blood_group], units_required, patient_name || '', urgency_level || 'NORMAL');
        await tx.wait();
        txHash = tx.hash;
      } catch (e) { console.log('BC write skipped:', e.message); }
    }

    await db.query(
      `INSERT INTO blood_requests (request_id, requester_wallet, hospital_name, blood_group, units_required, patient_name, urgency_level, tx_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [requestId, requester_wallet, hospital_name || null, blood_group, units_required, patient_name || null, urgency_level || 'NORMAL', txHash]
    );

    res.json({ success: true, requestId, txHash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/requests/:id/approve', async (req, res) => {
  try {
    await db.query(
      `UPDATE blood_requests SET status = 'APPROVED', resolved_at = NOW() WHERE request_id = ?`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/requests/:id/reject', async (req, res) => {
  try {
    await db.query(
      `UPDATE blood_requests SET status = 'REJECTED', resolved_at = NOW() WHERE request_id = ?`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TRANSACTIONS ──────────────────────────────────────────────────────────────
app.get('/api/transactions', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 50');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
async function start() {
  await connectDB();
  await connectBlockchain();
  app.listen(PORT, () => {
    console.log(`\n🩸 BloodChain API running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  });
}

start().catch(console.error);
