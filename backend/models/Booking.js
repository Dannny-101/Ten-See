const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  studentPhone: String,
  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date, required: true },
  numberOfOccupants: { type: Number, default: 1 },
  totalAmount: { type: Number, required: true },
  currency: { type: String, default: 'MYR' },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'deposit_paid', 'fully_paid', 'cancelled', 'completed'],
    default: 'pending'
  },
  depositAmount: Number,
  depositPaidAt: Date,
  remainingAmount: Number,
  remainingPaidAt: Date,
  adminNotes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

bookingSchema.index({ listingId: 1, checkInDate: 1, checkOutDate: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
