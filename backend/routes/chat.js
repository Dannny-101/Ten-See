const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const { v4: uuidv4 } = require('uuid');
const { createNotification } = require('./notifications');
const emailService = require('../utils/email');

router.post('/', async (req, res) => {
  try {
    const { sessionId, name, email, message, isAdmin } = req.body;
    let chatSession = sessionId;
    if (!chatSession) chatSession = uuidv4();

    const chatMessage = await ChatMessage.create({
      sessionId: chatSession, name, email, message,
      isAdmin: isAdmin || false, ipAddress: req.ip
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
        { name, email, message }
      );
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
        unreadCount: { $sum: { $cond: [{ $eq: ['$isAdmin', false] }, { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }, 0] } }
      }},
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
