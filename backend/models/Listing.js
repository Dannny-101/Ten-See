const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    pricePeriod: { type: String, enum: ['month', 'week', 'day'], default: 'month' },
    location: {
        address: String,
        city: String,
        university: String,
        lat: Number,
        lng: Number
    },
    propertyType: { 
        type: String, 
        enum: ['apartment', 'studio', 'shared_room', 'private_room', 'house'],
        required: true 
    },
    amenities: [String],
    images: [String],
    bedrooms: Number,
    bathrooms: Number,
    maxOccupants: Number,
    availableFrom: Date,
    availableUntil: Date,
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    whatsappNumber: String,
    agentName: String,
    views: { type: Number, default: 0 },
    inquiries: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Listing', listingSchema);
