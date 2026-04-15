// backend/utils/logger.js
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// En producción los logs van a /var/log/render-app (creado por setup_ec2.sh).
// En desarrollo van a backend/logs/ (creado automáticamente aquí).
const LOG_DIR = process.env.NODE_ENV === 'production'
  ? '/var/log/render-app'
  : path.join(__dirname, '../logs');

// Crear directorio de logs si no existe (solo en desarrollo)
if (process.env.NODE_ENV !== 'production') {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'render-app-backend' },
  transports: [
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,  // 5 MB máximo por archivo
      maxFiles: 3,                 // conservar 3 archivos históricos
    }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

// En desarrollo mostrar en consola con colores
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${message}${metaStr}`;
      })
    ),
  }));
}

module.exports = logger;
