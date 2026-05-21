const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { createNotification } = require('./notifications');
const emailService = require('../utils/email');

router.post('/', async (req, res) => {
  try {
    const lead = await Lead.create({
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    if (req.body.listingId) {
      const Listing = require('../models/Listing');
      await Listing.findByIdAndUpdate(req.body.listingId, { $inc: { inquiries: 1 } });
    }

    await createNotification(
      'new_lead',
      'New Lead Received',
      `${lead.name} submitted an inquiry via ${lead.source}`,
      { leadId: lead._id, listingId: lead.listingId }
    );

    await emailService.sendNewLeadAlert(
      process.env.ADMIN_EMAIL || 'admin@tenandsee.com',
      { name: lead.name, email: lead.email, phone: lead.phone, university: lead.university, source: lead.source, listingTitle: lead.listingTitle, message: lead.message }
    );

    await emailService.sendStudentConfirmation(lead.email, { name: lead.name, listingTitle: lead.listingTitle });

    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status, source, search } = req.query;
    let query = {};
    if (status) query.status = status;
    if (source) query.source = source;
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') }
      ];
    }
    const leads = await Lead.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: leads.length, data: leads });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const oldLead = await Lead.findById(req.params.id);
    if (!oldLead) return res.status(404).json({ success: false, error: 'Lead not found' });

    req.body.updatedAt = Date.now();
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (req.body.status && req.body.status !== oldLead.status) {
      await createNotification(
        'lead_status_change',
        'Lead Status Updated',
        `${lead.name}'s status changed from ${oldLead.status} to ${lead.status}`,
        { leadId: lead._id, listingId: lead.listingId }
      );

      await emailService.sendStatusUpdate(
        process.env.ADMIN_EMAIL || 'admin@tenandsee.com',
        { name: lead.name, email: lead.email, oldStatus: oldLead.status, status: lead.status, notes: lead.notes }
      );
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    res.json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
