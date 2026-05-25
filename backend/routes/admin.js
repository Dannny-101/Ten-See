const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { createAuditLog } = require('./audit');

// ── TEMPORARY EMERGENCY PASSWORD RESET ──
// REMOVE THIS AFTER YOU LOG IN SUCCESSFULLY
router.post('/reset-password', async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    const admin = await Admin.findOne({ username });
    
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }
    
    // Force set new password (will be hashed by pre-save hook)
    admin.password = newPassword;
    await admin.save();
    
    res.json({ 
      success: true, 
      message: 'Password reset successfully',
      admin: { username: admin.username, role: admin.role }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// POST login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username, isActive: true });

    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    admin.lastLogin = Date.now();
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role, name: admin.name },
      process.env.JWT_SECRET || 'tenandsee_secret',
      { expiresIn: '24h' }
    );

    // Audit log: admin login
    await createAuditLog('admin_login', {
      userId: admin._id,
      username: admin.username,
      role: admin.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    }, {
      entityType: 'Admin',
      entityId: admin._id,
      entityName: admin.username
    });

    res.json({ 
      success: true, 
      token, 
      admin: { 
        id: admin._id,
        username: admin.username, 
        name: admin.name,
        email: admin.email,
        role: admin.role,
        avatar: admin.avatar,
        lastLogin: admin.lastLogin
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Middleware to verify token
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Access denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tenandsee_secret');
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// GET admin profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    res.json({ success: true, data: admin });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET all admins (superadmin only)
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ success: false, error: 'Superadmin access required' });
    }
    const admins = await Admin.find({ isActive: true }).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: admins.length, data: admins });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single admin
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin' && req.admin.id !== req.params.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const admin = await Admin.findById(req.params.id).select('-password');
    if (!admin) return res.status(404).json({ success: false, error: 'Admin not found' });
    res.json({ success: true, data: admin });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create admin (superadmin only)
router.post('/create', authMiddleware, async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ success: false, error: 'Superadmin access required' });
    }
    const { username, password, name, email, role } = req.body;
    const admin = await Admin.create({ username, password, name, email, role: role || 'admin' });
    
    await createAuditLog('admin_created', {
      userId: req.admin.id,
      username: req.admin.username,
      role: req.admin.role,
      ipAddress: req.ip
    }, {
      entityType: 'Admin',
      entityId: admin._id,
      entityName: admin.username
    });

    res.status(201).json({ 
      success: true, 
      data: { id: admin._id, username: admin.username, name: admin.name, role: admin.role } 
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT update admin
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const isSelf = req.admin.id === req.params.id;
    const isSuperadmin = req.admin.role === 'superadmin';
    
    if (!isSelf && !isSuperadmin) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Only superadmin can change role
    if (req.body.role && !isSuperadmin) {
      delete req.body.role;
    }

    // Only superadmin or self can change password
    if (req.body.password && !isSelf && !isSuperadmin) {
      delete req.body.password;
    }

    const updates = { ...req.body, updatedAt: Date.now() };
    const admin = await Admin.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    
    if (!admin) return res.status(404).json({ success: false, error: 'Admin not found' });

    await createAuditLog('admin_updated', {
      userId: req.admin.id,
      username: req.admin.username,
      role: req.admin.role,
      ipAddress: req.ip
    }, {
      entityType: 'Admin',
      entityId: admin._id,
      entityName: admin.username
    }, Object.keys(req.body).map(k => ({ field: k, oldValue: 'previous', newValue: req.body[k] })));

    res.json({ success: true, data: admin });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE (deactivate) admin — superadmin only, cannot delete self
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ success: false, error: 'Superadmin access required' });
    }
    if (req.admin.id === req.params.id) {
      return res.status(400).json({ success: false, error: 'Cannot delete yourself' });
    }

    const admin = await Admin.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!admin) return res.status(404).json({ success: false, error: 'Admin not found' });

    await createAuditLog('admin_deleted', {
      userId: req.admin.id,
      username: req.admin.username,
      role: req.admin.role,
      ipAddress: req.ip
    }, {
      entityType: 'Admin',
      entityId: admin._id,
      entityName: admin.username
    });

    res.json({ success: true, message: 'Admin deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;
