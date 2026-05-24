const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const Listing = require('../models/Listing');

// GET all properties (with aggregated listing info)
router.get('/', async (req, res) => {
    try {
        const { university, area, isActive } = req.query;
        let query = {};
        if (isActive !== undefined) query.isActive = isActive === 'true';
        else query.isActive = true;
        if (university) query['location.university'] = new RegExp(university, 'i');
        if (area) query['location.area'] = new RegExp(area, 'i');

        const properties = await Property.find(query).sort({ createdAt: -1 });

        // For each property, aggregate listing stats
        const propertyIds = properties.map(p => p._id);
        const listings = await Listing.find({ property: { $in: propertyIds }, isActive: true });

        const statsMap = {};
        listings.forEach(l => {
            const pid = l.property.toString();
            if (!statsMap[pid]) {
                statsMap[pid] = { totalRooms: 0, roomTypes: {}, minPrice: Infinity, maxPrice: 0 };
            }
            statsMap[pid].totalRooms++;
            const type = l.propertyType;
            if (!statsMap[pid].roomTypes[type]) statsMap[pid].roomTypes[type] = 0;
            statsMap[pid].roomTypes[type]++;
            if (l.price < statsMap[pid].minPrice) statsMap[pid].minPrice = l.price;
            if (l.price > statsMap[pid].maxPrice) statsMap[pid].maxPrice = l.price;
        });

        const enriched = properties.map(p => {
            const stats = statsMap[p._id.toString()] || { totalRooms: 0, roomTypes: {}, minPrice: 0, maxPrice: 0 };
            return {
                ...p.toObject(),
                totalRooms: stats.totalRooms,
                roomTypes: stats.roomTypes,
                minPrice: stats.minPrice === Infinity ? 0 : stats.minPrice,
                maxPrice: stats.maxPrice
            };
        });

        res.json({ success: true, count: enriched.length, data: enriched });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET single property
router.get('/:id', async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) return res.status(404).json({ success: false, error: 'Property not found' });
        res.json({ success: true, data: property });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET all listings under a property
router.get('/:id/listings', async (req, res) => {
    try {
        const { isActive } = req.query;
        let query = { property: req.params.id };
        if (isActive !== undefined) query.isActive = isActive === 'true';
        else query.isActive = true;

        const listings = await Listing.find(query).sort({ propertyType: 1, createdAt: -1 });
        res.json({ success: true, count: listings.length, data: listings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST create property (admin)
router.post('/', async (req, res) => {
    try {
        req.body.updatedAt = Date.now();
        const property = await Property.create(req.body);
        res.status(201).json({ success: true, data: property });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// PUT update property (admin)
router.put('/:id', async (req, res) => {
    try {
        req.body.updatedAt = Date.now();
        const property = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!property) return res.status(404).json({ success: false, error: 'Property not found' });
        res.json({ success: true, data: property });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// DELETE property (admin)
router.delete('/:id', async (req, res) => {
    try {
        const property = await Property.findByIdAndDelete(req.params.id);
        if (!property) return res.status(404).json({ success: false, error: 'Property not found' });
        // Unlink listings from this property
        await Listing.updateMany({ property: req.params.id }, { $set: { property: null } });
        res.json({ success: true, message: 'Property deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
