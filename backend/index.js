// backend/index.js
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const logger = require('./utils/logger');

// --- Importar Rutas ---
const authRoutes        = require('./routes/auth.routes');
const userRoutes        = require('./routes/user.routes');
const settingsRoutes    = require('./routes/settings.routes');
const mqttLogRoutes     = require('./routes/mqttLog.routes');
const semaphoreRoutes   = require('./routes/semaphore.routes');
const statusLogRoutes   = require('./routes/statuslog.routes');
const documentRoutes    = require('./routes/document.routes.js');
const ticketRoutes      = require('./routes/ticket.routes');
const eventRoutes       = require('./routes/event.routes');
const notificationRoutes = require('./routes/notification.routes');
const invitationRoutes      = require('./routes/invitation.routes');
const auditRoutes           = require('./routes/audit.routes');
const ticketCommentRoutes   = require('./routes/ticketComment.routes');
const systemNoticeRoutes    = require('./routes/systemNotice.routes');

// --- Servicios y Modelos ---
const mqttService = require('./services/mqttService');
const MqttLog = require('./models/MqttLog.model');

// ─────────────────────────────────────────────────────────────────
// CONFIGURACIÓN INICIAL
// ─────────────────────────────────────────────────────────────────
const app        = express();
const PORT       = process.env.PORT || 5000;
const MONGO_URI  = process.env.MONGO_URI;
const IS_PROD    = process.env.NODE_ENV === 'production';

// ─────────────────────────────────────────────────────────────────
// SEGURIDAD: HELMET
// ─────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// ─────────────────────────────────────────────────────────────────
// SEGURIDAD: CORS
// En producción acepta solo el dominio de CloudFront.
// En desarrollo acepta localhost:5173 (Vite dev server).
// ─────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = IS_PROD
  ? [process.env.FRONTEND_URL].filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:4173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // mobile/Postman/curl
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    logger.warn(`CORS bloqueado para origen: ${origin}`);
    callback(new Error(`Origen ${origin} no permitido por CORS`));
  },
  credentials: true,
}));

// ─────────────────────────────────────────────────────────────────
// RATE LIMITING
// ─────────────────────────────────────────────────────────────────

// Limiter estricto solo para login (evita fuerza bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,                   // 20 intentos de login por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Espera 15 minutos.' },
  skipSuccessfulRequests: true, // No cuenta los intentos exitosos
});

// Limiter para la API general (consultas normales de la app)
// 2000 requests por 15 min es suficiente para uso normal multi-tab
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas peticiones. Inténtalo en 15 minutos.' },
  skip: (req) => {
    // No aplicar rate limit a rutas de socket.io
    return req.path.startsWith('/socket.io');
  }
});

app.use('/api/auth/login', authLimiter);  // Estricto solo en login
app.use('/api/', generalLimiter);          // General para todo lo demás

// ─────────────────────────────────────────────────────────────────
// MIDDLEWARES GENERALES
// ─────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set('trust proxy', 1); // confiar en proxy ALB para IP real

// ─────────────────────────────────────────────────────────────────
// SERVIDOR HTTP + SOCKET.IO
// ─────────────────────────────────────────────────────────────────
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: IS_PROD ? ALLOWED_ORIGINS : ['http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: IS_PROD ? ['websocket'] : ['polling', 'websocket'],
});

io.on('connection', (socket) => {
  // Solo loguear en desarrollo para no generar I/O innecesario en prod
  if (!IS_PROD) logger.info(`Socket conectado: ${socket.id}`);
  socket.on('join_room', (topic) => {
    socket.join(topic);
  });
  socket.on('disconnect', () => {
    if (!IS_PROD) logger.info(`Socket desconectado: ${socket.id}`);
  });
});

app.set('socketio', io);

// ─────────────────────────────────────────────────────────────────
// CONEXIÓN MONGODB ATLAS
// ─────────────────────────────────────────────────────────────────
mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  .then(async () => {
    logger.info('MongoDB conectado exitosamente');
    try {
      const mqttConfig = {
        host:     process.env.MQTT_HOST,
        port:     process.env.MQTT_PORT || 1883,
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
      };
      if (mqttConfig.host) {
        logger.info(`Iniciando conexión MQTT hacia: ${mqttConfig.host}`);
        mqttService.connectToBroker(mqttConfig, io);
      } else {
        logger.warn('Sistema iniciado sin MQTT. Falta MQTT_HOST en variables de entorno.');
      }
    } catch (error) {
      logger.error('Error al iniciar MQTT:', error);
    }
  })
  .catch(err => logger.error('Error al conectar a MongoDB:', err));

// ─────────────────────────────────────────────────────────────────
// JOB NOCTURNO: LIMPIEZA DE MQTT LOGS A LAS 00:00
// Borra todos los registros del día anterior a medianoche exacta.
// ─────────────────────────────────────────────────────────────────
function scheduleNightlyMqttCleanup() {
  const now = new Date();
  // Calcular milisegundos hasta la próxima medianoche local
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // mañana
    0, 0, 0, 0         // 00:00:00.000
  );
  const msUntilMidnight = nextMidnight.getTime() - now.getTime();

  setTimeout(async () => {
    try {
      const result = await MqttLog.deleteMany({});
      logger.info(`[MQTT Cleanup] Limpieza nocturna ejecutada. ${result.deletedCount} registros eliminados.`);
    } catch (err) {
      logger.error('[MQTT Cleanup] Error en limpieza nocturna:', err);
    }
    // Reprogramar para la próxima medianoche (bucle diario)
    scheduleNightlyMqttCleanup();
  }, msUntilMidnight);

  const horasRestantes = (msUntilMidnight / 1000 / 60 / 60).toFixed(2);
  logger.info(`[MQTT Cleanup] Próxima limpieza en ${horasRestantes}h (medianoche local).`);
}

scheduleNightlyMqttCleanup();

// ─────────────────────────────────────────────────────────────────
// RUTAS API
// ─────────────────────────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.json({ message: 'render-app API online', env: process.env.NODE_ENV });
});

// Usar routers dedicados (sin duplicar lógica en este archivo)
app.use('/api/auth',         authRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/semaphores',   semaphoreRoutes);
app.use('/api/statuslog',    statusLogRoutes);
app.use('/api/docs',         documentRoutes);
app.use('/api/tickets/:ticketId/comments', ticketCommentRoutes);
app.use('/api/tickets',      ticketRoutes);
app.use('/api/events',       eventRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/invitations',  invitationRoutes);
app.use('/api/mqtt-logs',    mqttLogRoutes);
app.use('/api/settings',     settingsRoutes);
app.use('/api/audit',        auditRoutes);

// ─────────────────────────────────────────────────────────────────
// SERVIR FRONTEND (solo en desarrollo local)
// En producción el frontend vive en S3/CloudFront.
// ─────────────────────────────────────────────────────────────────
if (!IS_PROD) {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
  });
}

// ─────────────────────────────────────────────────────────────────
// MANEJO DE ERRORES
// ─────────────────────────────────────────────────────────────────
app.use('/api/notices',      systemNoticeRoutes);
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Ruta de API no encontrada' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('Error crítico no capturado:', { message: err.message, stack: err.stack });
  res.status(500).json({
    message: IS_PROD ? 'Error interno del servidor.' : err.message,
  });
});

// ─────────────────────────────────────────────────────────────────
// ARRANQUE
// ─────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  logger.info(`Servidor corriendo en puerto ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
