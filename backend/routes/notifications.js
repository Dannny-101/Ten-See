const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authMiddleware } = require('./admin');

// Apply auth to ALL notification routes
router.use(authMiddleware);

// Helper: get notifications relevant to current admin
const getRelevantNotifications = async (admin) => {
  const query = {};
  if (admin.role !== 'superadmin') {
    query.$or = [
      { 'recipient.type': 'all' },
      { 'recipient.type': 'specific', 'recipient.userId': admin.id },
      { recipient: { $exists: false } }, // Legacy notifications without recipient field
      { recipient: null } // Legacy notifications with null recipient
    ];
  }
  // Superadmin sees everything (no filter) or explicit superadmin ones
  return query;
};

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    const query = await getRelevantNotifications(req.admin);
    query.isRead = false;
    const count = await Notification.countDocuments(query);
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/notifications — Get all relevant notifications
router.get('/', async (req, res) => {
  try {
    const query = await getRelevantNotifications(req.admin);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/notifications/recent — For dashboard activity feed
router.get('/recent', async (req, res) => {
  try {
    const query = await getRelevantNotifications(req.admin);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ ...query, isRead: false });
    const unplayedCount = await Notification.countDocuments({ ...query, soundPlayed: false });
    res.json({ success: true, unreadCount, unplayedCount, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/notifications/unplayed — Get notifications needing sound alert
router.get('/unplayed', async (req, res) => {
  try {
    const query = await getRelevantNotifications(req.admin);
    query.soundPlayed = false;
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/notifications/:id/sound-played — Mark sound as played
router.put('/:id/sound-played', async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { soundPlayed: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/notifications/read-all — Mark all relevant as read
router.put('/read-all', async (req, res) => {
  try {
    const query = await getRelevantNotifications(req.admin);
    await Notification.updateMany(
      { ...query, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/notifications/:id/read — Mark single as read
router.put('/:id/read', async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, {
      isRead: true,
      readAt: new Date()
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/notifications/cleanup
router.delete('/cleanup', async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ success: false, error: 'Superadmin only' });
    }
    const count = await Notification.countDocuments();
    if (count > 200) {
      const old = await Notification.find().sort({ createdAt: -1 }).skip(200);
      const ids = old.map(n => n._id);
      await Notification.deleteMany({ _id: { $in: ids } });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper: create notification (used by other routes)
const createNotification = async (type, title, message, data = null, recipient = { type: 'all' }) => {
  try {
    const notification = await Notification.create({
      type,
      title,
      message,
      recipient,
      data,
      isRead: false,
      soundPlayed: false
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

module.exports = router;
module.exports.createNotification = createNotification;
