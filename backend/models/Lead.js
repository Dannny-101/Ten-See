const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    university: String,
    message: String,
    source: { 
        type: String, 
        enum: ['chat', 'whatsapp', 'booking_form', 'contact_form', 'view_listing'],
        required: true 
    },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
    listingTitle: String,
    status: { 
        type: String, 
        enum: ['new', 'contacted', 'viewing_scheduled', 'converted', 'closed'],
        default: 'new'
    },
    notes: String,
    ipAddress: String,
    userAgent: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lead', leadSchema);
