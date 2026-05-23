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
        socket.join(`chat_${sessionId}`);
        console.log(`Session ${sessionId} joined chat room`);
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
                ipAddress: socket.handshake.address
            });
            
            // Emit to admin room
            emitToAdmins('new_chat_message', {
                sessionId,
                name: name || 'Anonymous',
                email,
                message,
                createdAt: chatMessage.createdAt,
                isAdmin: false
            });
            
            // Emit back to visitor as 'message_received'
            io.to(`chat_${sessionId}`).emit('message_received', {
                sessionId,
                message,
                isAdmin: false,
                createdAt: chatMessage.createdAt
            });
            
            console.log(`Visitor message saved and emitted for session ${sessionId}`);
        } catch (err) {
            console.error('Failed to save visitor message:', err.message);
        }
    });
    
    // Admin sends reply - broadcast to visitor's room
    socket.on('admin_reply', (data) => {
        const { sessionId, message } = data;
        if (sessionId && message) {
            // Emit as 'message_received' so visitor listener catches it
            io.to(`chat_${sessionId}`).emit('message_received', {
                sessionId,
                message,
                isAdmin: true,
                createdAt: new Date().toISOString()
            });
            console.log(`Admin reply emitted to chat_${sessionId} as message_received`);
        }
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
