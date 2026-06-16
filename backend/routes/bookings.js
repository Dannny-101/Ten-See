const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const Lead = require('../models/Lead');
const { createNotification } = require('./notifications');
const emailService = require('../services/email');
const { authMiddleware } = require('./admin');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, listingId, source, page = 1, limit = 20 } = req.query;
    let query = {};
    if (status) query.status = status;
    if (listingId) query.listingId = listingId;
    if (source) query.source = source;

    const bookings = await Booking.find(query)
      .populate('listingId', 'title location price images')
      .populate('leadId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);
    res.json({ success: true, count: bookings.length, total, totalPages: Math.ceil(total / limit), currentPage: page, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('listingId').populate('leadId');
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { leadId, listingId, checkInDate, checkOutDate, numberOfOccupants, name, email, phone, message, source } = req.body;

    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });

    let lead;
    if (leadId) {
      lead = await Lead.findById(leadId);
      if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    } else {
      // Create or find lead from booking form data
      lead = await Lead.findOne({ email: email });
      if (!lead) {
        lead = await Lead.create({
          name: name || 'Anonymous',
          email: email,
          phone: phone || '',
          message: message || '',
          source: source || 'booking_form',
          listingId: listingId,
          listingTitle: listing.title,
          status: 'new'
        });
      }
    }

    const overlapCount = await Booking.countDocuments({
      listingId, status: { $nin: ['cancelled'] },
      $or: [{ checkInDate: { $lte: new Date(checkOutDate) }, checkOutDate: { $gte: new Date(checkInDate) } }]
    });

    const units = listing.units || 1;
    if (overlapCount >= units) {
      return res.status(400).json({ success: false, error: 'These dates are fully booked. Please select different dates.' });
    }

    let nights = 0;
    let totalAmount = 0;
    if (checkInDate && checkOutDate) {
      nights = Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24));
      totalAmount = nights * listing.price;
    }

    const booking = await Booking.create({
      leadId: lead._id, listingId,
      studentName: lead.name, studentEmail: lead.email, studentPhone: lead.phone,
      checkInDate: checkInDate || null, checkOutDate: checkOutDate || null,
      numberOfOccupants: numberOfOccupants || 1,
      totalAmount, depositAmount: totalAmount ? totalAmount * 0.3 : 0, remainingAmount: totalAmount ? totalAmount * 0.7 : 0,
      status: 'pending',
      source: source || 'website'
    });

    await createNotification('new_booking', 'New Booking Request',
      `${lead.name} requested to book ${listing.title}${checkInDate ? ' from ' + new Date(checkInDate).toLocaleDateString() : ''}`,
      { bookingId: booking._id, listingId: listing._id, leadId: lead._id });

    // Send confirmation emails
    const bookingData = {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      listingTitle: listing.title,
      checkInDate: checkInDate ? new Date(checkInDate).toLocaleDateString() : 'TBD',
      checkOutDate: checkOutDate ? new Date(checkOutDate).toLocaleDateString() : 'TBD',
      totalAmount,
      source: booking.source,
      bookingId: booking._id
    };

    await emailService.sendBookingConfirmation(lead.email, bookingData);
    await emailService.sendBookingAdminNotification(process.env.ADMIN_EMAIL || 'admin@tenandsee.homes', bookingData);

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id, { status, adminNotes, updatedAt: Date.now() }, { new: true }
    ).populate('listingId').populate('leadId');

    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

    await createNotification('lead_status_change', 'Booking Status Updated',
      `Booking for ${booking.listingId.title} is now ${status}`,
      { bookingId: booking._id, listingId: booking.listingId._id });

    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/availability/:listingId', authMiddleware, async (req, res) => {
  try {
    const { month, year } = req.query;
    const listingId = req.params.listingId;
    const startOfMonth = new Date(year || new Date().getFullYear(), (month || new Date().getMonth()) - 1, 1);
    const endOfMonth = new Date(year || new Date().getFullYear(), (month || new Date().getMonth()), 0);

    const bookings = await Booking.find({
      listingId, status: { $nin: ['cancelled'] },
      $or: [{ checkInDate: { $lte: endOfMonth }, checkOutDate: { $gte: startOfMonth } }]
    }).select('checkInDate checkOutDate status');

    res.json({
      success: true,
      data: {
        listingId,
        month: startOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' }),
        bookedRanges: bookings.map(b => ({ from: b.checkInDate, to: b.checkOutDate, status: b.status }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    res.json({ success: true, message: 'Booking deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
