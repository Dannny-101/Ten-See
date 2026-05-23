const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
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
      // Emit admin reply to visitor using message_received event
      const io = req.app.get('io');
      if (io) {
        io.to(`chat_${chatSession}`).emit('message_received', {
          sessionId: chatSession,
          message,
          isAdmin: true,
          senderType: senderType || 'human',
          createdAt: chatMessage.createdAt
        });
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
    const sessions = await ChatMessage.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: '$sessionId',
        lastMessage: { $first: '$message' },
        lastMessageAt: { $first: '$createdAt' },
        name: { $first: '$name' },
        email: { $first: '$email' },
        phone: { $first: '$phone' },
        unreadCount: { $sum: { $cond: [{ $eq: ['$isAdmin', false] }, { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }, 0] } }
      }},
      { $match: { name: { $ne: null } } }, // Only show sessions with user info
      { $sort: { lastMessageAt: -1 } }
    ]);
    res.json({ success: true, data: sessions });
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
