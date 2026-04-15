// backend/models/TicketComment.model.js
const mongoose = require('mongoose');

const ticketCommentSchema = new mongoose.Schema({
    ticket:   { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    author:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    text:     { type: String, required: true, trim: true, maxlength: 1000 },
}, { timestamps: true });

ticketCommentSchema.index({ ticket: 1, createdAt: 1 });

module.exports = mongoose.model('TicketComment', ticketCommentSchema);
