const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, index: true },
    name: String,
    email: String,
    message: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    ipAddress: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
