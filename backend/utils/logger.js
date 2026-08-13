const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const infoLogPath = path.join(logsDir, 'app.log');
const errorLogPath = path.join(logsDir, 'error.log');

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}\n`;
}

const logger = {
  info: (message, meta) => {
    const formatted = formatMessage('info', message, meta);
    console.log(`ℹ️ ${formatted.trim()}`);
    fs.appendFileSync(infoLogPath, formatted);
  },
  warn: (message, meta) => {
    const formatted = formatMessage('warn', message, meta);
    console.warn(`⚠️ ${formatted.trim()}`);
    fs.appendFileSync(infoLogPath, formatted);
  },
  error: (message, meta) => {
    const formatted = formatMessage('error', message, meta);
    console.error(`🚨 ${formatted.trim()}`);
    fs.appendFileSync(errorLogPath, formatted);
    fs.appendFileSync(infoLogPath, formatted);
  },
};

module.exports = logger;
