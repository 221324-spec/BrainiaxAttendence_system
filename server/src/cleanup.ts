import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { config } from './config';
import { Attendance, User } from './models';

async function cleanup(): Promise<void> {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to MongoDB');

  const activeIds = await User.find({ role: 'employee', isActive: true }).distinct('_id');
  console.log('Active employee IDs:', activeIds.length);

  const result = await Attendance.deleteMany({ userId: { $nin: activeIds } });
  console.log('Deleted orphaned attendance records:', result.deletedCount);

  process.exit(0);
}

cleanup().catch((err) => {
  console.error(err);
  process.exit(1);
});
