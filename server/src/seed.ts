import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import argon2 from 'argon2';
import { config } from './config';
import { User } from './models';

/**
 * Seed script to create initial admin and sample employees
 */
async function seed(): Promise<void> {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');

    const password = await argon2.hash('BrainiaxAgents', {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Create admin
    await User.create({
      name: 'Brainiax Admin',
      email: 'Admin@Brainiax.com',
      password,
      role: 'admin',
      department: 'Management',
    });
    console.log('✅ Created admin: Admin@Brainiax.com / BrainiaxAgents');

    console.log('\n🎉 Seeding complete! Add employees via the Admin panel.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
