const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const ChatMessage = require('./models/ChatMessage');

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
        const { sessionId, message, name, email } = data;
        if (!sessionId || !message) return;
        
        try {
            // Save to database
            const chatMessage = await ChatMessage.create({
                sessionId,
                name: name || 'Anonymous',
                email,
                message,
                isAdmin: false,
                senderType: 'visitor',
                ipAddress: socket.handshake.address
            });
            
            // Emit to admin room
            emitToAdmins('new_chat_message', {
                sessionId,
                name: name || 'Anonymous',
                email,
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
    socket.on('admin_reply', (data) => {
        const { sessionId, message, adminName } = data;
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
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // If admin disconnects, clean up their session
        if (socket.adminSessionId) {
            activeAdminSessions.delete(socket.adminSessionId);
            io.to(`chat_${socket.adminSessionId}`).emit('admin_disconnected', { sessionId: socket.adminSessionId });
            emitToAdmins('admin_left', { sessionId: socket.adminSessionId });
            console.log(`Admin disconnected from session ${socket.adminSessionId}`);
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
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB Connection Error:', err));

// Routes
app.use('/api/listings', require('./routes/listings'));
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

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin/index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
