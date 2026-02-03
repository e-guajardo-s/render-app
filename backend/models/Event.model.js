// En: backend/models/Event.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const eventSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String }, // <--- NUEVO: Descripción detallada
  date: { type: Date, required: true },
  
  semaphore: { type: Schema.Types.ObjectId, ref: 'Semaphore', required: true },
  
  // --- NUEVO: Asignación de Técnicos (Array) ---
  technicians: [{ type: Schema.Types.ObjectId, ref: 'User' }], 
  // -------------------------------------------

  type: { 
    type: String, 
    enum: ['preventivo', 'correctivo', 'otro'], 
    default: 'preventivo' 
  },
  
  status: { 
    type: String, 
    enum: ['pending', 'completed'], 
    default: 'pending' 
  },

  completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  completedAt: { type: Date },
  notes: { type: String },
  batchId: { type: String }

}, {
  timestamps: true
});

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;