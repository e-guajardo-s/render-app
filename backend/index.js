// backend/index.js
const express = require('express');
require('dotenv').config(); 
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path'); // <--- IMPORTANTE: Asegúrate de que esto esté aquí
const { createServer } = require('http');
const { Server } = require("socket.io");

// --- Importar Rutas ---
const settingsRoutes = require('./routes/settings.routes');
const mqttLogRoutes = require('./routes/mqttLog.routes');
const semaphoreRoutes = require('./routes/semaphore.routes');
const statusLogRoutes = require('./routes/statuslog.routes');
const documentRoutes = require('./routes/document.routes.js');
const ticketRoutes = require('./routes/ticket.routes');
const eventRoutes = require('./routes/event.routes');
const notificationRoutes = require('./routes/notification.routes');
const invitationRoutes = require('./routes/invitation.routes');

// --- Servicios y Modelos ---
const mqttService = require('./services/mqttService');
const User = require('./models/User.model');
const Semaphore = require('./models/Semaphore.model'); 
const StatusLog = require('./models/StatusLog.model');
const Notification = require('./models/Notification.model');

// --- Middlewares Personalizados ---
const { verifyToken, verifyTokenAndAdmin } = require('./authMiddleware'); 

// --- Configuración Inicial ---
const app = express();
const PORT = process.env.PORT || 5000; 
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;

// --- Middlewares Express ---
app.use(cors());
app.use(express.json());

// --- Configuración de Servidor HTTP y Socket.IO ---
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        // En producción permitimos el mismo origen, en desarrollo localhost
        origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log(`Socket Conectado: ${socket.id}`);
    socket.on('join_room', (topic) => {
        socket.join(topic);
        console.log(`Socket ${socket.id} se unió a: ${topic}`);
    });
    socket.on('disconnect', () => {
        console.log(`Socket Desconectado: ${socket.id}`);
    });
});

app.set('socketio', io);

// --- Conexión a MongoDB Atlas ---
mongoose.connect(MONGO_URI)
  .then(async () => {
      console.log("MongoDB conectado exitosamente");
      try {
          const setupDevice = await Semaphore.findOne({ 'mqtt_config.host': { $ne: '' } });
          if (setupDevice && setupDevice.mqtt_config) {
              console.log(`⚙️ Iniciando MQTT con credenciales de: ${setupDevice.cruceId}`);
              mqttService.connectToBroker(setupDevice.mqtt_config, io);
          } else {
              console.log("⚠️ Sistema iniciado sin conexión MQTT.");
          }
      } catch (error) {
          console.error("Error al intentar iniciar MQTT:", error);
      }
  })
  .catch(err => console.error("Error al conectar a MongoDB:", err));

// --- RUTAS API (HTTP) ---
app.get('/api', (req, res) => {
  res.json({ message: "Hola desde el Backend!" });
});

// Autenticación (Login)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username });
    if (!user) return res.status(400).json({ message: "Usuario o contraseña incorrectos." });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Usuario o contraseña incorrectos." });
    
    const payload = { id: user.id, username: user.username, role: user.role, comuna: user.comuna };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
    
    res.status(200).json({
      message: "Login exitoso",
      token: token,
      username: user.username,
      role: user.role,
      comuna: user.comuna
    });
  } catch (error) {
    res.status(500).json({ message: "Error interno en el servidor"});
  }
});

// Registrar (Solo Admin)
app.post('/api/auth/register', verifyTokenAndAdmin, async (req, res) => {
    try {
        const { username, password, role, comuna } = req.body; 
        const actor = req.user; 
        if (actor.role === 'admin' && (role === 'admin' || role === 'superadmin')) {
            return res.status(403).json({ message: "No autorizado." });
        }
        const existingUser = await User.findOne({ username: username });
        if (existingUser) return res.status(400).json({ message: "Usuario existe." });
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ username, password: hashedPassword, role: role || 'user', comuna });
        
        await newUser.save();
        res.status(201).json({ message: "Usuario creado." });
    } catch (error) {
        res.status(500).json({ message: "Error interno" });
    }
});

// Rutas de Usuario
app.get('/api/users', verifyTokenAndAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.status(200).json(users);
  } catch (error) { res.status(500).json({ message: "Error al obtener usuarios"}); }
});

app.put('/api/users/:id/role', verifyTokenAndAdmin, async (req, res) => {
    try {
        const { role: newRole } = req.body;
        const updatedUser = await User.findByIdAndUpdate(req.params.id, { role: newRole }, { new: true }).select('-password');
        res.status(200).json(updatedUser);
    } catch (error) { res.status(500).json({ message: "Error actualizando rol"}); }
});

app.delete('/api/users/:id', verifyTokenAndAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Usuario eliminado." });
    } catch (error) { res.status(500).json({ message: "Error eliminando usuario"}); }
});

app.get('/api/auth/me', verifyToken, (req, res) => {
    res.status(200).json(req.user);
});

// --- Usar Rutas de la App ---
app.use('/api/semaphores', semaphoreRoutes);
app.use('/api/statuslog', statusLogRoutes);
app.use('/api/docs', documentRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/mqtt-logs', mqttLogRoutes);
app.use('/api/settings', settingsRoutes);

// --- DEPLOYMENT CONFIG (Servir Frontend) ---
// 1. Decirle a Express dónde están los archivos estáticos del build de React
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// 2. Ruta "Catch-All" para React Router (SOLUCIÓN EXPRESS 5)
// Cualquier ruta que no sea API, devuelve el index.html
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// --- Iniciar Servidor ---
httpServer.listen(PORT, () => {
  console.log(`Servidor backend (con Sockets) corriendo en puerto ${PORT}`);
});