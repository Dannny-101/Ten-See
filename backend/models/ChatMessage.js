const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, index: true },
    name: String,
    email: String,
    phone: String,
    message: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    senderType: { type: String, enum: ['visitor', 'human', 'ai', 'system'], default: 'visitor' },
    isRead: { type: Boolean, default: false },
    ipAddress: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
