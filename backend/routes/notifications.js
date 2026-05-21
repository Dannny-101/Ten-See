const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    let query = {};
    if (unreadOnly === 'true') query.isRead = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ isRead: false });

    res.json({
      success: true, count: notifications.length, total, unreadCount,
      totalPages: Math.ceil(total / limit), currentPage: page, data: notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({ isRead: false });
    res.json({ success: true, unreadCount: count });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/recent', async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(10);
    const unreadCount = await Notification.countDocuments({ isRead: false });
    res.json({ success: true, unreadCount, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id, { isRead: true, readAt: new Date() }, { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, error: 'Notification not found' });
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/mark-all-read', async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true, readAt: new Date() });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) return res.status(404).json({ success: false, error: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const createNotification = async (type, title, message, data = {}) => {
  try {
    return await Notification.create({ type, title, message, data, isRead: false });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
};

module.exports = { router, createNotification };
