/**
 * Script to generate an encrypted keystore file from a private key or random key
 * Usage: node scripts/generate-keystore.js [private_key] [password]
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function generateKeystore() {
  const privateKey = process.argv[2] || process.env.ADMIN_PRIVATE_KEY || '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d';
  const password = process.argv[3] || process.env.KEYSTORE_PASSWORD || 'bloodchain_admin_password_2025';

  console.log('🔒 Encrypting wallet key into keystore JSON...');

  const wallet = new ethers.Wallet(privateKey);
  const jsonKeystore = await wallet.encrypt(password);

  const outputPath = path.join(__dirname, '../keystore.json');
  fs.writeFileSync(outputPath, jsonKeystore, 'utf8');

  console.log('✅ Keystore saved successfully to backend/keystore.json');
  console.log('   Wallet Address:', wallet.address);
}

generateKeystore().catch(console.error);
