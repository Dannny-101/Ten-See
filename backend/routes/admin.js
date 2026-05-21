const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// POST login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await Admin.findOne({ username });

        if (!admin || !(await admin.comparePassword(password))) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        admin.lastLogin = Date.now();
        await admin.save();

        const token = jwt.sign(
            { id: admin._id, username: admin.username, role: admin.role },
            process.env.JWT_SECRET || 'tenandsee_secret',
            { expiresIn: '24h' }
        );

        res.json({ success: true, token, admin: { username: admin.username, role: admin.role } });
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

// POST create admin (protected)
router.post('/create', authMiddleware, async (req, res) => {
    try {
        if (req.admin.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }
        const admin = await Admin.create(req.body);
        res.status(201).json({ success: true, data: { username: admin.username, role: admin.role } });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;
