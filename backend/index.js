// backend/index.js
const express = require('express');
require('dotenv').config(); 
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
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
        origin: "http://localhost:5173", // URL del frontend (Vite)
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log(`Socket Conectado: ${socket.id}`);
    
    socket.on('join_room', (topic) => {
        socket.join(topic);
    });

    socket.on('disconnect', () => {
        console.log(`Socket Desconectado: ${socket.id}`);
    });
});

// Guardar 'io' en la app
app.set('socketio', io);

// --- Conexión a MongoDB Atlas ---
mongoose.connect(MONGO_URI)
  .then(async () => {
      console.log("MongoDB conectado exitosamente");

      // --- INICIO AUTOMÁTICO DE MQTT ---
      try {
          const setupDevice = await Semaphore.findOne({ 'mqtt_config.host': { $ne: '' } });
          
          if (setupDevice && setupDevice.mqtt_config) {
              console.log(`⚙️ Iniciando MQTT con credenciales de: ${setupDevice.cruceId}`);
              // Pasamos 'io' para que el servicio pueda emitir eventos al frontend
              mqttService.connectToBroker(setupDevice.mqtt_config, io);
          } else {
              console.log("⚠️ Sistema iniciado sin conexión MQTT (Esperando configuración en DB).");
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

// Autenticación - LOGIN
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

// REGISTRAR (Crear Usuario - Solo Admin)
app.post('/api/auth/register', verifyTokenAndAdmin, async (req, res) => {
    try {
        const { username, password, role, comuna } = req.body; 
        const actor = req.user; 

        if (actor.role === 'admin' && (role === 'admin' || role === 'superadmin')) {
            return res.status(403).json({ message: "Un Admin solo puede crear usuarios con rol 'user'." });
        }

        const existingUser = await User.findOne({ username: username });
        if (existingUser) {
            return res.status(400).json({ message: "El nombre de usuario ya existe." });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = new User({
            username: username,
            password: hashedPassword,
            role: role || 'user',
            comuna: comuna 
        });
        
        await newUser.save();
        res.status(201).json({ message: "Usuario creado exitosamente." });
    } catch (error) {
        console.error("Error POST /api/auth/register:", error); 
        res.status(500).json({ message: "Error interno al crear el usuario" });
    }
});

// OBTENER USUARIOS
app.get('/api/users', verifyTokenAndAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor al obtener usuarios"});
  }
});

// ACTUALIZAR ROL
app.put('/api/users/:id/role', verifyTokenAndAdmin, async (req, res) => {
    try {
        const actor = req.user; 
        const targetId = req.params.id;
        const { role: newRole } = req.body;

        if (actor.id === targetId) return res.status(403).json({ message: "No puedes modificar tu propio rol." });
        const targetUser = await User.findById(targetId);
        if (!targetUser) return res.status(404).json({ message: "Usuario objetivo no encontrado." });
        
        if (actor.role === 'admin') {
            if (targetUser.role === 'admin' || targetUser.role === 'superadmin') {
                return res.status(403).json({ message: "Un Admin no puede modificar a otro Admin o Super Admin." });
            }
            if (newRole === 'admin' || newRole === 'superadmin') {
                 return res.status(403).json({ message: "No tienes permisos para asignar este rol." });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(targetId, { role: newRole }, { new: true }).select('-password');
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar rol"});
    }
});

// ELIMINAR USUARIO
app.delete('/api/users/:id', verifyTokenAndAdmin, async (req, res) => {
    try {
        const actor = req.user; 
        const targetId = req.params.id;
        if (actor.id === targetId) return res.status(403).json({ message: "No puedes eliminarte a ti mismo." });
        
        const targetUser = await User.findById(targetId);
        if (!targetUser) return res.status(404).json({ message: "Usuario objetivo no encontrado." });

        if (actor.role === 'admin' && (targetUser.role === 'admin' || targetUser.role === 'superadmin')) {
             return res.status(403).json({ message: "Un Admin solo puede eliminar usuarios normales." });
        }

        await User.findByIdAndDelete(targetId);
        res.status(200).json({ message: "Usuario eliminado exitosamente." });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar usuario"});
    }
});

// VALIDAR TOKEN
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
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// --- Iniciar Servidor ---
httpServer.listen(PORT, () => {
  console.log(`Servidor backend (con Sockets) corriendo en http://localhost:${PORT}`);
});