const Admin = require('../models/Admin');
const ChatSession = require('../models/ChatSession');

// SLA thresholds (ms)
const SLA = {
    FIRST_RESPONSE_MS: (parseInt(process.env.CHAT_FRT_SLA_SECONDS) || 90) * 1000,
    AGENT_IDLE_MS: (parseInt(process.env.CHAT_ART_SLA_MINUTES) || 5) * 60 * 1000,
    ROTATION_LIMIT: parseInt(process.env.CHAT_ROTATION_LIMIT) || 3,
    MAX_QUEUE: parseInt(process.env.CHAT_MAX_QUEUE_LENGTH) || 20,
    SLA_CHECK_INTERVAL_MS: 15 * 1000 // check every 15s
};

// In-memory socket registry: adminId -> socketId (set from server.js)
const agentSockets = new Map(); // adminId -> socket object

let _io = null;
let _pager = null;
let _slaTimer = null;

// ── INIT ──────────────────────────────────────────────────────────────────────
function init(io, pager) {
    _io = io;
    _pager = pager;
    if (_slaTimer) clearInterval(_slaTimer);
    _slaTimer = setInterval(checkSLAs, SLA.SLA_CHECK_INTERVAL_MS);
    console.log('[ChatQueue] Initialized. SLA checker running every', SLA.SLA_CHECK_INTERVAL_MS / 1000, 's');
}

// ── AGENT REGISTRY ────────────────────────────────────────────────────────────
function registerAgentSocket(adminId, socket) {
    agentSockets.set(adminId.toString(), socket);
}

function unregisterAgentSocket(adminId) {
    agentSockets.delete(adminId.toString());
}

function isAgentSocketConnected(adminId) {
    const s = agentSockets.get(adminId.toString());
    return s && s.connected;
}

// ── CORE ASSIGNMENT ALGORITHM ─────────────────────────────────────────────────
// Returns the best admin doc to assign, or null if none available
async function pickAgent(excludeAdminId = null) {
    const onlineAdmins = await Admin.find({
        chatStatus: 'online',
        isActive: true,
        ...(excludeAdminId ? { _id: { $ne: excludeAdminId } } : {})
    }).lean();

    // Filter to socket-connected admins only
    const connected = onlineAdmins.filter(a => isAgentSocketConnected(a._id.toString()));

    if (connected.length === 0) return null;

    // Enrich with real active chat count
    const enriched = await Promise.all(connected.map(async a => {
        const load = await ChatSession.countDocuments({
            assignedTo: a._id,
            status: { $in: ['assigned', 'active'] }
        });
        return { ...a, load };
    }));

    // Filter out maxed agents
    const available = enriched.filter(a => a.load < (a.maxChats || 3));
    if (available.length === 0) return null;

    // Tier 1: lowest load
    const minLoad = Math.min(...available.map(a => a.load));
    const leastBusy = available.filter(a => a.load === minLoad);

    // Tier 2: among least-busy, sort by who was assigned longest ago (fairness)
    leastBusy.sort((a, b) => {
        const ta = a.lastAssignedAt ? new Date(a.lastAssignedAt).getTime() : 0;
        const tb = b.lastAssignedAt ? new Date(b.lastAssignedAt).getTime() : 0;
        return ta - tb; // oldest assignment first
    });

    // Tier 3: controlled randomness — shuffle within 60s window to prevent bias
    const WINDOW_MS = 60 * 1000;
    const now = Date.now();
    const recentlyAssigned = leastBusy.filter(a =>
        a.lastAssignedAt && (now - new Date(a.lastAssignedAt).getTime()) < WINDOW_MS
    );
    const pool = recentlyAssigned.length > 0 ? recentlyAssigned : leastBusy;

    return pool[Math.floor(Math.random() * pool.length)];
}

// ── ENQUEUE (called when visitor sends first message) ─────────────────────────
async function enqueue(sessionId, visitorInfo = {}) {
    try {
        const now = new Date();

        // Upsert session with queued status
        let session = await ChatSession.findOneAndUpdate(
            { sessionId },
            {
                $setOnInsert: {
                    sessionId,
                    queueEnteredAt: now,
                    createdAt: now
                },
                $set: {
                    name: visitorInfo.name || 'Visitor',
                    email: visitorInfo.email || null,
                    phone: visitorInfo.phone || null,
                    topic: visitorInfo.topic || 'General',
                    lastVisitorMessageAt: now,
                    // Only set to queued if not already assigned/active
                }
            },
            { upsert: true, new: true }
        );

        // Don't re-queue if already assigned or active
        if (session.status === 'assigned' || session.status === 'active') {
            return session;
        }

        if (session.status !== 'queued') {
            session.status = 'queued';
            session.queueEnteredAt = now;
            await session.save();
        }

        // Try immediate assignment
        await tryAssign(session);

        // Broadcast queue update to all admins
        broadcastQueueMetrics();

        return await ChatSession.findOne({ sessionId });
    } catch (err) {
        console.error('[ChatQueue] enqueue error:', err.message);
    }
}

// ── ASSIGN SESSION TO AN AGENT ────────────────────────────────────────────────
async function tryAssign(session) {
    const agent = await pickAgent();
    if (!agent) {
        // No one available — send queue position to visitor
        await sendQueuePosition(session.sessionId);
        return null;
    }

    return await assignToAgent(session, agent._id.toString());
}

async function assignToAgent(session, adminId) {
    try {
        const now = new Date();
        const agent = await Admin.findById(adminId);
        if (!agent) return null;

        // Update session
        session.status = 'assigned';
        session.assignedTo = agent._id;
        session.assignedAt = now;
        session.agentName = agent.name || agent.username;
        session.agentTimeoutAt = new Date(now.getTime() + SLA.FIRST_RESPONSE_MS);
        await session.save();

        // Update agent stats
        await Admin.updateOne(
            { _id: agent._id },
            {
                $set: { lastAssignedAt: now },
                $inc: { activeChatCount: 1 }
            }
        );

        // Notify agent via socket
        const agentSocket = agentSockets.get(adminId.toString());
        if (agentSocket && agentSocket.connected) {
            agentSocket.emit('chat_assigned', {
                sessionId: session.sessionId,
                visitorName: session.name,
                visitorEmail: session.email,
                visitorPhone: session.phone,
                topic: session.topic,
                waitedMs: now - session.queueEnteredAt,
                assignedAt: now.toISOString()
            });
        }

        // Notify visitor that agent is assigned
        if (_io) {
            _io.to(`chat_${session.sessionId}`).emit('agent_assigned', {
                sessionId: session.sessionId,
                agentName: agent.name || agent.username,
                agentAvatar: agent.avatar || null,
                message: `${agent.name || agent.username} has joined the chat`
            });
        }

        // Trigger pager (WhatsApp + push)
        if (_pager) {
            _pager.notifyAssignment(agent, session).catch(e =>
                console.error('[ChatQueue] pager error:', e.message)
            );
        }

        console.log(`[ChatQueue] Session ${session.sessionId} assigned to ${agent.name || agent.username}`);
        broadcastQueueMetrics();
        return agent;
    } catch (err) {
        console.error('[ChatQueue] assignToAgent error:', err.message);
        return null;
    }
}

// ── AGENT ACCEPTS / ACTIVATES CHAT ───────────────────────────────────────────
async function acceptChat(sessionId, adminId) {
    try {
        const session = await ChatSession.findOne({ sessionId });
        if (!session) return { success: false, error: 'Session not found' };

        if (session.status === 'closed') return { success: false, error: 'Chat already closed' };

        // If it's assigned to someone else, only superadmins can override
        if (session.assignedTo && session.assignedTo.toString() !== adminId.toString()) {
            return { success: false, error: 'Chat assigned to another agent' };
        }

        session.status = 'active';
        session.assignedTo = adminId;
        session.assignedAt = session.assignedAt || new Date();
        session.agentTimeoutAt = null; // Clear timeout — agent is now active
        const agent = await Admin.findById(adminId).lean();
        session.agentName = agent?.name || agent?.username || 'Agent';
        await session.save();

        // Ensure activeChatCount is accurate
        await Admin.updateOne({ _id: adminId }, { $set: { lastAssignedAt: new Date() } });

        // Notify visitor
        if (_io) {
            _io.to(`chat_${sessionId}`).emit('admin_connected', {
                sessionId,
                adminName: session.agentName
            });
        }

        broadcastQueueMetrics();
        return { success: true, session };
    } catch (err) {
        console.error('[ChatQueue] acceptChat error:', err.message);
        return { success: false, error: err.message };
    }
}

// ── MARK AGENT REPLIED (track FRT and ART) ───────────────────────────────────
async function recordAgentReply(sessionId, adminId) {
    try {
        const now = new Date();
        const session = await ChatSession.findOne({ sessionId });
        if (!session) return;

        const update = {
            lastAgentResponseAt: now,
            agentTimeoutAt: new Date(now.getTime() + SLA.AGENT_IDLE_MS)
        };

        if (!session.firstReplyAt) {
            update.firstReplyAt = now;
            // Record FRT on agent stats
            const frtSeconds = Math.round((now - session.assignedAt) / 1000);
            const agent = await Admin.findById(adminId);
            if (agent) {
                const newAvg = agent.avgResponseTime
                    ? Math.round((agent.avgResponseTime + frtSeconds) / 2)
                    : frtSeconds;
                await Admin.updateOne({ _id: adminId }, { $set: { avgResponseTime: newAvg } });
            }
        }

        // Promote to active if still assigned
        if (session.status === 'assigned') update.status = 'active';

        await ChatSession.updateOne({ sessionId }, { $set: update });
    } catch (err) {
        console.error('[ChatQueue] recordAgentReply error:', err.message);
    }
}

// ── ROTATE CHAT (SLA breach — move to next agent) ────────────────────────────
async function rotateChat(session) {
    try {
        const oldAgentId = session.assignedTo;

        if (session.rotateCount >= SLA.ROTATION_LIMIT) {
            // Max rotations hit — close with system message
            await closeSession(session.sessionId, 'system_unavailable');
            if (_io) {
                _io.to(`chat_${session.sessionId}`).emit('chat_unavailable', {
                    sessionId: session.sessionId,
                    message: "All our agents are currently busy. Please leave a message and we'll get back to you shortly."
                });
            }
            console.log(`[ChatQueue] Session ${session.sessionId} closed after ${SLA.ROTATION_LIMIT} rotation attempts`);
            return;
        }

        // Decrement old agent's count
        if (oldAgentId) {
            await Admin.updateOne(
                { _id: oldAgentId },
                { $inc: { missedChats: 1, activeChatCount: -1 }, $set: { lastMissedAt: new Date() } }
            );
        }

        const oldAgentName = session.agentName;

        // Re-queue
        session.status = 'queued';
        session.assignedTo = null;
        session.assignedAt = null;
        session.agentName = null;
        session.agentTimeoutAt = null;
        session.rotateCount += 1;
        session.requeuedAt = new Date();
        await session.save();

        console.log(`[ChatQueue] Rotating session ${session.sessionId} (attempt ${session.rotateCount}/${SLA.ROTATION_LIMIT}), old agent: ${oldAgentName}`);

        // Try assigning to next agent (excluding old one)
        const newAgent = await pickAgent(oldAgentId);
        if (newAgent) {
            await assignToAgent(session, newAgent._id.toString());
            if (_io && oldAgentName) {
                _io.to(`chat_${session.sessionId}`).emit('agent_transferred', {
                    sessionId: session.sessionId,
                    agentName: newAgent.name || newAgent.username
                });
            }
        } else {
            await sendQueuePosition(session.sessionId);
        }
    } catch (err) {
        console.error('[ChatQueue] rotateChat error:', err.message);
    }
}

// ── SLA CHECKER (runs every 15s) ─────────────────────────────────────────────
async function checkSLAs() {
    try {
        const now = new Date();

        // Find sessions whose agentTimeoutAt has passed
        const breached = await ChatSession.find({
            status: { $in: ['assigned', 'active'] },
            agentTimeoutAt: { $lt: now }
        });

        for (const session of breached) {
            const isFirstResponse = !session.firstReplyAt;
            const agentId = session.assignedTo;

            console.log(`[ChatQueue] SLA breach: session ${session.sessionId}, firstReply=${!isFirstResponse}, agent=${session.agentName}`);

            // Tier 1 alert: warn agent first (at 70% of SLA window) via socket
            if (agentId && isAgentSocketConnected(agentId.toString())) {
                const agentSocket = agentSockets.get(agentId.toString());
                if (agentSocket) {
                    agentSocket.emit('sla_warning', {
                        sessionId: session.sessionId,
                        visitorName: session.name,
                        type: isFirstResponse ? 'first_response' : 'idle_timeout',
                        message: isFirstResponse
                            ? `⚠️ You haven't responded to ${session.name} yet`
                            : `⚠️ ${session.name} is waiting — please respond`
                    });
                }
            }

            // Rotate
            await rotateChat(session);
        }
    } catch (err) {
        console.error('[ChatQueue] checkSLAs error:', err.message);
    }
}

// ── CLOSE SESSION ─────────────────────────────────────────────────────────────
async function closeSession(sessionId, closedBy) {
    try {
        const session = await ChatSession.findOne({ sessionId });
        if (!session) return;

        const agentId = session.assignedTo;

        session.status = 'closed';
        session.closedAt = new Date();
        session.closedBy = closedBy || 'admin';
        session.assignedTo = null;
        session.agentTimeoutAt = null;
        await session.save();

        // Decrement agent's count
        if (agentId) {
            await Admin.updateOne(
                { _id: agentId },
                {
                    $inc: { activeChatCount: -1, totalChatsHandled: 1 }
                }
            );
            // Clamp at 0
            await Admin.updateOne(
                { _id: agentId, activeChatCount: { $lt: 0 } },
                { $set: { activeChatCount: 0 } }
            );
        }

        broadcastQueueMetrics();
        console.log(`[ChatQueue] Session ${sessionId} closed by ${closedBy}`);
    } catch (err) {
        console.error('[ChatQueue] closeSession error:', err.message);
    }
}

// ── QUEUE POSITION ────────────────────────────────────────────────────────────
async function sendQueuePosition(sessionId) {
    try {
        if (!_io) return;
        const session = await ChatSession.findOne({ sessionId });
        if (!session || session.status === 'closed') return;

        const queuedBefore = await ChatSession.countDocuments({
            status: 'queued',
            queueEnteredAt: { $lt: session.queueEnteredAt }
        });
        const position = queuedBefore + 1;

        _io.to(`chat_${sessionId}`).emit('queue_position', {
            sessionId,
            position,
            estimatedWait: `~${Math.max(1, position * 2)} min`,
            message: position === 1
                ? "You're next! An agent will be with you shortly."
                : `You are position ${position} in the queue.`
        });
    } catch (err) {
        console.error('[ChatQueue] sendQueuePosition error:', err.message);
    }
}

// ── BROADCAST METRICS TO ALL ADMINS ──────────────────────────────────────────
async function broadcastQueueMetrics() {
    try {
        if (!_io) return;

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
                socketConnected: isAgentSocketConnected(a._id.toString()),
                activeChats: load,
                maxChats: a.maxChats || 3,
                avgResponseTime: a.avgResponseTime || 0,
                missedChats: a.missedChats || 0
            };
        }));

        _io.to('all_admins').emit('queue_metrics', {
            queueLength,
            activeChats,
            agentStatus,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('[ChatQueue] broadcastQueueMetrics error:', err.message);
    }
}

// ── SET AGENT STATUS ──────────────────────────────────────────────────────────
async function setAgentStatus(adminId, status) {
    try {
        await Admin.updateOne({ _id: adminId }, { $set: { chatStatus: status } });

        // If coming online, try to drain queue
        if (status === 'online') {
            const queuedSessions = await ChatSession.find({ status: 'queued' })
                .sort({ priorityScore: -1, queueEnteredAt: 1 })
                .limit(5);

            for (const session of queuedSessions) {
                await tryAssign(session);
            }
        }

        broadcastQueueMetrics();
        console.log(`[ChatQueue] Agent ${adminId} status → ${status}`);
    } catch (err) {
        console.error('[ChatQueue] setAgentStatus error:', err.message);
    }
}

// ── GET QUEUE LIST ────────────────────────────────────────────────────────────
async function getQueue() {
    return ChatSession.find({ status: 'queued' })
        .sort({ priorityScore: -1, queueEnteredAt: 1 })
        .lean();
}

// ── GET MY ASSIGNED CHATS ─────────────────────────────────────────────────────
async function getMyChats(adminId) {
    return ChatSession.find({
        assignedTo: adminId,
        status: { $in: ['assigned', 'active'] }
    }).sort({ assignedAt: -1 }).lean();
}

module.exports = {
    init,
    registerAgentSocket,
    unregisterAgentSocket,
    enqueue,
    tryAssign,
    assignToAgent,
    acceptChat,
    recordAgentReply,
    rotateChat,
    closeSession,
    setAgentStatus,
    getQueue,
    getMyChats,
    broadcastQueueMetrics,
    sendQueuePosition,
    SLA
};
