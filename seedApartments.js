const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

const Apartment = require('./models/Apartment');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('✅ Connected to MongoDB');
    return seedApartments();
})
.then(() => {
    console.log('✅ Seeding complete');
    process.exit(0);
})
.catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});

async function seedApartments() {
    try {
        // Check if apartments already exist
        const existingCount = await Apartment.countDocuments();
        if (existingCount > 0) {
            console.log(`ℹ️  ${existingCount} apartments already exist. Skipping seed.`);
            return;
        }
        
        const apartments = [
            {
                number: '1',
                size: 850,
                bedrooms: 2,
                bathrooms: 1,
                status: 'available'
            },
            {
                number: '2',
                size: 950,
                bedrooms: 2,
                bathrooms: 2,
                status: 'available'
            },
            {
                number: '3',
                size: 1100,
                bedrooms: 3,
                bathrooms: 2,
                status: 'available'
            },
            {
                number: '4',
                size: 750,
                bedrooms: 1,
                bathrooms: 1,
                status: 'available'
            },
            {
                number: '5',
                size: 1200,
                bedrooms: 3,
                bathrooms: 2.5,
                status: 'available'
            },
            {
                number: '6',
                size: 900,
                bedrooms: 2,
                bathrooms: 1.5,
                status: 'available'
            }
        ];
        
        console.log('🌱 Seeding 6 apartments...');
        const result = await Apartment.insertMany(apartments);
        console.log(`✅ Successfully created ${result.length} apartments`);
        
        // Display created apartments
        result.forEach(apt => {
            console.log(`   - Apartment ${apt.number}: ${apt.size} sq ft, ${apt.bedrooms} bed, ${apt.bathrooms} bath`);
        });
        
    } catch (error) {
        console.error('❌ Error seeding apartments:', error);
        throw error;
    }
}


