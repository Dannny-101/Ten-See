const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const Listing = require('../models/Listing');
const ChatMessage = require('../models/ChatMessage');
const Booking = require('../models/Booking');

router.get('/funnel', async (req, res) => {
  try {
    const totalViews = await Listing.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]);
    const totalInquiries = await Listing.aggregate([{ $group: { _id: null, total: { $sum: '$inquiries' } } }]);
    const totalLeads = await Lead.countDocuments();
    const contactedLeads = await Lead.countDocuments({ status: 'contacted' });
    const viewingScheduled = await Lead.countDocuments({ status: 'viewing_scheduled' });
    const convertedLeads = await Lead.countDocuments({ status: 'converted' });
    const totalBookings = await Booking.countDocuments({ status: { $nin: ['cancelled'] } });

    const views = totalViews[0]?.total || 0;
    const inquiries = totalInquiries[0]?.total || 0;

    const funnel = [
      { stage: 'Page Views', count: views, conversionRate: 100 },
      { stage: 'Listing Inquiries', count: inquiries, conversionRate: views > 0 ? ((inquiries / views) * 100).toFixed(2) : 0 },
      { stage: 'Leads Captured', count: totalLeads, conversionRate: views > 0 ? ((totalLeads / views) * 100).toFixed(2) : 0 },
      { stage: 'Contacted', count: contactedLeads, conversionRate: totalLeads > 0 ? ((contactedLeads / totalLeads) * 100).toFixed(2) : 0 },
      { stage: 'Viewing Scheduled', count: viewingScheduled, conversionRate: totalLeads > 0 ? ((viewingScheduled / totalLeads) * 100).toFixed(2) : 0 },
      { stage: 'Converted', count: convertedLeads, conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(2) : 0 },
      { stage: 'Bookings', count: totalBookings, conversionRate: convertedLeads > 0 ? ((totalBookings / convertedLeads) * 100).toFixed(2) : 0 }
    ];

    res.json({ success: true, data: funnel });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/revenue', async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    let groupFormat;
    switch(period) {
      case 'daily': groupFormat = '%Y-%m-%d'; break;
      case 'weekly': groupFormat = '%Y-W%U'; break;
      case 'yearly': groupFormat = '%Y'; break;
      default: groupFormat = '%Y-%m';
    }

    const bookingRevenue = await Booking.aggregate([
      { $match: { status: { $nin: ['cancelled'] } } },
      { $group: { _id: { $dateToString: { format: groupFormat, date: '$createdAt' } }, revenue: { $sum: '$totalAmount' }, depositRevenue: { $sum: '$depositAmount' }, bookingCount: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const totalRevenue = await Booking.aggregate([{ $match: { status: { $nin: ['cancelled'] } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]);
    const avgBookingValue = await Booking.aggregate([{ $match: { status: { $nin: ['cancelled'] } } }, { $group: { _id: null, avg: { $avg: '$totalAmount' } } }]);

    res.json({
      success: true,
      data: { period, bookingRevenue, summary: { totalRevenue: totalRevenue[0]?.total || 0, averageBookingValue: Math.round(avgBookingValue[0]?.avg || 0), totalBookings: await Booking.countDocuments({ status: { $nin: ['cancelled'] } }) } }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/geographic', async (req, res) => {
  try {
    const leadsByCity = await Lead.aggregate([
      { $lookup: { from: 'listings', localField: 'listingId', foreignField: '_id', as: 'listing' } },
      { $unwind: { path: '$listing', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$listing.location.city', leadCount: { $sum: 1 }, convertedCount: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } } } },
      { $sort: { leadCount: -1 } }
    ]);

    const leadsByUniversity = await Lead.aggregate([
      { $lookup: { from: 'listings', localField: 'listingId', foreignField: '_id', as: 'listing' } },
      { $unwind: { path: '$listing', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$listing.location.university', leadCount: { $sum: 1 }, convertedCount: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } } } },
      { $sort: { leadCount: -1 } }
    ]);

    const viewsByCity = await Listing.aggregate([
      { $group: { _id: '$location.city', totalViews: { $sum: '$views' }, totalInquiries: { $sum: '$inquiries' }, listingCount: { $sum: 1 } } },
      { $sort: { totalViews: -1 } }
    ]);

    res.json({ success: true, data: { leadsByCity: leadsByCity.filter(c => c._id), leadsByUniversity: leadsByUniversity.filter(u => u._id), viewsByCity: viewsByCity.filter(c => c._id) } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/peak-times', async (req, res) => {
  try {
    const byDayOfWeek = await Lead.aggregate([{ $group: { _id: { $dayOfWeek: '$createdAt' }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
    const dayNames = ['', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const byDayFormatted = byDayOfWeek.map(d => ({ day: dayNames[d._id], count: d.count }));

    const byHour = await Lead.aggregate([{ $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
    const byHourFormatted = byHour.map(h => ({ hour: `${h._id}:00`, count: h.count }));

    const chatByHour = await ChatMessage.aggregate([{ $match: { isAdmin: false } }, { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);

    res.json({ success: true, data: { leadsByDay: byDayFormatted, leadsByHour: byHourFormatted, chatByHour: chatByHour.map(h => ({ hour: `${h._id}:00`, count: h.count })) } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/export/leads', async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    let query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (status) query.status = status;

    const leads = await Lead.find(query).populate('listingId', 'title location').sort({ createdAt: -1 });
    const exportData = leads.map(lead => ({
      id: lead._id.toString(), name: lead.name, email: lead.email, phone: lead.phone || '',
      university: lead.university || '', source: lead.source, status: lead.status,
      listingTitle: lead.listingId?.title || '', listingCity: lead.listingId?.location?.city || '',
      message: lead.message || '', notes: lead.notes || '', createdAt: lead.createdAt.toISOString(), ipAddress: lead.ipAddress || ''
    }));

    res.json({ success: true, count: exportData.length, data: exportData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/comparison', async (req, res) => {
  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthLeads = await Lead.countDocuments({ createdAt: { $gte: thisMonthStart } });
    const thisMonthViews = await Listing.aggregate([{ $match: { updatedAt: { $gte: thisMonthStart } } }, { $group: { _id: null, total: { $sum: '$views' } } }]);
    const thisMonthBookings = await Booking.countDocuments({ createdAt: { $gte: thisMonthStart }, status: { $nin: ['cancelled'] } });

    const lastMonthLeads = await Lead.countDocuments({ createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } });
    const lastMonthViews = await Listing.aggregate([{ $match: { updatedAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } }, { $group: { _id: null, total: { $sum: '$views' } } }]);
    const lastMonthBookings = await Booking.countDocuments({ createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }, status: { $nin: ['cancelled'] } });

    const calcChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return (((current - previous) / previous) * 100).toFixed(1);
    };

    res.json({
      success: true,
      data: {
        thisMonth: { leads: thisMonthLeads, views: thisMonthViews[0]?.total || 0, bookings: thisMonthBookings },
        lastMonth: { leads: lastMonthLeads, views: lastMonthViews[0]?.total || 0, bookings: lastMonthBookings },
        changes: { leads: calcChange(thisMonthLeads, lastMonthLeads), views: calcChange(thisMonthViews[0]?.total || 0, lastMonthViews[0]?.total || 0), bookings: calcChange(thisMonthBookings, lastMonthBookings) }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
