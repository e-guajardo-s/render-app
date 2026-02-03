// backend/models/Invitation.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const invitationSchema = new Schema({
  token: { type: String, required: true, unique: true },
  
  // --- AGREGAMOS ESTE CAMPO ---
  username: { type: String, required: true }, 
  // ---------------------------

  role: { 
    type: String, 
    enum: ['user', 'admin', 'superadmin', 'municipalidad'],
    required: true 
  },
  comuna: { type: String, default: null },
  isUsed: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  expiresAt: { type: Date, required: true }
}, {
  timestamps: true
});

const Invitation = mongoose.model('Invitation', invitationSchema);
module.exports = Invitation;