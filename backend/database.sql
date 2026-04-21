-- ═══════════════════════════════════════════════════════════════════
--   BloodChain - MySQL Database Schema
-- ═══════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS bloodchain;
USE bloodchain;

-- Users table (all roles)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role ENUM('donor', 'hospital', 'admin') NOT NULL DEFAULT 'donor',
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Donors table
CREATE TABLE IF NOT EXISTS donors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
    age INT NOT NULL,
    gender ENUM('Male','Female','Other'),
    contact VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    medical_history TEXT,
    total_donations INT DEFAULT 0,
    last_donation_date TIMESTAMP NULL,
    is_eligible BOOLEAN DEFAULT TRUE,
    is_registered_on_chain BOOLEAN DEFAULT FALSE,
    tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100) UNIQUE,
    location VARCHAR(500),
    contact VARCHAR(20),
    email VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    total_requests INT DEFAULT 0,
    total_received INT DEFAULT 0,
    tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blood units table (mirrors blockchain)
CREATE TABLE IF NOT EXISTS blood_units (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unit_id VARCHAR(66) UNIQUE NOT NULL,       -- bytes32 from blockchain
    donor_wallet VARCHAR(42) NOT NULL,
    blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
    collected_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    hospital_name VARCHAR(255),
    is_used BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blood requests table
CREATE TABLE IF NOT EXISTS blood_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(66) UNIQUE NOT NULL,    -- bytes32 from blockchain
    requester_wallet VARCHAR(42) NOT NULL,
    hospital_name VARCHAR(255),
    blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
    units_required INT NOT NULL,
    patient_name VARCHAR(255),
    urgency_level ENUM('CRITICAL','HIGH','NORMAL') DEFAULT 'NORMAL',
    status ENUM('PENDING','APPROVED','REJECTED','FULFILLED') DEFAULT 'PENDING',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    tx_hash VARCHAR(66)
);

-- Blockchain transactions log
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    tx_type VARCHAR(50) NOT NULL,              -- 'REGISTER_DONOR', 'DONATE_BLOOD', etc.
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42),
    block_number BIGINT,
    gas_used BIGINT,
    status ENUM('SUCCESS','FAILED','PENDING') DEFAULT 'PENDING',
    payload JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory view
CREATE OR REPLACE VIEW blood_inventory AS
SELECT 
    blood_group,
    COUNT(*) AS total_units,
    SUM(CASE WHEN is_used = 0 AND is_expired = 0 AND expires_at > NOW() THEN 1 ELSE 0 END) AS available_units,
    SUM(CASE WHEN is_used = 1 THEN 1 ELSE 0 END) AS used_units,
    SUM(CASE WHEN is_expired = 1 OR (is_used = 0 AND expires_at <= NOW()) THEN 1 ELSE 0 END) AS expired_units
FROM blood_units
GROUP BY blood_group;

-- Indexes
CREATE INDEX idx_donors_blood_group ON donors(blood_group);
CREATE INDEX idx_blood_units_blood_group ON blood_units(blood_group, is_used, is_expired);
CREATE INDEX idx_requests_status ON blood_requests(status);
CREATE INDEX idx_transactions_type ON transactions(tx_type);

-- Default admin user (update wallet address after deploying)
INSERT INTO users (wallet_address, name, role, email)
VALUES ('0x0000000000000000000000000000000000000001', 'Admin', 'admin', 'admin@bloodchain.io')
ON DUPLICATE KEY UPDATE name = name;

-- Sample data for development
INSERT INTO donors (wallet_address, name, blood_group, age, gender, contact, email, total_donations, is_registered_on_chain)
VALUES
  ('0xaaaa000000000000000000000000000000000001', 'Arjun Kumar', 'O+', 28, 'Male', '9876543210', 'arjun@email.com', 3, TRUE),
  ('0xaaaa000000000000000000000000000000000002', 'Priya Sharma', 'A+', 24, 'Female', '9876543211', 'priya@email.com', 1, TRUE),
  ('0xaaaa000000000000000000000000000000000003', 'Ravi Menon', 'B-', 35, 'Male', '9876543212', 'ravi@email.com', 5, TRUE),
  ('0xaaaa000000000000000000000000000000000004', 'Sneha Nair', 'AB+', 29, 'Female', '9876543213', 'sneha@email.com', 2, TRUE);

INSERT INTO hospitals (wallet_address, name, registration_number, location, contact, email, is_verified)
VALUES
  ('0xbbbb000000000000000000000000000000000001', 'Apollo Hospital Chennai', 'APCH-2024', 'Greams Road, Chennai', '04428296000', 'apollo@hospital.com', TRUE),
  ('0xbbbb000000000000000000000000000000000002', 'Fortis Malar Hospital', 'FMCH-2024', 'Adyar, Chennai', '04442893333', 'fortis@hospital.com', TRUE);

INSERT INTO blood_units (unit_id, donor_wallet, blood_group, collected_at, expires_at, hospital_name, is_used)
VALUES
  ('0xunit0000000000000000000000000000000000001', '0xaaaa000000000000000000000000000000000001', 'O+', NOW() - INTERVAL 5 DAY, NOW() + INTERVAL 37 DAY, 'Apollo Hospital Chennai', FALSE),
  ('0xunit0000000000000000000000000000000000002', '0xaaaa000000000000000000000000000000000002', 'A+', NOW() - INTERVAL 10 DAY, NOW() + INTERVAL 32 DAY, 'Apollo Hospital Chennai', FALSE),
  ('0xunit0000000000000000000000000000000000003', '0xaaaa000000000000000000000000000000000003', 'B-', NOW() - INTERVAL 2 DAY, NOW() + INTERVAL 40 DAY, 'Fortis Malar Hospital', FALSE),
  ('0xunit0000000000000000000000000000000000004', '0xaaaa000000000000000000000000000000000004', 'AB+', NOW() - INTERVAL 7 DAY, NOW() + INTERVAL 35 DAY, 'Fortis Malar Hospital', FALSE),
  ('0xunit0000000000000000000000000000000000005', '0xaaaa000000000000000000000000000000000001', 'O+', NOW() - INTERVAL 1 DAY, NOW() + INTERVAL 41 DAY, 'Apollo Hospital Chennai', FALSE);

INSERT INTO blood_requests (request_id, requester_wallet, hospital_name, blood_group, units_required, patient_name, urgency_level, status)
VALUES
  ('0xreq00000000000000000000000000000000000001', '0xbbbb000000000000000000000000000000000001', 'Apollo Hospital Chennai', 'O+', 2, 'Patient A', 'CRITICAL', 'APPROVED'),
  ('0xreq00000000000000000000000000000000000002', '0xbbbb000000000000000000000000000000000002', 'Fortis Malar Hospital', 'A+', 1, 'Patient B', 'HIGH', 'PENDING'),
  ('0xreq00000000000000000000000000000000000003', '0xbbbb000000000000000000000000000000000001', 'Apollo Hospital Chennai', 'B-', 1, 'Patient C', 'NORMAL', 'PENDING');
