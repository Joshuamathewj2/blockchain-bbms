const logger = require('../utils/logger');

const BG_REVERSE = { 0: 'A+', 1: 'A-', 2: 'B+', 3: 'B-', 4: 'AB+', 5: 'AB-', 6: 'O+', 7: 'O-' };

function startEventSync(contract, db) {
  if (!contract || !db) {
    logger.warn('EventSync initialization skipped: Contract or DB connection unavailable');
    return;
  }

  logger.info('⛓ EventSync service initializing listeners...');

  // Event: DonorRegistered(address indexed donor, string name, BloodGroup bloodGroup, uint256 timestamp)
  contract.on('DonorRegistered', async (donorAddress, name, bloodGroup, timestamp, event) => {
    try {
      const bg = BG_REVERSE[Number(bloodGroup)] || 'A+';
      const txHash = event.log ? event.log.transactionHash : null;

      logger.info(`EventSync: DonorRegistered caught on-chain for ${donorAddress}`, { txHash });

      await db.query(
        `INSERT INTO donors (wallet_address, name, blood_group, age, is_registered_on_chain, tx_hash)
         VALUES (?, ?, ?, 25, TRUE, ?)
         ON DUPLICATE KEY UPDATE is_registered_on_chain = TRUE, tx_hash = COALESCE(VALUES(tx_hash), tx_hash)`,
        [donorAddress, name, bg, txHash]
      );
    } catch (err) {
      logger.error(`EventSync error processing DonorRegistered: ${err.message}`);
    }
  });

  // Event: BloodDonated(bytes32 indexed unitId, address indexed donor, BloodGroup bloodGroup, uint256 timestamp)
  contract.on('BloodDonated', async (unitId, donorAddress, bloodGroup, timestamp, event) => {
    try {
      const bg = BG_REVERSE[Number(bloodGroup)] || 'A+';
      const txHash = event.log ? event.log.transactionHash : null;
      const collectedAt = new Date(Number(timestamp) * 1000);
      const expiresAt = new Date(collectedAt.getTime() + 42 * 24 * 60 * 60 * 1000);

      logger.info(`EventSync: BloodDonated caught on-chain for unit ${unitId}`, { txHash });

      await db.query(
        `INSERT INTO blood_units (unit_id, donor_wallet, blood_group, collected_at, expires_at, tx_hash)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE is_used = is_used`,
        [unitId, donorAddress, bg, collectedAt, expiresAt, txHash]
      );

      await db.query(
        `UPDATE donors SET total_donations = total_donations + 1, last_donation_date = ? WHERE wallet_address = ?`,
        [collectedAt, donorAddress]
      );
    } catch (err) {
      logger.error(`EventSync error processing BloodDonated: ${err.message}`);
    }
  });

  // Event: HospitalRegistered(address indexed hospital, string name, uint256 timestamp)
  contract.on('HospitalRegistered', async (hospitalAddress, name, timestamp, event) => {
    try {
      const txHash = event.log ? event.log.transactionHash : null;
      logger.info(`EventSync: HospitalRegistered caught on-chain for ${hospitalAddress}`);

      await db.query(
        `INSERT INTO hospitals (wallet_address, name, is_verified, tx_hash)
         VALUES (?, ?, FALSE, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        [hospitalAddress, name, txHash]
      );
    } catch (err) {
      logger.error(`EventSync error processing HospitalRegistered: ${err.message}`);
    }
  });

  // Event: RequestApproved(bytes32 indexed requestId, bytes32[] unitIds, uint256 timestamp)
  contract.on('RequestApproved', async (requestId, unitIds, timestamp, event) => {
    try {
      logger.info(`EventSync: RequestApproved caught on-chain for request ${requestId}`);
      await db.query(
        `UPDATE blood_requests SET status = 'APPROVED', resolved_at = NOW() WHERE request_id = ?`,
        [requestId]
      );
    } catch (err) {
      logger.error(`EventSync error processing RequestApproved: ${err.message}`);
    }
  });

  logger.info('✅ EventSync active and listening for smart contract events');
}

module.exports = { startEventSync };
