// backend/schemas/auth.schema.js
const Joi = require('joi');

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    'string.base': 'El usuario debe ser texto',
    'string.alphanum': 'El usuario solo puede contener letras y números',
    'string.min': 'El usuario debe tener al menos 3 caracteres',
    'string.max': 'El usuario no puede tener más de 30 caracteres',
    'any.required': 'El usuario es obligatorio'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'La contraseña debe tener al menos 6 caracteres',
    'any.required': 'La contraseña es obligatoria'
  }),
  role: Joi.string().valid('user', 'admin', 'superadmin').default('user'),
  comuna: Joi.string().required().messages({
    'any.required': 'La comuna es obligatoria'
  })
});

const loginSchema = Joi.object({
  username: Joi.string().required().messages({
    'any.required': 'El usuario es obligatorio'
  }),
  password: Joi.string().required().messages({
    'any.required': 'La contraseña es obligatoria'
  })
});

module.exports = { registerSchema, loginSchema };