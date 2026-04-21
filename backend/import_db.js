const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'bloodchain',
    });
    console.log('Connected to MySQL');
    const sql = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
    const statements = sql.split(';').filter(s => s.trim() !== '');
    for (const statement of statements) {
      await connection.query(statement);
    }
    console.log('Database imported successfully');
    await connection.end();
  } catch (err) {
    console.error('Import failed:', err.message);
    process.exit(1);
  }
}

run();
