const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// GET /api/notifications — Get all notifications (admin only)
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/notifications/unread-count — Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({ isRead: false });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/notifications/:id/read — Mark single notification as read
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

// PUT /api/notifications/read-all — Mark all as read
router.put('/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { isRead: false }, 
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/notifications/cleanup — Delete old read notifications (keep last 100)
router.delete('/cleanup', async (req, res) => {
  try {
    const count = await Notification.countDocuments();
    if (count > 100) {
      const old = await Notification.find().sort({ createdAt: -1 }).skip(100);
      const ids = old.map(n => n._id);
      await Notification.deleteMany({ _id: { $in: ids } });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
