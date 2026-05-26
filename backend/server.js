const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const ChatMessage = require('./models/ChatMessage');
const Lead = require('./models/Lead');
const Notification = require('./models/Notification');
const chatQueue = require('./services/chatQueue');
const chatPager = require('./services/chatPager');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Make io accessible to routes
app.set('io', io);

// Initialise live chat queue engine
chatQueue.init(io, chatPager);

// Track active admin sessions (sessionId -> adminSocketId)
const activeAdminSessions = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Admin joins the all_admins room for notifications
    socket.on('join_admin', (adminId) => {
        socket.join('all_admins');
        socket.adminId = adminId;
        console.log(`Admin ${adminId} joined all_admins room. Socket rooms:`, Array.from(socket.rooms));
        // Register agent socket for queue assignment
        chatQueue.registerAgentSocket(adminId, socket);
        // Send current metrics immediately on join
        chatQueue.broadcastQueueMetrics();
    });

    // ── QUEUE: Agent sets their availability status ────────────────────────────
    socket.on('set_chat_status', async (data) => {
        const { adminId, status } = data;
        if (!adminId || !status) return;
        await chatQueue.setAgentStatus(adminId, status);
        emitToAdmins('agent_status_changed', {
            adminId,
            status,
            timestamp: new Date().toISOString()
        });
        console.log(`[Queue] Agent ${adminId} set status → ${status}`);
    });

    // ── QUEUE: Agent accepts an assigned chat ─────────────────────────────────
    socket.on('accept_chat', async (data) => {
        const { sessionId, adminId } = data;
        if (!sessionId || !adminId) return;
        const result = await chatQueue.acceptChat(sessionId, adminId);
        if (result.success) {
            socket.emit('chat_accept_confirmed', { sessionId });
        }
    });

    // ── QUEUE: Agent rejects / passes chat ────────────────────────────────────
    socket.on('reject_chat', async (data) => {
        const { sessionId, adminId } = data;
        if (!sessionId) return;
        const ChatSession = require('./models/ChatSession');
        const session = await ChatSession.findOne({ sessionId }).catch(() => null);
        if (session) await chatQueue.rotateChat(session);
    });
    
    // Visitor joins their chat session room
    socket.on('join_chat', (sessionId) => {
        if (!sessionId) {
            console.log(`⚠️ join_chat called without sessionId from socket ${socket.id}`);
            return;
        }
        socket.join(`chat_${sessionId}`);
        socket.sessionId = sessionId;
        
        // Get room size for confirmation
        const roomSize = io.sockets.adapter.rooms.get(`chat_${sessionId}`)?.size || 0;
        console.log(`✅ Socket ${socket.id} joined chat_${sessionId} (room now has ${roomSize} members)`);
        
        // Send ack back to client
        socket.emit('joined_chat', { sessionId, roomSize });
        
        // Check if admin is already in this session and notify visitor
        if (activeAdminSessions.has(sessionId)) {
            console.log(`📢 Notifying visitor ${socket.id} that admin is already in session ${sessionId}`);
            socket.emit('admin_connected', { sessionId });
        }
    });
    
    // Admin takes over a chat session
    socket.on('admin_takeover', (data) => {
        const { sessionId, adminName } = data;
        if (!sessionId) return;
        
        // Mark session as having admin
        activeAdminSessions.set(sessionId, socket.id);
        socket.adminSessionId = sessionId;
        
        // Notify visitor that admin has connected
        io.to(`chat_${sessionId}`).emit('admin_connected', { sessionId, adminName });
        
        // Notify all admins
        emitToAdmins('admin_took_over', { sessionId, adminName, adminSocketId: socket.id });
        
        console.log(`Admin ${adminName} took over session ${sessionId}`);
    });
    
    // Admin leaves chat session
    socket.on('admin_leave', (sessionId) => {
        if (activeAdminSessions.has(sessionId)) {
            activeAdminSessions.delete(sessionId);
            io.to(`chat_${sessionId}`).emit('admin_disconnected', { sessionId });
            emitToAdmins('admin_left', { sessionId });
            console.log(`Admin left session ${sessionId}`);
        }
    });
    
    // Visitor sends message - save to DB and notify admins
    socket.on('send_message', async (data) => {
        const { sessionId, message, name, email, phone, topic } = data;
        if (!sessionId || !message) return;
        
        try {
            // Save to database
            const chatMessage = await ChatMessage.create({
                sessionId,
                name: name || 'Anonymous',
                email,
                phone,
                message,
                isAdmin: false,
                senderType: 'visitor',
                ipAddress: socket.handshake.address
            });

            // ── QUEUE: Enqueue / update session on first visitor message ──────
            await chatQueue.enqueue(sessionId, { name, email, phone, topic });
            
            // Emit to admin room
            emitToAdmins('new_chat_message', {
                sessionId,
                name: name || 'Anonymous',
                email,
                phone,
                message,
                createdAt: chatMessage.createdAt,
                isAdmin: false,
                senderType: 'visitor'
            });
            
            // Emit back to visitor as 'message_received'
            io.to(`chat_${sessionId}`).emit('message_received', {
                sessionId,
                message,
                isAdmin: false,
                senderType: 'visitor',
                createdAt: chatMessage.createdAt
            });
            
            console.log(`Visitor message saved and emitted for session ${sessionId}`);
            
            // ── AI AUTO-REPLY (only if no admin is active) ──
            setTimeout(async () => {
                // Skip AI if admin is already connected
                if (activeAdminSessions.has(sessionId)) {
                    console.log(`Skipping AI reply for session ${sessionId} - admin is active`);
                    return;
                }
                
                try {
                    const lowerMsg = message.toLowerCase();
                    let aiResponse = '';
                    
                    if (/budget|cheap|price|cost|rm/.test(lowerMsg)) {
                        aiResponse = "What's your monthly budget? We have rooms from RM400–RM1,500.";
                    } else if (/location|where|area|near|close/.test(lowerMsg)) {
                        aiResponse = "Which university? I can recommend the best areas.";
                    } else if (/wifi|internet|fiber|connection/.test(lowerMsg)) {
                        aiResponse = "All listings include WiFi. Some have fiber.";
                    } else if (/deposit|payment|advance|pay/.test(lowerMsg)) {
                        aiResponse = "Most need 1 month deposit + 1 month advance.";
                    } else if (/viewing|tour|visit|see/.test(lowerMsg)) {
                        aiResponse = "We can arrange virtual or in-person. When works?";
                    } else if (/contact|whatsapp|phone|call/.test(lowerMsg)) {
                        aiResponse = "Reach us on WhatsApp at +60 XX-XXXX XXXX.";
                    } else {
                        aiResponse = "Thanks! A human agent will join shortly. Tell me your university and budget.";
                    }
                    
                    // Double-check admin still not connected before saving
                    if (activeAdminSessions.has(sessionId)) {
                        console.log(`Aborting AI reply for session ${sessionId} - admin connected during processing`);
                        return;
                    }
                    
                    // Save AI message to DB
                    const aiMsg = await ChatMessage.create({
                        sessionId,
                        name: 'AI Assistant',
                        message: aiResponse,
                        isAdmin: true,
                        senderType: 'ai',
                        ipAddress: 'system'
                    });
                    
                    // Emit AI response to visitor
                    io.to(`chat_${sessionId}`).emit('message_received', {
                        sessionId,
                        message: aiResponse,
                        isAdmin: true,
                        senderType: 'ai',
                        createdAt: aiMsg.createdAt
                    });
                    
                    // Notify admins that AI responded
                    emitToAdmins('new_chat_message', {
                        sessionId,
                        name: 'AI Assistant',
                        message: aiResponse,
                        createdAt: aiMsg.createdAt,
                        isAdmin: true,
                        senderType: 'ai'
                    });
                    
                    console.log(`AI auto-reply sent for session ${sessionId}`);
                } catch (err) {
                    console.error('AI auto-reply failed:', err.message);
                }
            }, 1500);
            
        } catch (err) {
            console.error('Failed to save visitor message:', err.message);
        }
    });
    
    // Admin sends reply - broadcast to visitor's room
    socket.on('admin_reply', async (data) => {
        const { sessionId, message, adminName, adminId } = data;
        // ── QUEUE: Record agent reply for SLA tracking ──────────────────────
        if (sessionId && adminId) {
            chatQueue.recordAgentReply(sessionId, adminId).catch(() => {});
        }
        if (!sessionId || !message) {
            console.log(`⚠️ admin_reply missing data:`, { sessionId, hasMessage: !!message });
            return;
        }
        
        // Check if visitor is in the room
        const room = io.sockets.adapter.rooms.get(`chat_${sessionId}`);
        const roomSize = room?.size || 0;
        console.log(`📨 Admin reply for chat_${sessionId} - room has ${roomSize} members`);
        
        if (roomSize === 0) {
            console.log(`⚠️ WARNING: No visitors in chat_${sessionId} room. Message will not reach visitor in real-time.`);
        }
        
        // Emit as 'message_received' so visitor listener catches it
        const payload = {
            sessionId,
            message,
            name: adminName || 'Agent',
            isAdmin: true,
            senderType: 'human',
            createdAt: new Date().toISOString()
        };
        
        io.to(`chat_${sessionId}`).emit('message_received', payload);
        console.log(`✅ Admin reply emitted to chat_${sessionId} (${roomSize} recipients):`, message.substring(0, 50));
    });
    
    // Typing indicators
    socket.on('typing', (data) => {
        const { sessionId, isAdmin } = data;
        if (sessionId) {
            // Forward to the other party
            const targetRoom = isAdmin ? `chat_${sessionId}` : 'all_admins';
            io.to(targetRoom).emit('typing', { sessionId, isAdmin });
        }
    });
    
    socket.on('stop_typing', (data) => {
        const { sessionId, isAdmin } = data;
        if (sessionId) {
            const targetRoom = isAdmin ? `chat_${sessionId}` : 'all_admins';
            io.to(targetRoom).emit('stop_typing', { sessionId, isAdmin });
        }
    });
    
    // ── STAFF CHAT ──
    // Join staff chat room
    socket.on('join_staff_chat', (data) => {
        const { adminId } = data;
        if (adminId) {
            socket.join(`admin_${adminId}`);
            socket.staffAdminId = adminId;
            console.log(`Admin ${adminId} joined staff chat room`);
        }
    });
    
    // Direct message between staff
    socket.on('staff_message', (data) => {
        const { toId, message, fromId, fromName, fromRole, fromAvatar } = data;
        if (!toId || !message || !fromId) return;
        
        const payload = {
            toId,
            fromId,
            fromName: fromName || 'Admin',
            fromRole: fromRole || 'Admin',
            fromAvatar,
            message,
            timestamp: new Date().toISOString()
        };
        
        // Send to recipient
        io.to(`admin_${toId}`).emit('staff_message', payload);
        // Send back to sender for confirmation
        socket.emit('staff_message_sent', payload);
        
        console.log(`Staff message from ${fromName} to admin ${toId}`);
    });
    
    // Join group chat
    socket.on('join_group', (data) => {
        const { groupId } = data;
        if (groupId) {
            socket.join(`group_${groupId}`);
            socket.currentGroupId = groupId;
            console.log(`Socket ${socket.id} joined group ${groupId}`);
        }
    });
    
    // Group message
    socket.on('group_message', (data) => {
        const { groupId, message, fromId, fromName, fromRole, fromAvatar } = data;
        if (!groupId || !message || !fromId) return;
        
        const payload = {
            groupId,
            fromId,
            fromName: fromName || 'Admin',
            fromRole: fromRole || 'Admin',
            fromAvatar,
            message,
            timestamp: new Date().toISOString()
        };
        
        // Broadcast to all group members except sender
        socket.to(`group_${groupId}`).emit('group_message', payload);
        // Send back to sender for confirmation
        socket.emit('group_message_sent', payload);
        
        console.log(`Group message in ${groupId} from ${fromName}`);
    });
    
    // Create new group
    const staffGroups = new Map(); // In-memory storage for groups
    socket.on('create_group', (data) => {
        const { name, members, createdBy } = data;
        if (!name || !createdBy) return;
        
        const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const group = {
            id: groupId,
            name,
            members: [...(members || []), createdBy],
            createdBy,
            createdAt: new Date().toISOString()
        };
        
        staffGroups.set(groupId, group);
        
        // Notify all admins about new group
        emitToAdmins('group_created', group);
        
        // Auto-join creator to group
        socket.join(`group_${groupId}`);
        
        console.log(`Group created: ${name} (${groupId}) by ${createdBy}`);
    });
    
    socket.on('disconnect', async () => {
        console.log('Client disconnected:', socket.id);
        
        // If admin disconnects, clean up their session
        if (socket.adminSessionId) {
            activeAdminSessions.delete(socket.adminSessionId);
            io.to(`chat_${socket.adminSessionId}`).emit('admin_disconnected', { sessionId: socket.adminSessionId });
            emitToAdmins('admin_left', { sessionId: socket.adminSessionId });
            console.log(`Admin disconnected from session ${socket.adminSessionId}`);
        }

        // ── QUEUE: Unregister agent socket, set status away ────────────────
        if (socket.adminId) {
            chatQueue.unregisterAgentSocket(socket.adminId);
            // Mark away only if no other socket is connected for same admin
            // (they may have multiple tabs open)
            const Admin = require('./models/Admin');
            await Admin.updateOne(
                { _id: socket.adminId, chatStatus: 'online' },
                { $set: { chatStatus: 'away' } }
            ).catch(() => {});
            emitToAdmins('agent_status_changed', {
                adminId: socket.adminId,
                status: 'away',
                timestamp: new Date().toISOString()
            });
            chatQueue.broadcastQueueMetrics();
            console.log(`[Queue] Agent ${socket.adminId} went away on disconnect`);
        }
    });
});

// Helper function to emit to all admins with fallback
function emitToAdmins(event, data) {
    const adminRoom = io.sockets.adapter.rooms.get('all_admins');
    if (adminRoom && adminRoom.size > 0) {
        io.to('all_admins').emit(event, data);
        console.log(`Emitted ${event} to ${adminRoom.size} admin(s)`);
    } else {
        // Fallback: broadcast to all connected sockets
        io.emit(event, data);
        console.log(`Emitted ${event} to all sockets (no admin room found)`);
    }
}

// Make emitToAdmins accessible to routes
app.set('emitToAdmins', emitToAdmins);

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../frontend')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tenandsee', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(async () => {
    console.log('MongoDB Connected');
    // Fix any admin docs where avatar is not an object (e.g. empty string from old data)
    try {
        const Admin = require('./models/Admin');
        await Admin.updateMany(
            { $or: [{ avatar: { $type: 'string' } }, { avatar: null }, { 'avatar.emoji': { $exists: false } }] },
            { $set: { avatar: { emoji: '🦁', bg: '#c9a84c' } } }
        );
        console.log('✅ Admin avatar migration complete');
    } catch(e) { console.error('Avatar migration error:', e.message); }
})
.catch(err => console.error('MongoDB Connection Error:', err));

// Routes
app.use('/api/listings', require('./routes/listings'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/audit', require('./routes/audit').router);
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/queue', require('./routes/chatQueue'));
app.use('/api/push', require('./routes/push'));

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin/index.html'));
});

app.get('/property', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/property.html'));
});

// Smart Notification Cron - Check for unattended leads every 15 minutes
const UNATTENDED_LEAD_THRESHOLD = 16 * 60 * 60 * 1000; // 16 hours in milliseconds
const CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes
const notifiedLeadIds = new Set(); // Track already notified leads

async function checkUnattendedLeads() {
  try {
    const cutoffTime = new Date(Date.now() - UNATTENDED_LEAD_THRESHOLD);
    
    // Find leads older than 16 hours with status 'new' and no admin assigned
    const unattendedLeads = await Lead.find({
      status: 'new',
      assignedTo: null,
      createdAt: { $lte: cutoffTime },
      _id: { $nin: Array.from(notifiedLeadIds) } // Exclude already notified
    });
    
    for (const lead of unattendedLeads) {
      // Create notification
      await Notification.create({
        type: 'unattended_lead',
        title: 'Unattended Lead Alert',
        message: `Lead from ${lead.name} unattended for 16+ hours`,
        data: { 
          leadId: lead._id, 
          source: lead.source,
          createdAt: lead.createdAt 
        },
        isRead: false
      });
      
      // Emit real-time alert to admins
      if (emitToAdmins) {
        emitToAdmins('unattended_lead_alert', {
          leadId: lead._id,
          name: lead.name,
          source: lead.source,
          createdAt: lead.createdAt,
          message: `Lead from ${lead.name} unattended for 16+ hours`
        });
      }
      
      // Mark as notified
      notifiedLeadIds.add(lead._id.toString());
      
      console.log(`[Smart Notify] Unattended lead: ${lead.name} (${lead._id})`);
    }
    
    // Clean up old entries from notifiedLeadIds (leads that may have been handled)
    if (notifiedLeadIds.size > 1000) {
      const recentLeads = await Lead.find({
        _id: { $in: Array.from(notifiedLeadIds).map(id => new mongoose.Types.ObjectId(id)) }
      }).select('_id status');
      
      for (const lead of recentLeads) {
        if (lead.status !== 'new') {
          notifiedLeadIds.delete(lead._id.toString());
        }
      }
    }
  } catch (error) {
    console.error('[Smart Notify] Error checking unattended leads:', error);
  }
}

// Start the cron job
setInterval(checkUnattendedLeads, CHECK_INTERVAL);
console.log('[Smart Notify] Unattended lead checker started (every 15 min)');

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
