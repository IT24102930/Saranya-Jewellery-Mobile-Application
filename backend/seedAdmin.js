import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Staff from './models/Staff.js';
import dns from 'node:dns';

dotenv.config();
dns.setServers(["1.1.1.1", "8.8.8.8"]);

async function seedAdmin() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Staff.findOne({ email: 'admin@saranya.com' });
    
    if (existingAdmin) {
      console.log('❌ Admin account already exists');
      process.exit(0);
    }

    // Create admin account
    const admin = new Staff({
      email: 'admin@saranya.com',
      password: 'admin@saranya',
      fullName: 'Admin User',
      role: 'Admin',
      status: 'Approved',
      isActive: true
    });

    await admin.save();
    console.log('✅ Admin account created successfully!');
    console.log('📧 Email: admin@saranya.com');
    console.log('🔑 Password: admin@saranya');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
