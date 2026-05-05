import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('No MONGO_URI in env'); process.exit(1); }

await mongoose.connect(MONGO_URI);
const db = mongoose.connection.db;

const existing = await db.collection('organizations').findOne({ orgCode: 'DEMO01' });
if (existing) {
    console.log('Demo admin already exists — no changes made.');
} else {
    const hashed = await bcrypt.hash('Demo@1234', 10);
    await db.collection('organizations').insertOne({
        name:          'Demo College',
        type:          'college',
        country:       'India',
        orgCode:       'DEMO01',
        adminUsername: 'demoadmin',
        adminPassword: hashed,
        contactEmail:  'admin@democollege.com',
        plan:          'premium',
        isActive:      true,
        maxUsers:      500,
        departments:   ['Computer Science', 'Electronics', 'Mechanical'],
        batches: [
            { name: '2024', targetScore: 70,  targetDate: '2024-12-31' },
            { name: '2025', targetScore: 75,  targetDate: '2025-12-31' },
        ],
        digestConfig: { enabled: false, emails: [], dayOfWeek: 1, hour: 8 },
        description:  '',
        createdAt:    new Date(),
        updatedAt:    new Date(),
    });
    console.log('✅ Demo admin created!');
}

console.log('');
console.log('  Org Code:       DEMO01');
console.log('  Admin Username: demoadmin');
console.log('  Password:       Demo@1234');
console.log('');

await mongoose.disconnect();
