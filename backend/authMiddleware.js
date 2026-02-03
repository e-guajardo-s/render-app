require('dotenv').config(); // <-- AÑADE ESTA LÍNEA AL INICIO

const jwt = require('jsonwebtoken');
const User = require('./models/User.model');
const JWT_SECRET = process.env.JWT_SECRET; // <-- Usa process.env

// --- NUEVA FUNCIÓN: Solo verifica el token ---
const verifyToken = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      
      req.user = await User.findById(decoded.id).select('-password'); 
      
      if (!req.user) {
           return res.status(401).json({ message: "Token no válido (usuario no existe)." });
      }
      next();
      
    } catch (error) {
      return res.status(401).json({ message: "Token no es válido o está expirado." });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "No hay token, autorización denegada." });
  }
};


// --- Función existente: Verifica Token Y Rol Admin (AHORA MODIFICADA) ---
const verifyTokenAndAdmin = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ message: "Token no válido (usuario no existe)." });
      }
      
      // --- LÓGICA MODIFICADA ---
      // Solo permite 'admin' o 'superadmin'
      if (user.role !== 'admin' && user.role !== 'superadmin') {
        return res.status(403).json({ message: "Acceso denegado. No tienes permisos de administrador." });
      }
      // -------------------------

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ message: "Token no es válido o está expirado." });
    }
  }
  if (!token) {
    return res.status(401).json({ message: "No hay token, autorización denegada." });
  }
};

module.exports = { verifyToken, verifyTokenAndAdmin };