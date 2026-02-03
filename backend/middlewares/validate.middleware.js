// backend/middlewares/validate.middleware.js
const Joi = require('joi');
const logger = require('../utils/logger');

const validate = (schema) => {
  return (req, res, next) => {
    // Validamos el body de la petición contra el esquema
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      
      // Registramos el intento fallido (seguridad)
      logger.warn(`Validación fallida desde ${req.ip}: ${errorMessages.join(', ')}`);
      
      return res.status(400).json({ 
        message: "Error de validación de datos", 
        errors: errorMessages 
      });
    }
    
    next();
  };
};

module.exports = validate;