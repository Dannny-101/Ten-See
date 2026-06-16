/**
 * Seed script: populate PropertyAgent collection.
 * Usage: node backend/seedPropertyAgents.js
 *
 * Replace the entries below with your real property IDs and agent details.
 * Get property IDs from: db.properties.find({}, {_id:1, name:1})
 */
require('dotenv').config();
const mongoose = require('mongoose');
const PropertyAgent = require('./models/PropertyAgent');

const agents = [
    // {
    //   propertyId: '64abc123...', // ObjectId from your Property collection
    //   agentName: 'Danny',
    //   agentPhone: '601XXXXXXXX', // E.164 format, no + prefix
    //   agentEmail: 'danny@tenandsee.homes',
    //   priority: 1
    // },
];

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    if (!agents.length) {
        console.log('No agents defined — add entries to the agents array first.');
        process.exit(0);
    }

    await PropertyAgent.deleteMany({});
    const result = await PropertyAgent.insertMany(agents);
    console.log(`Seeded ${result.length} property agent(s).`);
    process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
