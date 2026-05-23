const mongoose = require('mongoose');
const Listing = require('./models/Listing');
const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tenandsee');

    // Clear existing data
    await Listing.deleteMany({});

    // Create sample listings - Kuala Lumpur / Selangor area
    const listings = [
        {
            title: "Modern Studio Near Sunway Campus",
            description: "A fully furnished modern studio apartment just 5 minutes walk from Sunway University. Features high-speed WiFi, study desk, and kitchenette. Perfect for Monash and Sunway students.",
            price: 1200,
            pricePeriod: "month",
            location: {
                address: "Jalan PJS 11/28, Bandar Sunway",
                city: "Petaling Jaya",
                area: "Bandar Sunway",
                university: "Sunway University",
                lat: 3.0728,
                lng: 101.6070
            },
            propertyType: "studio",
            amenities: ["WiFi", "Furnished", "Kitchen", "Laundry", "Gym Access", "Air Conditioning"],
            images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"],
            bedrooms: 0,
            bathrooms: 1,
            maxOccupants: 1,
            availableFrom: new Date("2026-06-01"),
            availableUntil: new Date("2027-05-31"),
            isActive: true,
            isFeatured: true,
            whatsappNumber: "+60123456789",
            agentName: "Sarah Ahmad"
        },
        {
            title: "Shared Apartment Near Taylor's Lakeside",
            description: "Spacious 3-bedroom apartment shared with other students. Large common area, fully equipped kitchen, and in-unit laundry. Walking distance to Taylor's University.",
            price: 900,
            pricePeriod: "month",
            location: {
                address: "Jalan Taylor's, Lakeside Campus",
                city: "Subang Jaya",
                area: "Lakeside Campus",
                university: "Taylor's University",
                lat: 3.0640,
                lng: 101.6180
            },
            propertyType: "shared_room",
            amenities: ["WiFi", "Furnished", "Kitchen", "Laundry", "Parking", "Study Room", "Swimming Pool"],
            images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"],
            bedrooms: 3,
            bathrooms: 2,
            maxOccupants: 3,
            availableFrom: new Date("2026-07-01"),
            availableUntil: new Date("2027-06-30"),
            isActive: true,
            isFeatured: false,
            whatsappNumber: "+60123456789",
            agentName: "Muhammad Chen"
        },
        {
            title: "Private Room Near APU Bukit Jalil",
            description: "Private bedroom in a quiet student house. Shared bathroom and kitchen with 2 other students. 10 minutes to Asia Pacific University. Perfect for focused studying.",
            price: 650,
            pricePeriod: "month",
            location: {
                address: "Jalan Jalil Perkasa 13, Bukit Jalil",
                city: "Kuala Lumpur",
                area: "Bukit Jalil",
                university: "Asia Pacific University (APU)",
                lat: 3.0550,
                lng: 101.6300
            },
            propertyType: "private_room",
            amenities: ["WiFi", "Desk", "Wardrobe", "Shared Kitchen", "24/7 Security"],
            images: ["https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800"],
            bedrooms: 1,
            bathrooms: 1,
            maxOccupants: 1,
            availableFrom: new Date("2026-08-01"),
            availableUntil: new Date("2027-07-31"),
            isActive: true,
            isFeatured: true,
            whatsappNumber: "+60123456789",
            agentName: "Emma Abdullah"
        },
        {
            title: "Luxury 2BR Near Monash University",
            description: "Premium 2-bedroom apartment with modern furnishings, balcony, and building amenities including pool and fitness center. Walking distance to Monash and Sunway campuses.",
            price: 2500,
            pricePeriod: "month",
            location: {
                address: "Jalan Lagoon Selatan, Bandar Sunway",
                city: "Petaling Jaya",
                area: "Bandar Sunway",
                university: "Monash University Malaysia",
                lat: 3.0720,
                lng: 101.6060
            },
            propertyType: "apartment",
            amenities: ["WiFi", "Furnished", "Kitchen", "Laundry", "Pool", "Gym", "Parking", "Balcony", "Air Conditioning"],
            images: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800"],
            bedrooms: 2,
            bathrooms: 2,
            maxOccupants: 2,
            availableFrom: new Date("2026-06-15"),
            availableUntil: new Date("2027-05-15"),
            isActive: true,
            isFeatured: false,
            whatsappNumber: "+60123456789",
            agentName: "James Wilson"
        },
        {
            title: "Cozy Student House Near UCSI",
            description: "Traditional student house with 4 bedrooms, large common area, and communal study space. Great for group of friends. Walking distance to UCSI University Cheras.",
            price: 550,
            pricePeriod: "month",
            location: {
                address: "Jalan Menara Gading, Taman Connaught",
                city: "Kuala Lumpur",
                area: "Cheras",
                university: "UCSI University",
                lat: 3.0800,
                lng: 101.6200
            },
            propertyType: "house",
            amenities: ["WiFi", "Furnished", "Kitchen", "Laundry", "Study Room", "BBQ Area"],
            images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800"],
            bedrooms: 4,
            bathrooms: 2,
            maxOccupants: 4,
            availableFrom: new Date("2026-09-01"),
            availableUntil: new Date("2027-08-31"),
            isActive: true,
            isFeatured: false,
            whatsappNumber: "+60123456789",
            agentName: "Lisa Wong"
        }
    ];

    await Listing.insertMany(listings);
    console.log(`✅ Seeded ${listings.length} listings`);

    // Create default admin if not exists
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    if (!existingAdmin) {
        await Admin.create({
            username: 'admin',
            password: 'admin123',
            role: 'admin'
        });
        console.log('✅ Created default admin (username: admin, password: admin123)');
    }

    console.log('\n🎉 Seeding complete!');
    console.log('\nDefault login:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('\n⚠️  IMPORTANT: Change default credentials in production!');

    process.exit(0);
}

seed().catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
});
