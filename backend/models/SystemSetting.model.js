const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const systemSettingSchema = new Schema({
    key: { type: String, required: true, unique: true }, // Ej: 'network_master_pass'
    value: { type: String, required: true } // Aquí guardaremos el HASH de la contraseña
}, { timestamps: true });

module.exports = mongoose.model('SystemSetting', systemSettingSchema);