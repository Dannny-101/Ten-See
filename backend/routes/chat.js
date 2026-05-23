const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const ChatSession = require('../models/ChatSession');
const { v4: uuidv4 } = require('uuid');
const { createNotification } = require('./notifications');
const emailService = require('../utils/email');

router.post('/', async (req, res) => {
  try {
    const { sessionId, name, email, phone, message, isAdmin, senderType } = req.body;
    let chatSession = sessionId;
    if (!chatSession) chatSession = uuidv4();

    const chatMessage = await ChatMessage.create({
      sessionId: chatSession, name, email, phone, message,
      isAdmin: isAdmin || false,
      senderType: senderType || (isAdmin ? 'human' : 'visitor'),
      ipAddress: req.ip
    });

    const io = req.app.get('io');
    
    if (!isAdmin) {
      await createNotification(
        'new_chat',
        'New Chat Message',
        `${name} sent a message: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
        { chatSessionId: chatSession }
      );
      await emailService.sendChatAlert(
        process.env.ADMIN_EMAIL || 'admin@tenandsee.com',
        { name, email, phone, message }
      );
      
      // Emit socket event to all admins for real-time updates
      const emitToAdmins = req.app.get('emitToAdmins');
      if (emitToAdmins) {
        emitToAdmins('new_chat_message', {
          sessionId: chatSession,
          name: name || 'Anonymous',
          email,
          phone,
          message,
          createdAt: chatMessage.createdAt,
          isAdmin: false,
          senderType: 'visitor'
        });
      }
    } else {
      // ADMIN message via REST - emit to visitor's room as message_received (failsafe)
      if (io) {
        const room = io.sockets.adapter.rooms.get(`chat_${chatSession}`);
        const roomSize = room?.size || 0;
        console.log(`📨 Admin REST message for chat_${chatSession} - room has ${roomSize} members`);
        
        io.to(`chat_${chatSession}`).emit('message_received', {
          _id: chatMessage._id.toString(),
          sessionId: chatSession,
          message,
          name: name || 'Agent',
          isAdmin: true,
          senderType: senderType || 'human',
          createdAt: chatMessage.createdAt
        });
        console.log(`✅ Admin REST message emitted to chat_${chatSession} (${roomSize} recipients)`);
        
        // Also notify other admins so chat list updates
        const emitToAdmins = req.app.get('emitToAdmins');
        if (emitToAdmins) {
          emitToAdmins('new_chat_message', {
            sessionId: chatSession,
            name: name || 'Agent',
            message,
            createdAt: chatMessage.createdAt,
            isAdmin: true,
            senderType: senderType || 'human'
          });
        }
      }
    }

    res.status(201).json({ success: true, data: chatMessage, sessionId: chatSession });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/:sessionId', async (req, res) => {
  try {
    const messages = await ChatMessage.find({ sessionId: req.params.sessionId }).sort({ createdAt: 1 });
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/session', async (req, res) => {
  try {
    const sessionId = uuidv4();
    const { name, phone, email } = req.body;
    
    // Create session record
    await ChatSession.create({
      sessionId,
      name: name || 'Visitor',
      email,
      phone,
      status: 'active'
    });
    
    // Store initial user info in first message (system message)
    if (name || phone || email) {
      await ChatMessage.create({
        sessionId,
        name: name || 'Visitor',
        email,
        phone,
        message: 'Chat session started',
        isAdmin: true,
        senderType: 'system',
        ipAddress: req.ip
      });
    }
    
    res.status(201).json({ success: true, data: { _id: sessionId, createdAt: new Date(), name, phone, email } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/admin/sessions', async (req, res) => {
  try {
    // Get all sessions - aggregate visitor info from visitor/system messages, latest message info from any
    const sessions = await ChatMessage.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: '$sessionId',
        lastMessage: { $first: '$message' },
        lastMessageAt: { $first: '$createdAt' },
        // Use $push to collect all messages, then we'll filter for visitor name
        allMessages: { $push: { name: '$name', email: '$email', phone: '$phone', senderType: '$senderType', isAdmin: '$isAdmin', createdAt: '$createdAt' } },
        unreadCount: { $sum: { $cond: [{ $eq: ['$isAdmin', false] }, { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }, 0] } }
      }},
      { $sort: { lastMessageAt: -1 } }
    ]);
    
    // Process to find visitor name from the messages (visitor or system messages have the real name)
    const processedSessions = sessions.map(s => {
      // Find first visitor or system message with a name (these contain the actual visitor info)
      const visitorMsg = s.allMessages.find(m => 
        (m.senderType === 'visitor' || m.senderType === 'system') && 
        m.name && m.name !== 'AI Assistant' && m.name !== 'System'
      );
      
      // Fallback: any message with a name that's not AI/System
      const fallbackMsg = visitorMsg || s.allMessages.find(m => 
        m.name && m.name !== 'AI Assistant' && m.name !== 'System'
      );
      
      return {
        _id: s._id,
        lastMessage: s.lastMessage,
        lastMessageAt: s.lastMessageAt,
        name: fallbackMsg?.name || 'Anonymous',
        email: fallbackMsg?.email || null,
        phone: fallbackMsg?.phone || null,
        unreadCount: s.unreadCount
      };
    }).filter(s => s.name && s.name !== 'Anonymous'); // Only show sessions with real user info
    
    // Get session statuses from ChatSession model
    const sessionIds = processedSessions.map(s => s._id);
    const sessionStatuses = await ChatSession.find({ sessionId: { $in: sessionIds } });
    const statusMap = new Map(sessionStatuses.map(s => [s.sessionId, s]));
    
    // Merge status into sessions
    const sessionsWithStatus = processedSessions.map(s => ({
      ...s,
      status: statusMap.get(s._id)?.status || 'active',
      closedAt: statusMap.get(s._id)?.closedAt,
      closedBy: statusMap.get(s._id)?.closedBy
    }));
    
    res.json({ success: true, data: sessionsWithStatus });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Close chat session
router.put('/close/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { closedBy } = req.body;
    
    // Update session status
    await ChatSession.findOneAndUpdate(
      { sessionId },
      { status: 'closed', closedAt: new Date(), closedBy: closedBy || 'admin' },
      { upsert: true }
    );
    
    // Add system message
    await ChatMessage.create({
      sessionId,
      name: 'System',
      message: `Chat closed by ${closedBy || 'admin'}`,
      isAdmin: true,
      senderType: 'system',
      ipAddress: req.ip
    });
    
    // Notify admins
    const io = req.app.get('io');
    if (io) {
      io.to(`chat_${sessionId}`).emit('chat_closed', { sessionId, closedBy });
    }
    
    res.json({ success: true, message: 'Chat closed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reopen chat session
router.put('/reopen/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Update session status
    await ChatSession.findOneAndUpdate(
      { sessionId },
      { status: 'active', closedAt: null, closedBy: null },
      { upsert: true }
    );
    
    // Add system message
    await ChatMessage.create({
      sessionId,
      name: 'System',
      message: 'Chat reopened',
      isAdmin: true,
      senderType: 'system',
      ipAddress: req.ip
    });
    
    res.json({ success: true, message: 'Chat reopened successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/read/:sessionId', async (req, res) => {
  try {
    await ChatMessage.updateMany({ sessionId: req.params.sessionId, isAdmin: false }, { $set: { isRead: true } });
    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
