const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');
const { createAuditLog } = require('./audit');
const { authMiddleware } = require('./admin');

// ── UNIVERSITY TO AREA MAPPING (Single Source of Truth) ──
// Maps each supported university to its specific area(s) in KL/Selangor
const UNIVERSITY_AREA_MAP = {
    // Kuala Lumpur
    "University of Malaya (UM)": ["Petaling Jaya", "Kerinchi"],
    "Universiti Tunku Abdul Rahman (UTAR)": ["Jalan Genting Kelang"],
    "UCSI University": ["Cheras", "Taman Connaught"],
    "HELP University": ["Damansara Heights"],
    "INTI International College": ["Kuala Lumpur City Centre"],
    "Taylor's University": ["Subang Jaya", "Lakeside Campus"],
    "Monash University Malaysia": ["Bandar Sunway"],
    "Sunway University": ["Bandar Sunway"],
    "Asia Pacific University (APU)": ["Bukit Jalil"],
    "International Medical University (IMU)": ["Bukit Jalil"],
    "Multimedia University (MMU) Cyberjaya": ["Cyberjaya"],
    "Limkokwing University": ["Cyberjaya"],
    
    // Selangor
    "Universiti Putra Malaysia (UPM)": ["Serdang"],
    "Universiti Kebangsaan Malaysia (UKM)": ["Bangi"],
    "Universiti Tenaga Nasional (UNITEN)": ["Kajang"],
    "Universiti Teknologi MARA (UiTM) Shah Alam": ["Shah Alam"],
    "Management and Science University (MSU)": ["Shah Alam"],
    "Binary University": ["Puchong"],
    "Infrastructure University Kuala Lumpur (IUKL)": ["Kajang"],
    
    // Default fallback
    "Other": ["Kuala Lumpur", "Selangor"]
};

// Helper to get areas from university name
function getAreasFromUniversity(university) {
    if (!university) return null;
    const areas = UNIVERSITY_AREA_MAP[university];
    return areas || UNIVERSITY_AREA_MAP["Other"];
}

// Helper to get all supported universities
function getSupportedUniversities() {
    return Object.keys(UNIVERSITY_AREA_MAP).filter(u => u !== "Other");
}

// Helper to get all areas in KL/Selangor
function getAllAreas() {
    const allAreas = new Set();
    Object.values(UNIVERSITY_AREA_MAP).forEach(areas => {
        areas.forEach(area => allAreas.add(area));
    });
    return Array.from(allAreas).sort();
}

// GET all listings with filters + room aggregation
// Default implicit location: Kuala Lumpur / Selangor
router.get('/', async (req, res) => {
    try {
        const { 
            city, area, university, propertyType, minPrice, maxPrice, 
            bedrooms, amenities, search, isActive, includeAllCities,
            isFeatured, limit
        } = req.query;

        let query = {};

        if (isActive !== undefined) query.isActive = isActive === 'true';
        else query.isActive = true;

        // ── IMPLICIT DEFAULT: Kuala Lumpur / Selangor ──
        // Unless includeAllCities=true, default to KL/Selangor area
        if (!includeAllCities) {
            // If no specific location filters provided, limit to KL/Selangor
            if (!city && !area && !university) {
                query['location.city'] = { $in: [/kuala/i, /selangor/i, /kl/i, /petaling/i, /subang/i, /cyberjaya/i, /putrajaya/i, /shah alam/i, /puchong/i, /kajang/i, /bangi/i, /serdang/i, /seri kembangan/i, /damansara/i, /cheras/i] };
            }
        }

        if (city) query['location.city'] = new RegExp(city, 'i');
        if (area) query['location.area'] = new RegExp(area, 'i');
        if (university) query['location.university'] = new RegExp(university, 'i');
        if (propertyType) query.propertyType = propertyType;
        if (bedrooms) query.bedrooms = parseInt(bedrooms);
        if (amenities) query.amenities = { $in: amenities.split(',') };
        if (isFeatured !== undefined) query.isFeatured = isFeatured === 'true';

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseInt(minPrice);
            if (maxPrice) query.price.$lte = parseInt(maxPrice);
        }

        if (search) {
            query.$or = [
                { title: new RegExp(search, 'i') },
                { description: new RegExp(search, 'i') },
                { 'location.address': new RegExp(search, 'i') },
                { 'location.area': new RegExp(search, 'i') }
            ];
        }

        let q = Listing.find(query).sort({ isFeatured: -1, createdAt: -1 });
        if (limit) q = q.limit(parseInt(limit));
        const listings = await q;
        
        // Calculate total rooms across all listings
        const totalRoomsAvailable = listings.reduce((sum, listing) => sum + (listing.availableRooms || 0), 0);
        const totalRoomsProperty = listings.reduce((sum, listing) => sum + (listing.totalRooms || 0), 0);

        res.json({ 
            success: true, 
            count: listings.length,
            roomsData: {
                totalAvailableRooms: totalRoomsAvailable,
                totalRoomsProperty: totalRoomsProperty
            },
            data: listings 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET unique cities, areas, and universities for filters
router.get('/filters/options', async (req, res) => {
    try {
        // Get distinct values from database (only active listings in KL/Selangor area)
        const klSelangorRegex = { $in: [/kuala/i, /selangor/i, /kl/i, /petaling/i, /subang/i, /cyberjaya/i, /putrajaya/i, /shah alam/i, /puchong/i, /kajang/i, /bangi/i, /serdang/i, /seri kembangan/i, /damansara/i, /cheras/i] };
        
        const cities = await Listing.distinct('location.city', { isActive: true, 'location.city': klSelangorRegex });
        const areas = await Listing.distinct('location.area', { isActive: true });
        const universities = await Listing.distinct('location.university', { isActive: true });
        const propertyTypes = await Listing.distinct('propertyType', { isActive: true });
        
        res.json({ 
            success: true, 
            data: { 
                cities, 
                areas: areas.length > 0 ? areas : getAllAreas(),
                universities, 
                propertyTypes,
                supportedUniversities: getSupportedUniversities(),
                universityAreaMap: UNIVERSITY_AREA_MAP
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET areas by university
router.get('/lookup/areas', async (req, res) => {
    try {
        const { university } = req.query;
        if (!university) {
            return res.json({ success: true, data: { areas: getAllAreas(), allAreas: true } });
        }
        const areas = getAreasFromUniversity(university);
        res.json({ success: true, data: { university, areas, allAreas: false } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET supported universities list
router.get('/lookup/universities', async (req, res) => {
    try {
        res.json({ 
            success: true, 
            data: { 
                universities: getSupportedUniversities(),
                map: UNIVERSITY_AREA_MAP 
            } 
        });
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

// POST track view (for when listing is displayed in cards/modals)
router.post('/:id/view', authMiddleware, async (req, res) => {
    try {
        const listing = await Listing.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );
        if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });
        res.json({ success: true, views: listing.views });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST create listing (admin only)
// Auto-populates area from university if not provided
router.post('/', authMiddleware, async (req, res) => {
    try {
        // Auto-populate area from university if not provided
        if (req.body.location?.university && !req.body.location?.area) {
            const areas = getAreasFromUniversity(req.body.location.university);
            if (areas && areas.length > 0) {
                req.body.location.area = areas[0]; // Use first area as default
            }
        }
        
        // Default city to Kuala Lumpur if not provided and area is in KL/Selangor
        if (!req.body.location?.city) {
            req.body.location = req.body.location || {};
            req.body.location.city = 'Kuala Lumpur';
        }
        
        const listing = await Listing.create(req.body);
        await createAuditLog('listing_created',
            { userId: req.admin?.id, username: req.admin?.username || 'system' },
            { entityType: 'listing', entityId: listing._id, entityName: listing.title }
        ).catch(() => {});
        res.status(201).json({ success: true, data: listing });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// PUT update listing
// Auto-populates area from university if not provided
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        // Auto-populate area from university if not provided but university changed
        if (req.body.location?.university && !req.body.location?.area) {
            const areas = getAreasFromUniversity(req.body.location.university);
            if (areas && areas.length > 0) {
                req.body.location.area = areas[0];
            }
        }
        
        req.body.updatedAt = Date.now();
        const listing = await Listing.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });
        await createAuditLog('listing_updated',
            { userId: req.admin?.id, username: req.admin?.username || 'system' },
            { entityType: 'listing', entityId: listing._id, entityName: listing.title }
        ).catch(() => {});
        res.json({ success: true, data: listing });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// DELETE listing
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const listing = await Listing.findByIdAndDelete(req.params.id);
        if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });
        await createAuditLog('listing_deleted',
            { userId: req.admin?.id, username: req.admin?.username || 'system' },
            { entityType: 'listing', entityId: req.params.id, entityName: listing.title }
        ).catch(() => {});
        res.json({ success: true, message: 'Listing deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
