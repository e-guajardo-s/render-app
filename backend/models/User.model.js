// En: backend/models/User.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  password: {
    type: String,
    required: true
  },
  
  // Modificación: Añadido 'superadmin' y 'municipalidad' al enum; añadido campo 'comuna'
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin', 'municipalidad'],
    default: 'user'
  },
  comuna: {
    type: String,
    trim: true
  }
  
}, {
  timestamps: true,
});

const User = mongoose.model('User', userSchema);

module.exports = User;