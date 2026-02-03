// backend/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User.model');
const logger = require('../utils/logger');
const { verifyToken, verifyTokenAndAdmin } = require('../authMiddleware');
const validate = require('../middlewares/validate.middleware');
const { registerSchema, loginSchema } = require('../schemas/auth.schema');

// Limitador estricto solo para login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20, 
  message: { message: "Demasiados intentos de inicio de sesión." }
});

// LOGIN
router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (!user) {
        logger.warn(`Login fallido (usuario no existe): ${username}`);
        return res.status(400).json({ message: "Usuario o contraseña incorrectos." });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        logger.warn(`Login fallido (pass incorrecta): ${username}`);
        return res.status(400).json({ message: "Usuario o contraseña incorrectos." });
    }
    
    const payload = { id: user.id, username: user.username, role: user.role, comuna: user.comuna };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
    
    logger.info(`Usuario logueado: ${username}`);
    res.status(200).json({ message: "Login exitoso", token, ...payload });
  } catch (error) {
    next(error);
  }
});

// REGISTER (Solo Admin)
router.post('/register', verifyTokenAndAdmin, validate(registerSchema), async (req, res, next) => {
    try {
        const { username, password, role, comuna } = req.body; 
        const actor = req.user; 

        if (actor.role === 'admin' && (role === 'admin' || role === 'superadmin')) {
            return res.status(403).json({ message: "Un Admin solo puede crear usuarios 'user'." });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ message: "El usuario ya existe." });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = new User({ username, password: hashedPassword, role: role || 'user', comuna });
        await newUser.save();
        
        logger.info(`Usuario creado: ${username} por ${actor.username}`);
        res.status(201).json({ message: "Usuario creado exitosamente." });
    } catch (error) {
        next(error);
    }
});

// VERIFICAR TOKEN
router.get('/me', verifyToken, (req, res) => {
    res.status(200).json(req.user);
});

module.exports = router;