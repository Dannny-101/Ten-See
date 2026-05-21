const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['new_lead', 'lead_status_change', 'new_chat', 'new_booking', 'listing_view_milestone'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
    chatSessionId: String,
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }
  },
  isRead: { type: Boolean, default: false },
  readAt: Date,
  createdAt: { type: Date, default: Date.now }
});

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
