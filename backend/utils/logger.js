// backend/utils/logger.js
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: 'info', // Nivel mínimo a registrar
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }), // Capturar stack trace en errores
    winston.format.json()
  ),
  defaultMeta: { service: 'traffic-light-backend' },
  transports: [
    // Escribir todos los logs con nivel `error` o inferior en `error.log`
    new winston.transports.File({ filename: path.join(__dirname, '../logs/error.log'), level: 'error' }),
    // Escribir todos los logs en `combined.log`
    new winston.transports.File({ filename: path.join(__dirname, '../logs/combined.log') }),
  ],
});

// Si no estamos en producción, también mostrar en consola con colores
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

module.exports = logger;