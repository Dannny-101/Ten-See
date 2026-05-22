const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { authMiddleware } = require('./admin');
const { createAuditLog } = require('./audit');

// Apply auth to all task routes
router.use(authMiddleware);

// GET all tasks
router.get('/', async (req, res) => {
  try {
    const { status, priority, category, search, limit = 50 } = req.query;
    let query = { isActive: true };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const tasks = await Task.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single task
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create task
router.post('/', async (req, res) => {
  try {
    const { title, description, priority, category, dueDate, relatedEntity, tags } = req.body;
    
    const task = await Task.create({
      title,
      description,
      priority: priority || 'medium',
      category: category || 'general',
      dueDate,
      relatedEntity,
      tags: tags || [],
      createdBy: {
        userId: req.admin.id,
        username: req.admin.username,
        name: req.admin.name || req.admin.username
      }
    });

    // Emit socket event to all admins
    const io = req.app.get('io');
    if (io) {
      io.to('all_admins').emit('task_created', {
        taskId: task._id,
        title: task.title,
        createdBy: task.createdBy,
        priority: task.priority,
        createdAt: task.createdAt
      });
    }

    // Create notification for superadmin
    const Notification = require('../models/Notification');
    await Notification.create({
      type: 'new_task',
      title: 'New Task Created',
      message: `${task.createdBy.name || task.createdBy.username} created task: ${task.title}`,
      recipient: { type: 'superadmin' },
      data: { taskId: task._id }
    });

    // Audit log
    await createAuditLog('task_created', {
      userId: req.admin.id,
      username: req.admin.username,
      role: req.admin.role,
      ipAddress: req.ip
    }, {
      entityType: 'Task',
      entityId: task._id,
      entityName: task.title
    });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT update task (status, details, etc.)
router.put('/:id', async (req, res) => {
  try {
    const oldTask = await Task.findById(req.params.id);
    if (!oldTask) return res.status(404).json({ success: false, error: 'Task not found' });

    const updates = { ...req.body, updatedAt: Date.now() };
    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true });

    // If status changed to done, record who completed it
    if (req.body.status === 'done' && oldTask.status !== 'done') {
      task.completedBy = {
        userId: req.admin.id,
        username: req.admin.username,
        name: req.admin.name || req.admin.username,
        completedAt: new Date()
      };
      await task.save();

      // Emit completion event
      const io = req.app.get('io');
      if (io) {
        io.to('all_admins').emit('task_completed', {
          taskId: task._id,
          title: task.title,
          completedBy: task.completedBy,
          completedAt: task.completedBy.completedAt
        });
      }

      // Notification
      const Notification = require('../models/Notification');
      await Notification.create({
        type: 'task_completed',
        title: 'Task Completed',
        message: `${task.completedBy.name || task.completedBy.username} completed: ${task.title}`,
        recipient: { type: 'superadmin' },
        data: { taskId: task._id }
      });
    } else {
      // General update socket
      const io = req.app.get('io');
      if (io) {
        io.to('all_admins').emit('task_updated', {
          taskId: task._id,
          title: task.title,
          status: task.status,
          updatedBy: req.admin.username,
          updatedAt: task.updatedAt
        });
      }
    }

    // Audit log
    const changes = [];
    Object.keys(req.body).forEach(key => {
      if (oldTask[key] !== req.body[key] && key !== 'updatedAt') {
        changes.push({
          field: key,
          oldValue: oldTask[key],
          newValue: req.body[key]
        });
      }
    });

    await createAuditLog('task_updated', {
      userId: req.admin.id,
      username: req.admin.username,
      role: req.admin.role,
      ipAddress: req.ip
    }, {
      entityType: 'Task',
      entityId: task._id,
      entityName: task.title
    }, changes);

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE (soft delete) task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

    const io = req.app.get('io');
    if (io) {
      io.to('all_admins').emit('task_deleted', { taskId: task._id, title: task.title });
    }

    await createAuditLog('task_deleted', {
      userId: req.admin.id,
      username: req.admin.username,
      role: req.admin.role,
      ipAddress: req.ip
    }, {
      entityType: 'Task',
      entityId: task._id,
      entityName: task.title
    });

    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET task statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const total = await Task.countDocuments({ isActive: true });
    const byStatus = await Task.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const byPriority = await Task.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    const overdue = await Task.countDocuments({ 
      isActive: true, 
      status: { $ne: 'done' }, 
      dueDate: { $lt: new Date() } 
    });

    res.json({ 
      success: true, 
      data: { total, byStatus, byPriority, overdue } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
