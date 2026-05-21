const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');

// GET all listings with filters
router.get('/', async (req, res) => {
    try {
        const { 
            city, university, propertyType, minPrice, maxPrice, 
            bedrooms, amenities, search, isActive 
        } = req.query;

        let query = {};

        if (isActive !== undefined) query.isActive = isActive === 'true';
        else query.isActive = true;

        if (city) query['location.city'] = new RegExp(city, 'i');
        if (university) query['location.university'] = new RegExp(university, 'i');
        if (propertyType) query.propertyType = propertyType;
        if (bedrooms) query.bedrooms = parseInt(bedrooms);
        if (amenities) query.amenities = { $in: amenities.split(',') };

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseInt(minPrice);
            if (maxPrice) query.price.$lte = parseInt(maxPrice);
        }

        if (search) {
            query.$or = [
                { title: new RegExp(search, 'i') },
                { description: new RegExp(search, 'i') },
                { 'location.address': new RegExp(search, 'i') }
            ];
        }

        const listings = await Listing.find(query).sort({ isFeatured: -1, createdAt: -1 });
        res.json({ success: true, count: listings.length, data: listings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET single listing
router.get('/:id', async (req, res) => {
    try {
        const listing = await Listing.findById(req.params.id);
        if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });

        // Increment views
        listing.views += 1;
        await listing.save();

        res.json({ success: true, data: listing });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST create listing (admin only)
router.post('/', async (req, res) => {
    try {
        const listing = await Listing.create(req.body);
        res.status(201).json({ success: true, data: listing });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// PUT update listing
router.put('/:id', async (req, res) => {
    try {
        req.body.updatedAt = Date.now();
        const listing = await Listing.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });
        res.json({ success: true, data: listing });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// DELETE listing
router.delete('/:id', async (req, res) => {
    try {
        const listing = await Listing.findByIdAndDelete(req.params.id);
        if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });
        res.json({ success: true, message: 'Listing deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET unique cities and universities for filters
router.get('/filters/options', async (req, res) => {
    try {
        const cities = await Listing.distinct('location.city', { isActive: true });
        const universities = await Listing.distinct('location.university', { isActive: true });
        const propertyTypes = await Listing.distinct('propertyType', { isActive: true });
        res.json({ success: true, data: { cities, universities, propertyTypes } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
