const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'No token' });
    try {
        req.admin = jwt.verify(token, process.env.JWT_SECRET || 'tenandsee_secret');
        next();
    } catch {
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
};

// Save push subscription for this admin
router.post('/subscribe', auth, async (req, res) => {
    try {
        const { subscription } = req.body;
        if (!subscription) return res.status(400).json({ success: false, error: 'No subscription' });
        await Admin.updateOne({ _id: req.admin.id }, { $set: { pushSubscription: subscription } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get VAPID public key (needed by client to subscribe)
router.get('/vapid-public-key', (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) return res.json({ success: false, error: 'Push not configured' });
    res.json({ success: true, key });
});

module.exports = router;
