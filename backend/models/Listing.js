const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    pricePeriod: { type: String, enum: ['month', 'week', 'day'], default: 'month' },
    location: {
        address: String,
        city: String,
        area: String,
        university: String,
        lat: Number,
        lng: Number
    },
    linkedUniversities: [{
        name: { type: String, required: true },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    }],
    recommendedUniversity: { type: String, default: '' },
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
    totalRooms: { type: Number, required: true, default: 1 },
    availableRooms: { type: Number, required: true, default: 1 },
    units: { type: Number, default: 1 },
    availableFrom: Date,
    availableUntil: Date,
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    whatsappNumber: String,
    wechatId: String,
    agentName: String,
    views: { type: Number, default: 0 },
    inquiries: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Listing', listingSchema);
