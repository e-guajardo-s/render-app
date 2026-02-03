const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const fileSchema = new Schema({
    originalname: { type: String, required: true },
    filename: { type: String, required: true },
    path: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true }
}, { _id: true });

const semaphoreSchema = new Schema({
    cruce: { type: String, required: [true, 'El nombre del cruce es obligatorio'], trim: true },
    cruceId: { type: String, required: [true, 'El ID del cruce es obligatorio'], unique: true, trim: true },
    comuna: { type: String, required: true, trim: true },
    
    red: { type: String, trim: true },
    controlador: { type: String, trim: true },
    UOCT: { type: String, trim: true },
    coordenadas: {
        lat: { type: Number },
        lng: { type: Number }
    },
    
    // --- ESTADO EN TIEMPO REAL ---
    status: {
       controlador: { type: String, default: 'Desconocido' }, 
       luces: { type: String, default: 'Desconocido' },
       alimentacion: { type: String, default: 'Desconocido' },
       ups_voltaje: { type: Number, default: 0 }, 
       last_seen: { type: Date, default: Date.now }
    },
    // -----------------------------

    // Configuración de Red y MQTT
    ip_gateway: { type: String, trim: true, default: '' },
    mqtt_topic: { type: String, trim: true, default: '' },
    mqtt_config: {
        host: { type: String, trim: true, default: '' },
        port: { type: Number, default: 1883 },
        username: { type: String, trim: true, default: '' },
        password: { type: String, trim: true, default: '' }
    },

    documentos: {
        planos: [fileSchema],
        catastros: [fileSchema],
        data: [fileSchema]
    }
}, { timestamps: true });

semaphoreSchema.index({ cruce: 'text', cruceId: 'text' }); 
module.exports = mongoose.model('Semaphore', semaphoreSchema);