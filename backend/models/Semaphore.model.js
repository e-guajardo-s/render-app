const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const fileSchema = new Schema({
    originalname: { type: String, required: true },
    filename: { type: String, required: true },
    path: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true }
}, { _id: true });

// Definimos los únicos estados aceptables para la telemetría
const ESTADOS_PERMITIDOS = ['Prendido', 'Apagado', 'Falla', 'Desconocido', 'Desc.'];

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
    
    // --- ESTADO EN TIEMPO REAL (BLINDADO) ---
    status: {
       controlador: { 
           type: String, 
           enum: { values: ESTADOS_PERMITIDOS, message: '{VALUE} no es un estado válido' },
           default: 'Desconocido',
           trim: true 
       }, 
       luces: { 
           type: String, 
           enum: { values: ESTADOS_PERMITIDOS, message: '{VALUE} no es un estado válido' },
           default: 'Desconocido',
           trim: true 
       },
       alimentacion: { 
           type: String, 
           enum: { values: ESTADOS_PERMITIDOS, message: '{VALUE} no es un estado válido' },
           default: 'Desconocido',
           trim: true 
       },
       ups_voltaje: { 
           type: Number, 
           default: 0,
           min: [0, 'El voltaje no puede ser negativo']
       },
       ups_estado: {
           type: String,
           enum: { values: ESTADOS_PERMITIDOS, message: '{VALUE} no es un estado valido' },
           default: 'Apagado',
           trim: true
       },
       ups_inicio: { type: Date, default: null }, // Momento en que empezó el respaldo UPS
       last_seen: { type: Date, default: Date.now }
    },
    // ----------------------------------------

    // Si el cruce está siendo monitoreado (espera mensajes MQTT) o no
    monitoreando: { type: Boolean, default: false },

    // Mantención programada — inhibe alertas mientras técnico trabaja
    enMantencion: { type: Boolean, default: false },
    mantencionInicio: { type: Date },
    mantencionMotivo: { type: String, trim: true },

    // Configuración de Red y MQTT por semáforo.
    // Las credenciales del broker (host, port, usuario, password) van en variables
    // de entorno del servidor (.env), no en la base de datos.
    // Cada semáforo solo necesita su topic único.
    ip_gateway: { type: String, trim: true, default: '' },
    mqtt_topic: { type: String, trim: true, default: '' },

    // Si el semáforo tiene UPS instalado
    tieneUPS: { type: Boolean, default: true },

    documentos: {
        planos: [fileSchema],
        catastros: [fileSchema],
        data: [fileSchema]
    }
}, { timestamps: true });

semaphoreSchema.index({ cruce: 'text', cruceId: 'text' }); 
module.exports = mongoose.model('Semaphore', semaphoreSchema);