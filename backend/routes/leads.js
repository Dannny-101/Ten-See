const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const Notification = require('../models/Notification');
const emailService = require('../utils/email');
const { authMiddleware } = require('./admin');

// POST /api/leads — Create new lead
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

    // Create notification for admin dashboard
    await Notification.create({
      type: 'new_lead',
      title: 'New Lead Received',
      message: `${lead.name} submitted an inquiry via ${lead.source}`,
      recipient: { type: 'all' },
      data: { 
        leadId: lead._id, 
        listingId: lead.listingId 
      },
      isRead: false
    });

    await emailService.sendNewLeadAlert(
      process.env.ADMIN_EMAIL || 'admin@tenandsee.com',
      { 
        name: lead.name, 
        email: lead.email, 
        phone: lead.phone, 
        university: lead.university, 
        source: lead.source, 
        listingTitle: lead.listingTitle, 
        message: lead.message 
      }
    );

    await emailService.sendStudentConfirmation(lead.email, { 
      name: lead.name, 
      listingTitle: lead.listingTitle 
    });

    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/leads — Get all leads
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, source, search, limit } = req.query;
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
    
    let leadsQuery = Lead.find(query).sort({ createdAt: -1 });
    if (limit) leadsQuery = leadsQuery.limit(parseInt(limit));
    
    const leads = await leadsQuery;
    res.json({ success: true, count: leads.length, data: leads });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/leads/:id — Get single lead
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/leads/:id — Update lead
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const oldLead = await Lead.findById(req.params.id);
    if (!oldLead) return res.status(404).json({ success: false, error: 'Lead not found' });

    req.body.updatedAt = Date.now();
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // Create notification if status changed
    if (req.body.status && req.body.status !== oldLead.status) {
      await Notification.create({
        type: 'lead_status_change',
        title: 'Lead Status Updated',
        message: `${lead.name}'s status changed from ${oldLead.status} to ${lead.status}`,
        recipient: { type: 'all' },
        data: { 
          leadId: lead._id, 
          listingId: lead.listingId 
        },
        isRead: false
      });

      await emailService.sendStatusUpdate(
        process.env.ADMIN_EMAIL || 'admin@tenandsee.com',
        { 
          name: lead.name, 
          email: lead.email, 
          oldStatus: oldLead.status, 
          status: lead.status, 
          notes: lead.notes 
        }
      );
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/leads/:id — Delete lead
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    res.json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
