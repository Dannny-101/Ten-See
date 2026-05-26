const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true, index: true },
    name: String,
    email: String,
    phone: String,
    topic: { type: String, default: 'General' },
    priorityScore: { type: Number, default: 0 }, // 0=normal, 10=VIP
    status: { type: String, enum: ['queued', 'assigned', 'active', 'closed'], default: 'queued' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    assignedAt: Date,
    firstReplyAt: Date,
    lastAgentResponseAt: Date,
    lastVisitorMessageAt: Date,
    queueEnteredAt: { type: Date, default: Date.now },
    agentTimeoutAt: Date,
    rotateCount: { type: Number, default: 0 },
    requeuedAt: Date,
    visitorSocketId: String,
    agentName: String,
    waitTimeEstimate: String,
    closedAt: Date,
    closedBy: String, // admin name or 'visitor'
    resolution: String,
    csat: Number,
    tags: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatSession', chatSessionSchema);
