const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const chatQueue = require('../services/chatQueue');

// ── AUTH MIDDLEWARE ───────────────────────────────────────────────────────────
const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'No token' });
    try {
        req.admin = jwt.verify(token, process.env.JWT_SECRET || 'tenandsee_secret');
        next();
    } catch {
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
};

// ── GET QUEUE ─────────────────────────────────────────────────────────────────
// GET /api/queue/list — all queued sessions
router.get('/list', auth, async (req, res) => {
    try {
        const queue = await chatQueue.getQueue();
        res.json({ success: true, data: queue });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── GET MY CHATS ──────────────────────────────────────────────────────────────
// GET /api/queue/mine — sessions assigned to me
router.get('/mine', auth, async (req, res) => {
    try {
        const sessions = await chatQueue.getMyChats(req.admin.id);
        // Enrich with last message preview
        const enriched = await Promise.all(sessions.map(async s => {
            const last = await ChatMessage.findOne({ sessionId: s.sessionId })
                .sort({ createdAt: -1 }).lean();
            const unread = await ChatMessage.countDocuments({
                sessionId: s.sessionId,
                isAdmin: false,
                isRead: false
            });
            return { ...s, lastMessage: last?.message || '', lastMessageAt: last?.createdAt, unreadCount: unread };
        }));
        res.json({ success: true, data: enriched });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── GET METRICS ───────────────────────────────────────────────────────────────
// GET /api/queue/metrics — live dashboard metrics
router.get('/metrics', auth, async (req, res) => {
    try {
        const [queueLength, activeChats, agents] = await Promise.all([
            ChatSession.countDocuments({ status: 'queued' }),
            ChatSession.countDocuments({ status: { $in: ['assigned', 'active'] } }),
            Admin.find({ isActive: true }).lean()
        ]);

        const agentStatus = await Promise.all(agents.map(async a => {
            const load = await ChatSession.countDocuments({
                assignedTo: a._id,
                status: { $in: ['assigned', 'active'] }
            });
            return {
                id: a._id,
                name: a.name || a.username,
                avatar: a.avatar,
                chatStatus: a.chatStatus || 'offline',
                activeChats: load,
                maxChats: a.maxChats || 3,
                avgResponseTime: a.avgResponseTime || 0,
                missedChats: a.missedChats || 0,
                lastAssignedAt: a.lastAssignedAt
            };
        }));

        res.json({
            success: true,
            data: { queueLength, activeChats, agentStatus, timestamp: new Date().toISOString() }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── SET MY CHAT STATUS ────────────────────────────────────────────────────────
// POST /api/queue/status — { status: 'online' | 'away' | 'offline' }
router.post('/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const valid = ['online', 'away', 'invisible', 'offline'];
        if (!valid.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        await chatQueue.setAgentStatus(req.admin.id, status);

        // Broadcast updated status to all admins
        const io = req.app.get('io');
        if (io) {
            io.to('all_admins').emit('agent_status_changed', {
                adminId: req.admin.id,
                adminName: req.admin.name,
                status,
                timestamp: new Date().toISOString()
            });
        }

        res.json({ success: true, status });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── ACCEPT A CHAT (manual override from queue) ────────────────────────────────
// POST /api/queue/accept/:sessionId
router.post('/accept/:sessionId', auth, async (req, res) => {
    try {
        const result = await chatQueue.acceptChat(req.params.sessionId, req.admin.id);
        if (!result.success) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── CLOSE A CHAT ──────────────────────────────────────────────────────────────
// POST /api/queue/close/:sessionId
router.post('/close/:sessionId', auth, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const closedBy = req.admin.name || req.admin.username;

        await chatQueue.closeSession(sessionId, closedBy);

        // Also add system close message
        await ChatMessage.create({
            sessionId,
            name: 'System',
            message: `Chat closed by ${closedBy}`,
            isAdmin: true,
            senderType: 'system',
            ipAddress: req.ip
        });

        // Notify visitor
        const io = req.app.get('io');
        if (io) {
            io.to(`chat_${sessionId}`).emit('chat_closed', { sessionId, closedBy });
        }

        res.json({ success: true, message: 'Chat closed' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── MANUAL ASSIGN (superadmin / supervisor) ───────────────────────────────────
// POST /api/queue/assign/:sessionId — { agentId }
router.post('/assign/:sessionId', auth, async (req, res) => {
    try {
        const { agentId } = req.body;
        if (!agentId) return res.status(400).json({ success: false, error: 'agentId required' });

        const session = await ChatSession.findOne({ sessionId: req.params.sessionId });
        if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

        const agent = await chatQueue.assignToAgent(session, agentId);
        if (!agent) return res.status(400).json({ success: false, error: 'Agent unavailable' });

        res.json({ success: true, assignedTo: agent.name || agent.username });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── UPDATE NOTIFICATION SETTINGS ──────────────────────────────────────────────
// POST /api/queue/notification-settings
router.post('/notification-settings', auth, async (req, res) => {
    try {
        const { pushEnabled, emailAlerts, whatsappAlerts, phoneNumber, maxChats } = req.body;
        const update = {};
        if (pushEnabled !== undefined) update['notificationSettings.pushEnabled'] = pushEnabled;
        if (emailAlerts !== undefined) update['notificationSettings.emailAlerts'] = emailAlerts;
        if (whatsappAlerts !== undefined) update['notificationSettings.whatsappAlerts'] = whatsappAlerts;
        if (phoneNumber !== undefined) update['notificationSettings.phoneNumber'] = phoneNumber;
        if (maxChats !== undefined) update['maxChats'] = Math.max(1, Math.min(10, parseInt(maxChats)));

        await Admin.updateOne({ _id: req.admin.id }, { $set: update });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── GET SESSION DETAIL ────────────────────────────────────────────────────────
// GET /api/queue/session/:sessionId
router.get('/session/:sessionId', auth, async (req, res) => {
    try {
        const session = await ChatSession.findOne({ sessionId: req.params.sessionId })
            .populate('assignedTo', 'name username avatar role')
            .lean();
        if (!session) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, data: session });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
