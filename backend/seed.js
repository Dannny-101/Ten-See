const mongoose = require('mongoose');
const Listing = require('./models/Listing');
const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tenandsee');

    // Clear existing data
    await Listing.deleteMany({});

    // Create sample listings
    const listings = [
        {
            title: "Modern Studio Near Campus",
            description: "A fully furnished modern studio apartment just 5 minutes walk from the university. Features high-speed WiFi, study desk, and kitchenette.",
            price: 450,
            pricePeriod: "month",
            location: {
                address: "123 University Ave",
                city: "Boston",
                university: "Harvard University",
                lat: 42.3770,
                lng: -71.1167
            },
            propertyType: "studio",
            amenities: ["WiFi", "Furnished", "Kitchen", "Laundry", "Gym Access"],
            images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"],
            bedrooms: 0,
            bathrooms: 1,
            maxOccupants: 1,
            availableFrom: new Date("2026-06-01"),
            availableUntil: new Date("2027-05-31"),
            isActive: true,
            isFeatured: true,
            whatsappNumber: "1234567890",
            agentName: "Sarah Johnson"
        },
        {
            title: "Shared Student Apartment",
            description: "Spacious 3-bedroom apartment shared with other students. Large common area, fully equipped kitchen, and in-unit laundry.",
            price: 320,
            pricePeriod: "month",
            location: {
                address: "456 College St",
                city: "Boston",
                university: "MIT",
                lat: 42.3601,
                lng: -71.0942
            },
            propertyType: "shared_room",
            amenities: ["WiFi", "Furnished", "Kitchen", "Laundry", "Parking", "Study Room"],
            images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"],
            bedrooms: 3,
            bathrooms: 2,
            maxOccupants: 3,
            availableFrom: new Date("2026-07-01"),
            availableUntil: new Date("2027-06-30"),
            isActive: true,
            isFeatured: false,
            whatsappNumber: "1234567890",
            agentName: "Mike Chen"
        },
        {
            title: "Private Room in Student House",
            description: "Private bedroom in a quiet student house. Shared bathroom and kitchen with 2 other students. Perfect for focused studying.",
            price: 280,
            pricePeriod: "month",
            location: {
                address: "789 Scholar Lane",
                city: "Cambridge",
                university: "Harvard University",
                lat: 42.3736,
                lng: -71.1097
            },
            propertyType: "private_room",
            amenities: ["WiFi", "Desk", "Wardrobe", "Shared Kitchen", "Garden Access"],
            images: ["https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800"],
            bedrooms: 1,
            bathrooms: 1,
            maxOccupants: 1,
            availableFrom: new Date("2026-08-01"),
            availableUntil: new Date("2027-07-31"),
            isActive: true,
            isFeatured: true,
            whatsappNumber: "1234567890",
            agentName: "Emma Davis"
        },
        {
            title: "Luxury 2BR Student Apartment",
            description: "Premium 2-bedroom apartment with modern furnishings, balcony, and building amenities including pool and fitness center.",
            price: 650,
            pricePeriod: "month",
            location: {
                address: "321 Elite Blvd",
                city: "Boston",
                university: "Boston University",
                lat: 42.3503,
                lng: -71.0810
            },
            propertyType: "apartment",
            amenities: ["WiFi", "Furnished", "Kitchen", "Laundry", "Pool", "Gym", "Parking", "Balcony"],
            images: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800"],
            bedrooms: 2,
            bathrooms: 2,
            maxOccupants: 2,
            availableFrom: new Date("2026-06-15"),
            availableUntil: new Date("2027-05-15"),
            isActive: true,
            isFeatured: false,
            whatsappNumber: "1234567890",
            agentName: "James Wilson"
        },
        {
            title: "Cozy Student House",
            description: "Traditional student house with 4 bedrooms, large garden, and communal study space. Great for group of friends.",
            price: 250,
            pricePeriod: "month",
            location: {
                address: "555 Campus Rd",
                city: "Cambridge",
                university: "MIT",
                lat: 42.3584,
                lng: -71.0917
            },
            propertyType: "house",
            amenities: ["WiFi", "Furnished", "Kitchen", "Laundry", "Garden", "BBQ Area", "Study Room"],
            images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800"],
            bedrooms: 4,
            bathrooms: 2,
            maxOccupants: 4,
            availableFrom: new Date("2026-09-01"),
            availableUntil: new Date("2027-08-31"),
            isActive: true,
            isFeatured: false,
            whatsappNumber: "1234567890",
            agentName: "Lisa Park"
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
