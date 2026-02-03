const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ticketSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  
  // --- NUEVOS CAMPOS PARA LA MIGRACIÓN ---
  cruceId: { type: String, default: null }, // El ID del semáforo (ej: "CR-05")
  origin: { 
      type: String, 
      enum: ['web_admin', 'map_report', 'iot_auto'], 
      default: 'web_admin' 
  },
  // ---------------------------------------

  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'resolved'], 
    default: 'pending' 
  },
  
  priority: { 
      type: String, 
      enum: ['Baja', 'Media', 'Alta', 'Critica'], 
      default: 'Media' 
  },

  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  municipalityName: { type: String },

  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  acceptedAt: { type: Date },
  resolvedAt: { type: Date },
  resolutionNote: { type: String }

}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);