const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, action, entityType, entityId, username, startDate, endDate } = req.query;
    let query = {};

    if (action) query.action = action;
    if (entityType) query['target.entityType'] = entityType;
    if (entityId) query['target.entityId'] = entityId;
    if (username) query['performedBy.username'] = new RegExp(username, 'i');
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await AuditLog.countDocuments(query);
    const actionCounts = await AuditLog.aggregate([{ $match: query }, { $group: { _id: '$action', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    const userActivity = await AuditLog.aggregate([{ $match: query }, { $group: { _id: '$performedBy.username', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]);

    res.json({ success: true, count: logs.length, total, totalPages: Math.ceil(total / limit), currentPage: page, summary: { actionCounts, topUsers: userActivity }, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/entity/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const logs = await AuditLog.find({ 'target.entityType': entityType, 'target.entityId': entityId }).sort({ createdAt: -1 });
    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/recent/:hours?', async (req, res) => {
  try {
    const hours = parseInt(req.params.hours) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const logs = await AuditLog.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(20);
    const stats = await AuditLog.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: '$action', count: { $sum: 1 } } }]);
    res.json({ success: true, period: `${hours}h`, count: logs.length, stats, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/cleanup/:days', async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 90;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await AuditLog.deleteMany({ createdAt: { $lt: cutoff } });
    res.json({ success: true, message: `Deleted ${result.deletedCount} audit logs older than ${days} days` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const createAuditLog = async (action, performedBy, target, changes = [], previousState = null, metadata = null) => {
  try {
    return await AuditLog.create({
      action,
      performedBy: { userId: performedBy?.userId || null, username: performedBy?.username || 'system', role: performedBy?.role || 'system', ipAddress: performedBy?.ipAddress || null, userAgent: performedBy?.userAgent || null },
      target: { entityType: target?.entityType || null, entityId: target?.entityId || null, entityName: target?.entityName || null },
      changes, previousState, metadata
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    return null;
  }
};

module.exports = { router, createAuditLog };
