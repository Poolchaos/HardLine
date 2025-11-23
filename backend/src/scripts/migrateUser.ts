import mongoose from 'mongoose';
import { User } from '../models/User';
import { config } from 'dotenv';

config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hardline';

async function migrateUser() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Update all users to remove old fields
    const result = await User.updateMany(
      {},
      {
        $unset: { income: '', savingsBaseGoal: '' }
      }
    );

    console.log(`✓ Migrated ${result.modifiedCount} user(s)`);
    console.log('✓ Removed income and savingsBaseGoal fields');

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  }
}

migrateUser();
